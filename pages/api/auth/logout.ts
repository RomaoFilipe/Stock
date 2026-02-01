import { NextApiRequest, NextApiResponse } from "next";
import Cookies from "cookies";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const isSecure =
    req.headers["x-forwarded-proto"] === "https" ||
    process.env.NODE_ENV !== "development";

  const cookies = new Cookies(req, res, { secure: isSecure });
  cookies.set("session_id", "", {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res.status(204).end();
}
