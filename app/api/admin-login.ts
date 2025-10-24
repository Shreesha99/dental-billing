import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { username, password } = req.body;

  if (
    username === process.env.NEXT_PUBLIC_ADMIN_USERNAME &&
    password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD
  ) {
    return res.status(200).json({ success: true });
  }

  return res
    .status(401)
    .json({ success: false, error: "Invalid username or password" });
}
