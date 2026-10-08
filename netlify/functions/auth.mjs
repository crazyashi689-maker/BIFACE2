import { getStore } from "@netlify/blobs";
import { hash, check, makeToken, json } from "../lib.mjs";
export const config = { path: "/api/auth" };

export default async (req) => {
  const { mode, email, password } = await req.json();
  if (!email || !password || password.length < 8)
    return json({ error: "Use an email and a password of 8 or more characters." }, 400);
  const users = getStore("users");
  const key = email.toLowerCase().trim();
  const found = await users.get(key);
  if (mode === "signup") {
    if (found) return json({ error: "That email already has an account." }, 400);
    await users.set(key, hash(password));
  } else if (!found || !check(password, found)) {
    return json({ error: "Wrong email or password." }, 401);
  }
  return json({ token: makeToken(key) });
};
