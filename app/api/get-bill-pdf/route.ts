import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getBillMetadata, getClinicProfile } from "../../../lib/firebase";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // Fetch bill and clinic data (server-safe)
    const bill = await getBillMetadata(id);
    if (!bill)
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    const clinic = await getClinicProfile(bill.dentistId);

    const clinicName = clinic?.clinicName || "Your Dental Clinic";
    const operatingHours =
      clinic?.operatingHours || "Mon–Sat, 9:00 AM – 7:00 PM";
    const logoUrl = clinic?.logoUrl || "";
    const signatureUrl = clinic?.signatureUrl || "";
    const dentistsList = clinic?.dentists?.join(", ") || "";
    const regNo = clinic?.regNo || "Not Provided";
    const gstNo = clinic?.gstNo || "Not Provided";

    const doc = new jsPDF("p", "mm", "a4");

    // ====== HEADER ======
    if (logoUrl) {
      try {
        const res = await fetch(logoUrl);
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve) => {
          const fr = new FileReader();
          fr.onloadend = () => resolve(fr.result as string);
          fr.readAsDataURL(blob);
        });
        doc.addImage(base64, "PNG", 15, 10, 25, 25);
      } catch {
        console.warn("⚠️ Failed to load logo image");
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(clinicName.toUpperCase(), 105, 20, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    if (dentistsList)
      doc.text(`Dentists: ${dentistsList}`, 105, 26, { align: "center" });
    doc.text(`Operating Hours: ${operatingHours}`, 105, 32, {
      align: "center",
    });
    doc.setFontSize(10);
    doc.text(`Reg. No: ${regNo} | GST No: ${gstNo}`, 105, 38, {
      align: "center",
    });
    doc.setDrawColor(100);
    doc.line(15, 42, 195, 42);

    // ====== BILL TITLE ======
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("DENTAL BILL / RECEIPT", 105, 50, { align: "center" });

    // ====== PATIENT INFO ======
    const patientName = bill.patientName || "Unknown";
    const date = bill.createdAt?.seconds
      ? new Date(bill.createdAt.seconds * 1000)
      : new Date();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Patient Name: ${patientName}`, 15, 60);
    doc.text(`Date: ${date.toLocaleDateString("en-IN")}`, 150, 60);

    // ====== TABLE ======
    const inr = "INR";
    const tableData = bill.consultations.map((c: any, i: number) => [
      i + 1,
      c.description || "-",
      `${inr} ${Number(c.amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    ]);

    autoTable(doc, {
      startY: 68,
      head: [["#", "Treatment / Description", "Amount"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [63, 81, 181],
        textColor: 255,
        halign: "center",
        fontSize: 11,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 10,
        lineColor: [220, 220, 220],
        textColor: [30, 30, 30],
        valign: "middle",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { halign: "left", cellWidth: 118 },
        2: { halign: "right", cellWidth: 45 },
      },
      margin: { left: 15, right: 15 },
      styles: { lineWidth: 0.1, cellPadding: 4 },
    });

    const total = bill.consultations.reduce(
      (sum: number, c: any) => sum + Number(c.amount || 0),
      0
    );
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Total Amount:", 100, finalY);
    doc.text(
      `${inr} ${total.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      185,
      finalY,
      { align: "right" }
    );

    // ====== FOOTER ======
    const footerStartY = finalY + 10;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text(`Thank you for choosing ${clinicName}!`, 105, footerStartY, {
      align: "center",
    });
    doc.text(
      "Please revisit every 6 months for routine dental check-up.",
      105,
      footerStartY + 5,
      { align: "center" }
    );

    if (signatureUrl) {
      try {
        const res = await fetch(signatureUrl);
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve) => {
          const fr = new FileReader();
          fr.onloadend = () => resolve(fr.result as string);
          fr.readAsDataURL(blob);
        });
        doc.addImage(base64, "PNG", 140, footerStartY + 10, 40, 20);
      } catch {
        console.warn("⚠️ Failed to load signature");
      }
    }

    doc.setDrawColor(150);
    doc.line(130, footerStartY + 32, 185, footerStartY + 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Authorized Dentist Signature", 157, footerStartY + 38, {
      align: "center",
    });

    doc.setFontSize(9);
    doc.text(
      "This is a computer-generated bill and does not require a physical signature.",
      105,
      285,
      { align: "center" }
    );

    const pdfBytes = doc.output("arraybuffer");
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${patientName.replaceAll(
          " ",
          "_"
        )}_bill.pdf"`,
      },
    });
  } catch (err) {
    console.error("❌ PDF generation error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
