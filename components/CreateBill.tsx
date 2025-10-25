"use client";

import { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import QRCode from "react-qr-code";
import gsap from "gsap";
import toast, { Toaster } from "react-hot-toast";
import {
  addPatient,
  getBillsByPatientId,
  getPatientsWithId,
  saveBillWithPatientId,
} from "../lib/firebase";

type Patient = { id: string; name: string };
type Consultation = { description: string; amount: number | null };

export default function CreateBill() {
  const [patientType, setPatientType] = useState<"new" | "existing">("new");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientName, setPatientName] = useState("");
  const [consultations, setConsultations] = useState<Consultation[]>([
    { description: "", amount: null },
  ]);
  const [billId, setBillId] = useState("");
  const [billGenerated, setBillGenerated] = useState(false);
  const [showPreviousBills, setShowPreviousBills] = useState(false);
  const [previousBills, setPreviousBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loaderRef = useRef<SVGSVGElement>(null);
  const billRef = useRef<HTMLDivElement>(null);

  // GSAP loader animation
  useEffect(() => {
    if (loading && loaderRef.current) {
      gsap.to(loaderRef.current, {
        rotation: 360,
        repeat: -1,
        duration: 1,
        ease: "linear",
        transformOrigin: "50% 50%",
      });
    } else gsap.killTweensOf(loaderRef.current);
  }, [loading]);

  // Fetch patients
  useEffect(() => {
    const fetchPatients = async () => {
      const data = await getPatientsWithId();
      setPatients(data);
    };
    fetchPatients();
  }, []);

  // Helper functions
  const addConsultation = () =>
    setConsultations([...consultations, { description: "", amount: null }]);
  const updateConsultation = (idx: number, field: string, value: any) => {
    const updated = [...consultations];
    updated[idx] = { ...updated[idx], [field]: value };
    setConsultations(updated);
  };
  const deleteConsultation = (idx: number) =>
    setConsultations(consultations.filter((_, i) => i !== idx));
  const resetForm = () => {
    setPatientName("");
    setSelectedPatient(null);
    setConsultations([{ description: "", amount: null }]);
    setBillId("");
    setBillGenerated(false);
    setShowPreviousBills(false);
    setPreviousBills([]);
  };

  const handlePatientSelect = async (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId) || null;
    setSelectedPatient(patient);
    setPatientName(patient?.name || "");

    if (patient) {
      const bills = await getBillsByPatientId(patient.id);
      setPreviousBills(bills);
      setShowPreviousBills(true);
    } else {
      setPreviousBills([]);
      setShowPreviousBills(false);
      setConsultations([{ description: "", amount: null }]);
    }
  };

  const generateBill = async () => {
    if (!patientName.trim()) return toast.error("Enter patient name");
    setLoading(true);

    try {
      let patientId = selectedPatient?.id || "";
      if (patientType === "new") {
        patientId = await addPatient(patientName);
        toast.success("Patient added successfully!");
      }

      const newBillId = await saveBillWithPatientId(
        patientId,
        patientName,
        consultations
      );
      setBillId(newBillId);
      setBillGenerated(true);
      toast.success("Bill generated successfully!");

      if (billRef.current) {
        gsap.fromTo(
          billRef.current,
          { opacity: 0, y: -50 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Dental Clinic Bill", 105, 20, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Patient Name: ${patientName}`, 14, 35);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 42);

    const startY = 55;
    doc.setFont("helvetica", "bold");
    doc.text("No.", 14, startY);
    doc.text("Description", 30, startY);
    doc.text("Amount (Rs.)", 160, startY, { align: "right" });

    let currentY = startY + 8;
    consultations.forEach((c, i) => {
      doc.setFont("helvetica", "normal");
      doc.text(`${i + 1}`, 14, currentY);
      doc.text(c.description, 30, currentY);
      doc.text(
        `Rs. ${c.amount !== null ? c.amount.toLocaleString("en-IN") : "0"}`,
        160,
        currentY,
        { align: "right" }
      );
      currentY += 8;
    });

    const total = consultations.reduce(
      (sum, c) => sum + Number(c.amount || 0),
      0
    );
    doc.setFont("helvetica", "bold");
    doc.text("Total:", 130, currentY + 10);
    doc.text(`Rs. ${total.toLocaleString("en-IN")}`, 160, currentY + 10, {
      align: "right",
    });

    doc.save(`${patientName.replaceAll(" ", "_")}_consultation.pdf`);
    toast.success("PDF downloaded!");
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
      <Toaster position="top-right" reverseOrder={false} />
      <div className="card shadow-sm p-4 mx-auto" style={{ maxWidth: "700px" }}>
        <h2 className="text-primary mb-3 text-center">Create New Bill</h2>

        {/* Patient Type */}
        <div className="mb-3">
          <label className="form-label fw-semibold">Patient Type</label>
          <div className="d-flex gap-3">
            <div className="form-check">
              <input
                type="radio"
                className="form-check-input"
                name="patientType"
                value="new"
                checked={patientType === "new"}
                onChange={() => {
                  setPatientType("new");
                  resetForm();
                }}
              />
              <label className="form-check-label">New Patient</label>
            </div>
            <div className="form-check">
              <input
                type="radio"
                className="form-check-input"
                name="patientType"
                value="existing"
                checked={patientType === "existing"}
                onChange={() => {
                  setPatientType("existing");
                  resetForm();
                }}
              />
              <label className="form-check-label">Existing Patient</label>
            </div>
          </div>
        </div>

        {/* Patient Selection */}
        {patientType === "existing" ? (
          <div className="mb-3">
            <label className="form-label fw-semibold">Select Patient</label>
            <select
              className="form-select"
              value={selectedPatient?.id || ""}
              onChange={(e) => handlePatientSelect(e.target.value)}
            >
              <option value="">-- Select Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mb-3">
            <label className="form-label fw-semibold">Patient Name</label>
            <input
              className="form-control"
              placeholder="Enter patient name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
          </div>
        )}

        {/* Previous Bills Table */}
        {showPreviousBills && selectedPatient && (
          <div className="mb-3">
            <h5>Previous Bills for {selectedPatient.name}</h5>
            <div className="table-responsive">
              <table className="table table-bordered table-striped">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Total Amount (₹)</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {previousBills.length > 0 ? (
                    previousBills.map((bill, idx) => {
                      const total = bill.consultations.reduce(
                        (sum: number, c: any) => sum + Number(c.amount || 0),
                        0
                      );
                      const date = bill.createdAt?.seconds
                        ? new Date(
                            bill.createdAt.seconds * 1000
                          ).toLocaleDateString()
                        : new Date(bill.createdAt).toLocaleDateString();
                      return (
                        <tr key={bill.id}>
                          <td>{idx + 1}</td>
                          <td>{date}</td>
                          <td>₹{total.toLocaleString("en-IN")}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={downloadPDF}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center">
                        No previous bills found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Consultations */}
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

        {/* Generate Bill */}
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

        {/* Bill Preview */}
        {billId && (
          <div
            ref={billRef}
            className="card border-primary p-3 mt-3 text-center shadow-sm d-flex flex-column align-items-center"
          >
            <h4 className="text-primary mb-3">Bill Generated</h4>
            <QRCode
              value={`${window.location.origin}/api/get-bill-pdf?id=${billId}`}
              size={128}
            />
            <p className="mt-2 mb-2">Scan QR to download PDF</p>

            <hr className="w-100" />
            <h5>Total: ₹{totalAmount.toLocaleString("en-IN")}</h5>

            <QRCode
              value={`upi://pay?pa=shreeshavenkatram99@ybl&pn=Shreesha&tn=Payment+for+bill&am=${totalAmount.toFixed(
                2
              )}&cu=INR`}
              size={128}
            />
            <p className="mt-2 mb-3">Scan QR to pay the above amount</p>

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
