import { getStore } from "@netlify/blobs";
export const config = { path: "/l/*" };

export default async (req) => {
  const id = new URL(req.url).pathname.split("/").pop().replace(".json", "");
  const body = await getStore("layers").get(id);
  if (!body) return new Response("{}", { status: 404 });
  return new Response(body, {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=300, s-maxage=3600",
      "access-control-allow-origin": "*",
    },
  });
};
