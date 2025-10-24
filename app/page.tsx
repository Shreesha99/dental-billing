"use client";

import { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import QRCode from "react-qr-code";
import gsap from "gsap";

type Consultation = {
  description: string;
  amount: number | null;
};

export default function Home() {
  const [patientName, setPatientName] = useState("");
  const [consultations, setConsultations] = useState<Consultation[]>([
    { description: "", amount: null },
  ]);
  const [billId, setBillId] = useState("");
  const [loading, setLoading] = useState(false);
  const [billGenerated, setBillGenerated] = useState(false);

  const billRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<SVGSVGElement>(null);

  // Animate loader
  useEffect(() => {
    if (loading && loaderRef.current) {
      gsap.to(loaderRef.current, {
        rotation: 360,
        repeat: -1,
        duration: 1,
        ease: "linear",
        transformOrigin: "50% 50%",
      });
    } else {
      gsap.killTweensOf(loaderRef.current);
    }
  }, [loading]);

  const addConsultation = () =>
    setConsultations([...consultations, { description: "", amount: null }]);

  const updateConsultation = (idx: number, field: string, value: any) => {
    const updated = [...consultations];
    updated[idx] = { ...updated[idx], [field]: value };
    setConsultations(updated);
  };

  const deleteConsultation = (idx: number) => {
    setConsultations(consultations.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setPatientName("");
    setConsultations([{ description: "", amount: null }]);
    setBillId("");
    setBillGenerated(false);
  };

  const generateBill = async () => {
    if (!patientName.trim()) return alert("Enter patient name");

    setLoading(true);
    try {
      const res = await fetch("/api/save-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientName, consultations }),
      });

      const data = await res.json();
      if (!data.id) return alert("Failed to save bill");

      setBillId(data.id);
      setBillGenerated(true);

      if (billRef.current) {
        gsap.fromTo(
          billRef.current,
          { opacity: 0, y: -50 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
        );
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!billId) return;

    const res = await fetch(`/api/fetch-bill?id=${billId}`);
    const data = await res.json();
    if (!data.patientName) return alert("Failed to fetch bill");

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Dental Clinic Bill", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Patient Name: ${data.patientName}`, 14, 35);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 42);

    const startY = 55;
    doc.setFont("helvetica", "bold");
    doc.text("No.", 14, startY);
    doc.text("Description", 30, startY);
    doc.text("Amount (Rs.)", 160, startY, { align: "right" });

    doc.setFont("helvetica", "normal");
    let currentY = startY + 8;
    data.consultations.forEach((c: Consultation, i: number) => {
      doc.text(`${i + 1}`, 14, currentY);
      doc.text(c.description, 30, currentY);
      doc.text(
        `Rs. ${
          c.amount !== null ? Number(c.amount).toLocaleString("en-IN") : "0"
        }`,
        160,
        currentY,
        { align: "right" }
      );
      currentY += 8;
    });

    const total = data.consultations.reduce(
      (sum: number, c: { amount: any }) => sum + Number(c.amount || 0),
      0
    );
    doc.setFont("helvetica", "bold");
    doc.text("Total:", 130, currentY + 10);
    doc.text(`Rs. ${total.toLocaleString("en-IN")}`, 160, currentY + 10, {
      align: "right",
    });

    doc.save(`${data.patientName.replaceAll(" ", "_")}_consultation.pdf`);
  };

  const canGenerateBill =
    consultations.some((c) => c.amount !== null && c.amount > 10) &&
    !billGenerated;

  const canAddConsultation = !billGenerated;

  const totalAmount = consultations.reduce(
    (sum, c) => sum + Number(c.amount || 0),
    0
  );

  return (
    <div className="container py-5" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="card shadow-sm p-4 mx-auto" style={{ maxWidth: "600px" }}>
        <h2 className="text-primary mb-3 text-center">Create New Bill</h2>

        <div className="mb-3">
          <label className="form-label fw-semibold">Patient Name</label>
          <input
            className="form-control"
            placeholder="Enter patient name"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
          />
        </div>

        <h5 className="mt-3 mb-2">Consultations</h5>
        {consultations.map((c, i) => (
          <div className="row mb-2 g-2 align-items-center" key={i}>
            <div className="col">
              <input
                className="form-control"
                placeholder="Description"
                value={c.description}
                onChange={(e) =>
                  updateConsultation(i, "description", e.target.value)
                }
                disabled={!canAddConsultation}
              />
            </div>
            <div className="col">
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Amount"
                  value={c.amount ?? ""}
                  onChange={(e) =>
                    updateConsultation(
                      i,
                      "amount",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  disabled={!canAddConsultation}
                />
              </div>
            </div>
            <div className="col-auto">
              <button
                className="btn btn-danger btn-sm"
                onClick={() => deleteConsultation(i)}
                disabled={i === 0 || !canAddConsultation}
                title={
                  i === 0
                    ? "Cannot delete first consultation"
                    : "Delete consultation"
                }
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        <button
          className="btn btn-outline-secondary mt-2 mb-3 w-100"
          onClick={addConsultation}
          disabled={!canAddConsultation}
        >
          + Add Consultation
        </button>

        <button
          className="btn btn-success w-100 mb-3 d-flex justify-content-center align-items-center"
          onClick={generateBill}
          disabled={!canGenerateBill || loading}
        >
          {loading && (
            <svg
              ref={loaderRef}
              width="20"
              height="20"
              viewBox="0 0 50 50"
              className="me-2"
            >
              <circle
                cx="25"
                cy="25"
                r="20"
                stroke="#fff"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          )}
          Generate Bill
        </button>

        {billId && (
          <div
            ref={billRef}
            className="card border-primary p-3 mt-3 text-center shadow-sm d-flex flex-column align-items-center"
          >
            <h4 className="text-primary mb-3">Bill Generated</h4>

            {/* PDF QR */}
            <QRCode
              value={`${window.location.origin}/bill/${billId}`}
              size={128}
            />
            <p className="mt-2 mb-2">Scan QR to download PDF</p>

            <hr className="w-100" />

            {/* Total */}
            <h5>Total: Rs.{totalAmount.toLocaleString("en-IN")}</h5>

            {/* Payment QR */}
            <QRCode
              value={`upi://pay?pa=shreeshavenkatram99@ybl&pn=Shreesha&tn=Payment+for+bill&am=${totalAmount.toFixed(
                2
              )}&cu=INR`}
              size={128}
            />
            <p className="mt-2 mb-3">Scan QR to pay the above amount</p>

            {/* Buttons */}
            <div className="d-flex gap-2">
              <button className="btn btn-primary" onClick={downloadPDF}>
                Download PDF
              </button>
              <button className="btn btn-outline-primary" onClick={resetForm}>
                New Bill
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
