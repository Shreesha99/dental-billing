import { NextResponse } from "next/server";
import { getBillMetadata } from "@/lib/firebase";
import { jsPDF } from "jspdf";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const billId = url.searchParams.get("id");
    if (!billId)
      return NextResponse.json({ error: "Bill ID missing" }, { status: 400 });

    const data = await getBillMetadata(billId);
    if (!data.patientName)
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });

    // Generate PDF
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

    // Table header
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
        { align: "right" }
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

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${data.patientName.replaceAll(
          " ",
          "_"
        )}_consultation.pdf`,
      },
    });
  } catch (err) {
    console.error("PDF API error:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
