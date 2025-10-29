"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db, getCurrentDentistId } from "../../lib/firebase";
import {
  PlusCircle,
  Search,
  ExclamationTriangleFill,
} from "react-bootstrap-icons";
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

  const handleAddPatient = async () => {
    setError("");

    const { name, phone } = newPatient;
    if (!name.trim() || !phone.trim()) {
      setError("Please fill all fields before saving.");
      return;
    }

    // Phone validation — India-style (10 digits)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    const dentistId = getCurrentDentistId();

    // Check if patient with same name exists
    const patientsRef = collection(db, "dentists", dentistId, "patients");
    const q = query(patientsRef, where("name", "==", name.trim()));
    const existing = await getDocs(q);

    if (!existing.empty) {
      setError("A patient with this exact name already exists.");
      return;
    }

    try {
      await addDoc(patientsRef, {
        name: name.trim(),
        phone: phone.trim(),
        createdAt: serverTimestamp(),
      });
      setNewPatient({ name: "", phone: "" });
      setShowModal(false);
    } catch (err) {
      console.error("Error adding patient:", err);
      setError("Failed to add patient. Please try again.");
    }
  };

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
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
            className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: "40px", height: "40px" }}
            onClick={() => {
              setNewPatient({ name: "", phone: "" });
              setError("");
              setShowModal(true);
            }}
          >
            <PlusCircle size={20} />
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{p.name}</td>
                  <td>{p.phone}</td>
                  <td>{p.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{
            background: "rgba(0, 0, 0, 0.5)",
          }}
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
                {/* Error Alert — same style as signup */}
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
