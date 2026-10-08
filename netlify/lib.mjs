import { createHmac, scryptSync, randomBytes } from "node:crypto";
const secret = () => process.env.SECRET || "dev-secret-change-me";
export const hash = (pw, salt = randomBytes(8).toString("hex")) => salt + ":" + scryptSync(pw, salt, 32).toString("hex");
export const check = (pw, stored) => hash(pw, stored.split(":")[0]) === stored;
const sign = (s) => createHmac("sha256", secret()).update(s).digest("hex");
export const makeToken = (email) => {
  const p = Buffer.from(JSON.stringify({ email, exp: Date.now() + 7 * 864e5 })).toString("base64url");
  return p + "." + sign(p);
};
export const readToken = (req) => {
  const [p, s] = (req.headers.get("authorization") || "").replace("Bearer ", "").split(".");
  if (!p || !s || sign(p) !== s) return null;
  const d = JSON.parse(Buffer.from(p, "base64url"));
  return d.exp > Date.now() ? d.email : null;
};
export const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
