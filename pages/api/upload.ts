import type { NextApiRequest, NextApiResponse } from "next";
// import { uploadPDFServer } from "../../lib/firebase";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const { pdfBase64, fileName } = req.body;
      const pdfBuffer = Buffer.from(pdfBase64, "base64"); // Node Buffer
      const url = "test";
      res.status(200).json({ url });
    } catch (err) {
      console.error("Upload API error:", err);
      res.status(500).json({ error: "Upload failed", details: err });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
