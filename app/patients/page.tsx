"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db, getCurrentDentistId } from "../../lib/firebase";
import {
  PlusCircle,
  Search,
  ExclamationTriangleFill,
  PencilSquare,
  Trash,
  CheckCircle,
  XCircle,
} from "react-bootstrap-icons";
import toast, { Toaster } from "react-hot-toast";
import "bootstrap/dist/css/bootstrap.min.css";

export default function PatientsPage() {
  const [patients, setPatients] = useState<
    { id: string; name: string; createdAt: string; phone?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", phone: "" });
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ name: string; phone: string }>({
    name: "",
    phone: "",
  });
  const [editError, setEditError] = useState<{ name?: string; phone?: string }>(
    {}
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: any;
    try {
      const dentistId = getCurrentDentistId();
      const patientsRef = collection(db, "dentists", dentistId, "patients");

      unsubscribe = onSnapshot(patientsRef, (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const raw = doc.data() as any;
          let createdAt = "-";
          if (raw.createdAt?.toDate)
            createdAt = raw.createdAt.toDate().toLocaleString();
          else if (raw.createdAt)
            createdAt = new Date(raw.createdAt).toLocaleString();

          return {
            id: doc.id,
            name: raw.name || "(Unnamed)",
            phone: raw.phone || "-",
            createdAt,
          };
        });
        setPatients(data);
        setLoading(false);
      });
    } catch (err) {
      console.error("Error fetching patients:", err);
      setLoading(false);
    }
    return () => unsubscribe && unsubscribe();
  }, []);

  // ✅ Add patient
  const handleAddPatient = async () => {
    setError("");

    const { name, phone } = newPatient;
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    // 🧩 1️⃣ Basic validation
    if (!trimmedName || !trimmedPhone) {
      setError("Please fill all fields before saving.");
      return;
    }

    // 🧩 2️⃣ Validate 10-digit Indian phone number (starts with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      setError("Please enter a valid 10-digit Indian phone number.");
      return;
    }

    const dentistId = getCurrentDentistId();
    const patientsRef = collection(db, "dentists", dentistId, "patients");

    try {
      // 🧩 3️⃣ Check if patient with same name or phone already exists
      const snapshot = await getDocs(patientsRef);

      const duplicate = snapshot.docs.find((doc) => {
        const data = doc.data() as any;
        return (
          data.name.trim().toLowerCase() === trimmedName.toLowerCase() ||
          data.phone === trimmedPhone
        );
      });

      if (duplicate) {
        const data = duplicate.data() as any;
        if (data.phone === trimmedPhone)
          setError("A patient with this phone number already exists.");
        else setError("A patient with this name already exists.");
        return;
      }

      // 🧩 4️⃣ Add new patient
      await addDoc(patientsRef, {
        name: trimmedName,
        phone: trimmedPhone,
        createdAt: serverTimestamp(),
      });

      toast.success("Patient added successfully!");
      setNewPatient({ name: "", phone: "" });
      setShowModal(false);
    } catch (err) {
      console.error("❌ Error adding patient:", err);
      setError("Failed to add patient. Please try again.");
    }
  };

  // ✅ Edit
  const handleEdit = (p: any) => {
    setEditId(p.id);
    setEditData({ name: p.name, phone: p.phone });
    setEditError({});
  };

  const validateEdit = () => {
    const errors: any = {};
    if (!editData.name.trim()) errors.name = "Name cannot be empty.";
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(editData.phone))
      errors.phone = "Invalid 10-digit phone number.";
    setEditError(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = async (id: string) => {
    if (!validateEdit()) return;

    try {
      const dentistId = getCurrentDentistId();
      const ref = doc(db, "dentists", dentistId, "patients", id);
      await updateDoc(ref, {
        name: editData.name.trim(),
        phone: editData.phone.trim(),
      });
      setEditId(null);
      toast.success("Patient updated successfully!");
    } catch (err) {
      console.error("Error updating patient:", err);
      toast.error("Failed to update patient.");
    }
  };

  // ✅ Inline delete confirmation
  const handleConfirmDelete = async (id: string) => {
    try {
      const dentistId = getCurrentDentistId();
      const ref = doc(db, "dentists", dentistId, "patients", id);
      await deleteDoc(ref);
      toast.success("Patient deleted successfully!");
      setConfirmDeleteId(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete patient.");
    }
  };

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="p-3 p-md-5"
      style={{
        maxWidth: "100vw",
        overflowX: "hidden",
      }}
    >
      <Toaster position="top-right" />
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-semibold fs-4">Patients</h2>
        <div className="d-flex align-items-center gap-2">
          <div className="input-group">
            <span className="input-group-text bg-light">
              <Search />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary fw-semibold d-flex align-items-center gap-2 shadow-sm px-3 py-2"
            style={{
              borderRadius: "20px",
              whiteSpace: "nowrap",
            }}
            onClick={() => {
              setNewPatient({ name: "", phone: "" });
              setError("");
              setShowModal(true);
            }}
          >
            <PlusCircle size={18} />
            <span className="d-none d-sm-inline">Add Patient</span>
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-muted">Loading patients...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted py-5">No patients found</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: "5%" }}>#</th>
                <th>Patient Name</th>
                <th>Phone</th>
                <th>Created At</th>
                <th style={{ width: "20%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>

                  {/* Name */}
                  <td>
                    {editId === p.id ? (
                      <>
                        <input
                          type="text"
                          className={`form-control form-control-sm ${
                            editError.name ? "is-invalid" : ""
                          }`}
                          value={editData.name}
                          onChange={(e) =>
                            setEditData({ ...editData, name: e.target.value })
                          }
                        />
                        {editError.name && (
                          <div className="invalid-feedback small">
                            {editError.name}
                          </div>
                        )}
                      </>
                    ) : (
                      p.name
                    )}
                  </td>

                  {/* Phone */}
                  <td>
                    {editId === p.id ? (
                      <>
                        <input
                          type="tel"
                          className={`form-control form-control-sm ${
                            editError.phone ? "is-invalid" : ""
                          }`}
                          value={editData.phone}
                          onChange={(e) =>
                            setEditData({ ...editData, phone: e.target.value })
                          }
                        />
                        {editError.phone && (
                          <div className="invalid-feedback small">
                            {editError.phone}
                          </div>
                        )}
                      </>
                    ) : (
                      p.phone
                    )}
                  </td>

                  {/* Date */}
                  <td>{p.createdAt}</td>

                  {/* Actions */}
                  <td className="text-center">
                    {confirmDeleteId === p.id ? (
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          className="btn btn-danger btn-sm px-3 fw-semibold"
                          onClick={() => handleConfirmDelete(p.id)}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn btn-secondary btn-sm px-3 fw-semibold"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : editId === p.id ? (
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          className="btn btn-success btn-sm rounded-circle shadow-sm d-flex align-items-center justify-content-center"
                          style={{ width: "32px", height: "32px" }}
                          onClick={() => handleSaveEdit(p.id)}
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          className="btn btn-outline-secondary btn-sm rounded-circle shadow-sm d-flex align-items-center justify-content-center"
                          style={{ width: "32px", height: "32px" }}
                          onClick={() => setEditId(null)}
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          className="btn btn-outline-primary btn-sm rounded-circle shadow-sm d-flex align-items-center justify-content-center"
                          style={{
                            width: "36px",
                            height: "36px",
                            transition: "all 0.2s ease",
                          }}
                          onClick={() => handleEdit(p)}
                        >
                          <PencilSquare size={16} />
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm rounded-circle shadow-sm d-flex align-items-center justify-content-center"
                          style={{
                            width: "36px",
                            height: "36px",
                            transition: "all 0.2s ease",
                          }}
                          onClick={() => setConfirmDeleteId(p.id)}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Patient Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ background: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content p-3 border-0 shadow-lg"
              style={{ borderRadius: "16px" }}
            >
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-semibold">Add New Patient</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                {error && (
                  <div
                    className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3"
                    style={{ borderRadius: "10px" }}
                  >
                    <ExclamationTriangleFill className="me-2" size={18} />
                    <div className="small">{error}</div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label fw-semibold">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newPatient.name}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, name: e.target.value })
                    }
                    placeholder="Enter patient's full name"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={newPatient.phone}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, phone: e.target.value })
                    }
                    placeholder="Enter 10-digit phone number"
                  />
                </div>
              </div>

              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary fw-semibold"
                  onClick={handleAddPatient}
                >
                  Save Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
