"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Consultation = {
  description: string;
  amount: number | null;
};

type Bill = {
  id: string;
  patientName: string;
  consultations: Consultation[];
  createdAt: { seconds: number };
};

export default function AdminDashboard() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        const res = await fetch("/api/get-all-bills");
        if (!res.ok) throw new Error("Failed to fetch bills");
        const data = await res.json();
        setBills(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchBills();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    router.push("/admin/login");
  };

  return (
    <div
      className="container py-5"
      style={{ fontFamily: "Inter, sans-serif", maxWidth: "1000px" }}
    >
      {/* Logout header */}
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

      {/* Logout reminder */}
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

      {/* Bills table */}
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
                <th>Date</th>
                <th>Total (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b, i) => {
                const total = b.consultations.reduce(
                  (sum, c) => sum + Number(c.amount || 0),
                  0
                );
                return (
                  <tr key={b.id}>
                    <td>{i + 1}</td>
                    <td>{b.patientName}</td>
                    <td>
                      {new Date(
                        (b.createdAt?.seconds || 0) * 1000
                      ).toLocaleDateString()}
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
