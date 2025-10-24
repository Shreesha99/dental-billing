import type { NextApiRequest, NextApiResponse } from "next";
import { uploadPDF } from "../../lib/firebase";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb", // adjust PDF size limit
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
      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      const url = await uploadPDF(new Blob([pdfBuffer]), fileName);
      res.status(200).json({ url });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
