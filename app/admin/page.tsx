"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFirestore, collectionGroup, getDocs } from "firebase/firestore";
import { firebaseApp } from "@/lib/firebase";

type Consultation = {
  description: string;
  amount: number | null;
};

type Bill = {
  id: string;
  patientName: string;
  consultations: Consultation[];
  createdAt: { seconds: number; nanoseconds?: number };
  dentistId?: string;
};

export default function AdminDashboard() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const db = getFirestore(firebaseApp);

  // Redirect non-admins
  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin");
    if (!isAdmin) {
      router.push("/admin/login");
    }
  }, [router]);

  useEffect(() => {
    async function fetchBills() {
      setLoading(true);
      try {
        // 🧾 Fetch all bills across all dentists
        const billsSnapshot = await getDocs(collectionGroup(db, "bills"));
        const fetchedBills = billsSnapshot.docs.map((doc) => {
          const data = doc.data() as Omit<Bill, "id">;

          return {
            ...data,
            id: doc.id, // ✅ Always use Firestore doc ID, not inner data.id
            dentistId: doc.ref.parent.parent?.id || "unknown",
          };
        });

        // Sort newest first
        fetchedBills.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );

        setBills(fetchedBills);
      } catch (err) {
        console.error("Error fetching bills:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchBills();
  }, [db]);

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    router.push("/admin/login");
  };

  return (
    <div
      className="container py-5"
      style={{ fontFamily: "Inter, sans-serif", maxWidth: "1000px" }}
    >
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-primary fw-bold mb-0">Patient History Dashboard</h2>
        <button
          className="btn btn-danger fw-bold"
          onClick={handleLogout}
          style={{ minWidth: "120px" }}
        >
          Logout
        </button>
      </div>

      {/* Reminder */}
      <div
        className="alert alert-warning text-center fw-bold"
        role="alert"
        style={{
          fontSize: "1.1rem",
          border: "2px solid #ffb700",
          background: "#fff8e1",
        }}
      >
        ⚠️ Please remember to <strong>LOG OUT</strong> before closing this
        system to protect patient data!
      </div>

      {/* Bills Table */}
      {loading ? (
        <p>Loading bills...</p>
      ) : bills.length === 0 ? (
        <p>No bills found</p>
      ) : (
        <div className="table-responsive mt-4">
          <table className="table table-striped table-bordered align-middle shadow-sm">
            <thead className="table-primary">
              <tr>
                <th>#</th>
                <th>Patient Name</th>
                <th>Dentist ID</th>
                <th>Date</th>
                <th>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b, i) => {
                const total = b.consultations?.reduce(
                  (sum, c) => sum + Number(c.amount || 0),
                  0
                );
                return (
                  <tr key={`${b.dentistId}-${b.id}`}>
                    <td>{i + 1}</td>
                    <td>{b.patientName}</td>
                    <td className="text-muted small">{b.dentistId}</td>
                    <td>
                      {new Date(
                        (b.createdAt?.seconds || 0) * 1000
                      ).toLocaleDateString("en-IN")}
                    </td>
                    <td>₹{total.toLocaleString("en-IN")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
