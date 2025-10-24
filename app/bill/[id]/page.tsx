import { jsPDF } from "jspdf";
import { getBillMetadata } from "../../../lib/firebase";

export const dynamic = "force-dynamic";

export default async function BillPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // Fetch bill metadata
  const bill = await getBillMetadata(id);
  const total = bill.consultations.reduce(
    (sum: number, c: any) => sum + Number(c.amount),
    0
  );

  // Generate PDF
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Dental Clinic Bill", 14, 20);
  doc.setFontSize(12);
  doc.text(`Patient Name: ${bill.patientName}`, 14, 30);

  let startY = 40;
  bill.consultations.forEach((c: any, i: number) => {
    doc.text(`${i + 1}. ${c.description} - ₹${c.amount}`, 14, startY);
    startY += 10;
  });
  doc.text(`Total: ₹${total}`, 14, startY + 10);

  const pdfBase64 = doc.output("datauristring");

  return (
    <html>
      <body className="p-5 text-center">
        <h2>Download Your Bill</h2>
        <a className="btn btn-primary mt-3" href={pdfBase64} download={`bill_${id}.pdf`}>
          Download PDF
        </a>
      </body>
    </html>
  );
}
