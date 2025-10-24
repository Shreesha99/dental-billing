import type { NextApiRequest, NextApiResponse } from "next";
import { getBillMetadata } from "@/lib/firebase";
import { jsPDF } from "jspdf";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const billId = req.query.id as string;
  if (!billId) return res.status(400).json({ error: "Bill ID missing" });

  try {
    const data = await getBillMetadata(billId);
    if (!data.patientName)
      return res.status(404).json({ error: "Bill not found" });

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Dental Clinic Bill", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Patient Name: ${data.patientName}`, 14, 35);
    doc.text(
      `Date: ${new Date(
        data.createdAt?.seconds * 1000 || Date.now()
      ).toLocaleDateString()}`,
      14,
      42
    );

    const startY = 55;
    doc.setFont("helvetica", "bold");
    doc.text("No.", 14, startY);
    doc.text("Description", 30, startY);
    doc.text("Amount (Rs.)", 160, startY, { align: "right" });

    doc.setFont("helvetica", "normal");
    let currentY = startY + 8;
    data.consultations.forEach((c: any, i: number) => {
      doc.text(`${i + 1}`, 14, currentY);
      doc.text(c.description, 30, currentY);
      doc.text(
        `Rs. ${Number(c.amount).toLocaleString("en-IN")}`,
        160,
        currentY,
        {
          align: "right",
        }
      );
      currentY += 8;
    });

    const total = data.consultations.reduce(
      (sum: number, c: any) => sum + Number(c.amount),
      0
    );
    doc.setFont("helvetica", "bold");
    doc.text("Total:", 130, currentY + 10);
    doc.text(`Rs. ${total.toLocaleString("en-IN")}`, 160, currentY + 10, {
      align: "right",
    });

    const pdfBytes = doc.output("arraybuffer");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${data.patientName.replaceAll(
        " ",
        "_"
      )}_consultation.pdf`
    );
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("PDF API error:", err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
}
