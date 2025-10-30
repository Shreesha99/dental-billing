"use client";

import { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import QRCode from "react-qr-code";
import gsap from "gsap";
import autoTable from "jspdf-autotable";
import { atob } from "js-base64";
import toast, { Toaster } from "react-hot-toast";
import {
  addPatient,
  auth,
  db,
  getBillsByPatient,
  getClinicProfile,
  getPatientsWithId,
  saveBillWithDentist,
  saveBillWithPatientId,
  updateBillStatus,
} from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import { FiPlusSquare } from "react-icons/fi";
const fontUrl =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansdevanagari/NotoSansDevanagari-Regular.ttf";

type Patient = { id: string; name: string; phone?: string };
type Consultation = { description: string; amount: number | null };

export default function CreateBill() {
  const [patientType, setPatientType] = useState<"new" | "existing">("new");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientName, setPatientName] = useState("");
  const [consultations, setConsultations] = useState<Consultation[]>([
    { description: "", amount: null },
  ]);
  const [billPaid, setBillPaid] = useState(false);
  const [billId, setBillId] = useState("");
  const [billGenerated, setBillGenerated] = useState(false);
  const [showPreviousBills, setShowPreviousBills] = useState(false);
  const [previousBills, setPreviousBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [patientError, setPatientError] = useState({ name: "", phone: "" });

  const loaderRef = useRef<SVGSVGElement>(null);
  const billRef = useRef<HTMLDivElement>(null);

  // 🔄 GSAP loader animation
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

  // 👩‍⚕️ Fetch patients list
  useEffect(() => {
    const fetchPatients = async () => {
      const data = await getPatientsWithId();
      setPatients(data);
    };
    fetchPatients();
  }, []);

  // 🧾 Helpers
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
    setBillPaid(false);
    setPhone("");
    setBillGenerated(false);
    setShowPreviousBills(false);
    setPreviousBills([]);
  };

  useEffect(() => {
    if (patientType === "new" && (patientName.trim() || phone.trim())) {
      const sameName = patients.find(
        (p) => p.name.trim().toLowerCase() === patientName.trim().toLowerCase()
      );

      const samePhone = patients.find(
        (p) => p.phone && phone && p.phone.trim() === phone.trim()
      );

      let phoneError = "";
      if (samePhone) {
        phoneError = "Phone number already belongs to an existing patient.";
      } else if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.trim())) {
        phoneError = "Enter a valid 10-digit Indian phone number.";
      }

      setPatientError({
        name: sameName
          ? "Patient already exists. Please select 'Existing'."
          : "",
        phone: phoneError,
      });
    } else {
      setPatientError({ name: "", phone: "" });
    }
  }, [patientName, phone, patients, patientType]);

  // 🧍‍♀️ Handle patient selection
  const handlePatientSelect = async (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId) || null;
    setSelectedPatient(patient);
    setPatientName(patient?.name || "");

    if (patient) {
      const bills = await getBillsByPatient(patient.name);
      setPreviousBills(bills);
      setShowPreviousBills(true);
    } else {
      setPreviousBills([]);
      setShowPreviousBills(false);
      setConsultations([{ description: "", amount: null }]);
    }
  };

  // 🔍 Get dentist ID safely (from auth or localStorage)
  async function getDentistId(): Promise<string> {
    if (typeof window === "undefined")
      throw new Error("getDentistId called on server");

    // 1️⃣ Try Firebase Auth
    const authDentistId = auth.currentUser?.uid;
    if (authDentistId) {
      localStorage.setItem("dentistId", authDentistId);
      return authDentistId;
    }

    // 2️⃣ Try localStorage
    const storedId = localStorage.getItem("dentistId");
    if (storedId) return storedId;

    // 3️⃣ Try Firestore fallback (optional, if you store dentist info somewhere)
    const dentistsSnap = await getDocs(collection(db, "dentists"));
    if (!dentistsSnap.empty) {
      const firstDentist = dentistsSnap.docs[0].id;
      localStorage.setItem("dentistId", firstDentist);
      return firstDentist;
    }

    throw new Error("Dentist not found in auth, localStorage, or Firestore");
  }

  // 🧾 Generate Bill
  const generateBill = async () => {
    if (!patientName.trim()) {
      console.error("❌ [generateBill] Missing patient name");
      return toast.error("Enter patient name");
    }

    setLoading(true);
    try {
      let patientId = selectedPatient?.id || "";
      const dentistId = await getDentistId();

      if (!dentistId) throw new Error("Dentist ID missing");

      if (patientType === "new") {
        patientId = await addPatient(patientName, phone);
        console.info(
          "✅ [generateBill] New patient created with ID:",
          patientId
        );
        toast.success("Patient added successfully!");
      } else {
        console.info("👤 [generateBill] Existing patient selected:", patientId);
      }

      const newBillId = await saveBillWithDentist(
        dentistId,
        patientId,
        patientName,
        consultations
      );

      console.info("🧾 Bill created successfully:", {
        billId: newBillId,
        patientName,
        dentistId:
          typeof window !== "undefined"
            ? localStorage.getItem("dentistId")
            : "server",
        consultationsCount: consultations.length,
      });

      if (patientError.name) {
        toast.error(patientError.name);
        return;
      }
      if (patientError.phone) {
        toast.error(patientError.phone);
        return;
      }

      setBillId(newBillId);
      setBillGenerated(true);
      toast.success("Bill generated successfully!");

      try {
        const firstTreatment =
          consultations[0]?.description || "your treatment";
        const treatmentText =
          consultations.length > 1
            ? `${firstTreatment} and ${consultations.length - 1} more`
            : firstTreatment;

        const smsBody = `Dear ${patientName}, your dental bill of ₹${totalAmount.toLocaleString(
          "en-IN"
        )} for ${treatmentText} is ready. Download your bill here: ${
          window.location.origin
        }/api/get-bill-pdf?id=${newBillId}`;

        const smsRes = await fetch("/api/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: `+91${phone.trim()}`,
            message: smsBody,
          }),
        });

        const result = await smsRes.json();
        console.info("📩 [generateBill] SMS API Response:", result);

        if (result.success) toast.success("SMS sent to patient!");
        else toast.error(`⚠️ SMS failed: ${result.error || "Unknown error"}`);
      } catch (smsErr) {
        console.error("❌ [generateBill] Failed to send SMS:", smsErr);
        toast.error("Bill saved but SMS not sent.");
      }

      if (billRef.current) {
        gsap.fromTo(
          billRef.current,
          { opacity: 0, y: -50 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
        );
      }
    } catch (err) {
      console.error("💥 [generateBill] FAILED:", err);
      toast.error("Something went wrong while generating the bill");
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async () => {
    if (!billId) return;
    try {
      await updateBillStatus(billId, "paid");
      setBillPaid(true);
      toast.success("Marked as Paid");
    } catch (err) {
      console.error("Error updating bill status:", err);
      toast.error("Failed to update payment status");
    }
  };

  // 📄 Download PDF
  const downloadPDF = async (billData?: any) => {
    setPdfLoading(true);
    try {
      const isFromHistory = !!billData;

      // 🦷 Fetch clinic profile
      const clinic = await getClinicProfile();
      const clinicName = clinic?.clinicName || "Your Dental Clinic";
      const operatingHours =
        clinic?.operatingHours || "Mon–Sat, 9:00 AM – 7:00 PM";
      const logoUrl = clinic?.logoUrl || "";
      const signatureUrl = clinic?.signatureUrl || "";
      const dentistsList = clinic?.dentists?.join(", ") || "";
      const regNo = clinic?.regNo || "Not Provided";
      const gstNo = clinic?.gstNo || "Not Provided";

      const targetConsultations = isFromHistory
        ? billData?.consultations || []
        : consultations || [];

      const targetPatientName = isFromHistory
        ? billData?.patientName || "Unknown Patient"
        : patientName?.trim() || "Unknown Patient";

      const targetDate = isFromHistory
        ? billData?.createdAt?.seconds
          ? new Date(billData.createdAt.seconds * 1000)
          : new Date()
        : new Date();

      if (
        !Array.isArray(targetConsultations) ||
        targetConsultations.length === 0
      ) {
        toast.error(
          "No consultation data to download. Please add treatments first."
        );
        return;
      }

      const doc = new jsPDF("p", "mm", "a4");

      // ====== HEADER ======
      if (logoUrl) {
        try {
          const imgData = await fetch(logoUrl)
            .then((r) => r.blob())
            .then(
              (blob) =>
                new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                })
            );
          doc.addImage(imgData, "PNG", 15, 10, 25, 25);
        } catch {
          console.warn("⚠️ Failed to load clinic logo");
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

      // ✅ Added Reg. No and GST No
      doc.setFontSize(10);
      doc.text(`Reg. No: ${regNo} | GST No: ${gstNo}`, 105, 38, {
        align: "center",
      });

      // Divider
      doc.setDrawColor(100);
      doc.line(15, 42, 195, 42);

      // ====== BILL TITLE ======
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("DENTAL BILL / RECEIPT", 105, 50, { align: "center" });

      // ====== PATIENT INFO ======
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Patient Name: ${targetPatientName}`, 15, 60);
      doc.text(`Date: ${targetDate.toLocaleDateString("en-IN")}`, 150, 60);

      // ====== TABLE ======
      const inr = "INR";
      const tableData = targetConsultations.map((c: any, i: number) => [
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

      // ====== TOTAL ======
      const total = targetConsultations.reduce(
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

      // Signature section
      if (signatureUrl) {
        try {
          const sigData = await fetch(signatureUrl)
            .then((r) => r.blob())
            .then(
              (blob) =>
                new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                })
            );
          doc.addImage(sigData, "PNG", 140, footerStartY + 10, 40, 20);
        } catch {
          console.warn("⚠️ Failed to load signature image");
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

      const safeFileName = `${targetPatientName.replace(
        /\s+/g,
        "_"
      )}_dental_bill.pdf`;
      doc.save(safeFileName);

      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      toast.error("Failed to generate bill PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const canGenerateBill =
    consultations.some((c) => c.amount !== null && c.amount > 10) &&
    !patientError.name &&
    !patientError.phone &&
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

        {/* 🧍‍♂️ Patient Type */}
        <div className="mb-4">
          <label className="form-label fw-semibold d-block mb-2">
            Patient Type
          </label>
          <div
            className="btn-group w-100"
            role="group"
            aria-label="Patient Type"
          >
            <input
              type="radio"
              className="btn-check"
              name="patientType"
              id="new-patient"
              value="new"
              checked={patientType === "new"}
              onChange={() => {
                setPatientType("new");
                resetForm();
              }}
            />
            <label
              className="btn btn-outline-primary fw-semibold d-flex align-items-center justify-content-center gap-2"
              htmlFor="new-patient"
            >
              <FiPlusSquare /> New Patient
            </label>

            <input
              type="radio"
              className="btn-check"
              name="patientType"
              id="existing-patient"
              value="existing"
              checked={patientType === "existing"}
              onChange={() => {
                setPatientType("existing");
                resetForm();
              }}
            />
            <label
              className="btn btn-outline-primary fw-semibold"
              htmlFor="existing-patient"
            >
              Existing Patient
            </label>
          </div>
        </div>

        {/* 🧾 Patient Selection */}
        {patientType === "existing" ? (
          <div className="mb-3">
            <label className="form-label fw-semibold">
              Select Patient{" "}
              {patients.length === 0 && (
                <span className="text-muted small">
                  (no patients available)
                </span>
              )}
            </label>
            <select
              className="form-select"
              value={selectedPatient?.id || ""}
              onChange={(e) => handlePatientSelect(e.target.value)}
              disabled={patients.length === 0}
            >
              <option value="" disabled>
                {patients.length === 0
                  ? "No patients found"
                  : "Select an existing patient"}
              </option>

              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.phone ? `(${p.phone})` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="form-label fw-semibold">Patient Name</label>
              <input
                className={`form-control ${
                  patientError.name ? "is-invalid" : ""
                }`}
                name="patientName"
                placeholder="Enter patient name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
              {patientError.name && (
                <div
                  className="alert alert-danger d-flex align-items-center py-2 px-3 mt-2"
                  style={{ borderRadius: "10px" }}
                >
                  <ExclamationTriangleFill className="me-2" size={16} />
                  <div className="small">{patientError.name}</div>
                </div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Phone Number</label>
              <input
                className={`form-control ${
                  patientError.phone ? "is-invalid" : ""
                }`}
                name="phoneNumber"
                placeholder="Enter 10-digit phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              {patientError.phone && (
                <div
                  className="alert alert-danger d-flex align-items-center py-2 px-3 mt-2"
                  style={{ borderRadius: "10px" }}
                >
                  <ExclamationTriangleFill className="me-2" size={16} />
                  <div className="small">{patientError.phone}</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* 📜 Previous Bills */}
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
                              onClick={() => downloadPDF(bill)}
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

        {/* 💬 Consultations */}
        <h5 className="mt-3 mb-2">Treatments</h5>
        {consultations.map((c, i) => (
          <div className="row mb-2 g-2 align-items-center" key={i}>
            <div className="col">
              <input
                name="treatmentName"
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
                  name="treatmentAmount"
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
          + Add Treatment
        </button>

        {/* ✅ Generate Bill */}
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

        {/* 🧾 Bill Preview */}
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

            <div className="d-flex gap-2 justify-content-center">
              <button className="btn btn-primary" onClick={() => downloadPDF()}>
                Download PDF
              </button>
              <button
                className={`btn ${
                  billPaid ? "btn-success" : "btn-outline-success"
                }`}
                onClick={markAsPaid}
                disabled={billPaid}
              >
                {billPaid ? "✅ Paid" : "Mark as Paid"}
              </button>
              <button className="btn btn-outline-primary" onClick={resetForm}>
                New Bill
              </button>
            </div>
          </div>
        )}
      </div>
      {/* 🌀 PDF Preloader Overlay */}
      {pdfLoading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            className="spinner-border text-primary"
            role="status"
            style={{ width: "3rem", height: "3rem" }}
          >
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="fw-semibold text-primary mt-3">
            Generating your bill...
          </p>
        </div>
      )}
    </div>
  );
}
