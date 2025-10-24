"use client";

import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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

export default function AnalyticsDashboard() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBills() {
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

  if (loading) return <p className="text-center py-5">Loading analytics...</p>;

  // ---- Summary Cards ----
  const totalBills = bills.length;
  const totalRevenue = bills.reduce(
    (sum, b) =>
      sum + b.consultations.reduce((s, c) => s + Number(c.amount || 0), 0),
    0
  );
  const uniquePatients = new Set(bills.map((b) => b.patientName)).size;

  // ---- Monthly Revenue Chart ----
  const monthlyRevenue: Record<string, number> = {};
  bills.forEach((b) => {
    const d = new Date((b.createdAt?.seconds || 0) * 1000);
    const month = d.toLocaleString("default", { month: "short" });
    const amt = b.consultations.reduce(
      (sum, c) => sum + Number(c.amount || 0),
      0
    );
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + amt;
  });

  const monthlyChartData = {
    labels: Object.keys(monthlyRevenue),
    datasets: [
      {
        label: "Monthly Revenue (₹)",
        data: Object.values(monthlyRevenue),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  const monthlyChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Monthly Revenue" },
    },
  };

  // ---- Patient-wise Revenue Chart ----
  const revenueByPatient: Record<string, number> = {};
  bills.forEach((b) => {
    const amt = b.consultations.reduce((s, c) => s + Number(c.amount || 0), 0);
    revenueByPatient[b.patientName] =
      (revenueByPatient[b.patientName] || 0) + amt;
  });

  const patientChartData = {
    labels: Object.keys(revenueByPatient),
    datasets: [
      {
        label: "Revenue per Patient (₹)",
        data: Object.values(revenueByPatient),
        backgroundColor: "rgba(255, 99, 132, 0.6)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  };

  const patientChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Revenue per Patient" },
    },
  };

  return (
    <div className="container py-5" style={{ fontFamily: "Inter, sans-serif" }}>
      <h2 className="text-center mb-4">📊 Clinic Analytics</h2>

      {/* Summary Cards */}
      <div className="row text-center mb-5">
        <div className="col-md-4 mb-3">
          <div className="card shadow-sm p-3 border-0">
            <h5>Total Bills</h5>
            <h3 className="text-primary">{totalBills}</h3>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card shadow-sm p-3 border-0">
            <h5>Total Patients</h5>
            <h3 className="text-success">{uniquePatients}</h3>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card shadow-sm p-3 border-0">
            <h5>Total Revenue</h5>
            <h3 className="text-danger">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </h3>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="card shadow-sm p-4 mb-5">
        <Bar data={monthlyChartData} options={monthlyChartOptions} />
      </div>

      {/* Patient-wise Revenue Chart */}
      <div className="card shadow-sm p-4 mb-5">
        <Bar data={patientChartData} options={patientChartOptions} />
      </div>
    </div>
  );
}
