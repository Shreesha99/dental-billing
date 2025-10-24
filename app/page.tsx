"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import QRCode from "react-qr-code";

type Consultation = {
  description: string;
  amount: number;
};

export default function Home() {
  const [patientName, setPatientName] = useState("");
  const [consultations, setConsultations] = useState<Consultation[]>([
    { description: "", amount: 0 },
  ]);
  const [billGenerated, setBillGenerated] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  const addConsultation = () =>
    setConsultations([...consultations, { description: "", amount: 0 }]);
  const updateConsultation = (idx: number, field: string, value: any) => {
    const updated = [...consultations];
    updated[idx] = { ...updated[idx], [field]: value };
    setConsultations(updated);
  };

  const generateAndUploadBill = async () => {
    if (!patientName.trim()) {
      alert("Enter patient name");
      return;
    }

    // Generate PDF
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Dental Clinic Bill", 14, 20);
    doc.setFontSize(12);
    doc.text(`Patient Name: ${patientName}`, 14, 30);

    let startY = 40;
    consultations.forEach((c, i) => {
      doc.text(`${i + 1}. ${c.description} - ₹${c.amount}`, 14, startY);
      startY += 10;
    });

    const total = consultations.reduce((a, b) => a + Number(b.amount), 0);
    doc.text(`Total: ₹${total}`, 14, startY + 10);

    // Convert PDF to base64
    const pdfBlob = doc.output("blob");
    const reader = new FileReader();
    reader.readAsDataURL(pdfBlob);
    reader.onloadend = async () => {
      const base64data = (reader.result as string).split(",")[1];
      const fileName = `bill_${Date.now()}.pdf`;

      // Upload via API route
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64: base64data, fileName }),
      });

      const data = await response.json();
      setPdfUrl(data.url);
      setBillGenerated(true);
    };
  };

  return (
    <div className="card shadow-sm p-4">
      <h2 className="text-primary mb-3">Create New Bill</h2>

      <div className="mb-3">
        <label className="form-label">Patient Name</label>
        <input
          className="form-control"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
        />
      </div>

      <h5>Consultations</h5>
      {consultations.map((c, i) => (
        <div className="row mb-2" key={i}>
          <div className="col">
            <input
              className="form-control"
              placeholder="Description"
              value={c.description}
              onChange={(e) =>
                updateConsultation(i, "description", e.target.value)
              }
            />
          </div>
          <div className="col">
            <input
              type="number"
              className="form-control"
              placeholder="Amount"
              value={c.amount}
              onChange={(e) =>
                updateConsultation(i, "amount", Number(e.target.value))
              }
            />
          </div>
        </div>
      ))}

      <button className="btn btn-secondary mt-2 mb-3" onClick={addConsultation}>
        + Add Consultation
      </button>

      <button
        className="btn btn-success w-100 mb-4"
        onClick={generateAndUploadBill}
      >
        Generate Bill
      </button>

      {billGenerated && pdfUrl && (
        <div className="card border-primary p-3 mt-3 text-center">
          <h4 className="text-primary">Bill Preview</h4>
          <QRCode value={pdfUrl} size={128} />
          <a className="btn btn-primary mt-2" href={pdfUrl} target="_blank">
            Download PDF
          </a>
        </div>
      )}
    </div>
  );
}
