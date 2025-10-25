"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FiHome,
  FiFileText,
  FiUser,
  FiBarChart2,
  FiMenu,
  FiX,
  FiCalendar,
} from "react-icons/fi";
import {
  getAppointments,
  getAllBills,
  getPatientsWithId,
} from "../lib/firebase";
import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);

  // Dashboard stats
  const [appointmentsTodayCount, setAppointmentsTodayCount] =
    useState<number>(0);
  const [revenueToday, setRevenueToday] = useState<number>(0);
  const [newPatientsToday, setNewPatientsToday] = useState<number>(0);

  // Dentist profile states
  const [dentistName, setDentistName] = useState<string>("Dentist");
  const [dentistQualification, setDentistQualification] = useState<string>(
    "BDS, MDS - Oral Surgery"
  );

  useEffect(() => {
    setHydrated(true);

    const handleResize = () => setIsMobile(window.innerWidth < 992);
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        const today = new Date();
        const todayStr = today.toLocaleDateString("en-CA"); // "YYYY-MM-DD"

        // 1️⃣ Appointments Today
        const appointments = await getAppointments();
        const todayAppointments = appointments.filter((a) => {
          const startDate = new Date(a.start);
          const startStr = startDate.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
          return startStr === todayStr;
        });

        setAppointmentsTodayCount(todayAppointments.length);

        // 2️⃣ Revenue Today
        const bills = await getAllBills();
        const todayBills = bills.filter((b: any) => {
          let billDate: string;
          if (b.createdAt?.toDate) {
            // Firestore Timestamp
            billDate = b.createdAt.toDate().toISOString().split("T")[0];
          } else if (b.createdAt) {
            // JS Date string
            billDate = new Date(b.createdAt).toISOString().split("T")[0];
          } else {
            // Missing date
            return false;
          }
          return billDate === todayStr;
        });

        const revenue = todayBills.reduce((sum: number, bill: any) => {
          if (bill.consultations && Array.isArray(bill.consultations)) {
            return (
              sum +
              bill.consultations.reduce(
                (s: any, c: { amount: any }) => s + (c.amount || 0),
                0
              )
            );
          }
          return sum;
        }, 0);
        setRevenueToday(revenue);

        // 3️⃣ New Patients Today
        const patients = await getPatientsWithId();
        const todayNewPatients = patients.filter((p: any) => {
          const created = p.createdAt ? new Date(p.createdAt) : new Date();
          const createdStr = created.toISOString().split("T")[0];
          return createdStr === todayStr;
        });
        setNewPatientsToday(todayNewPatients.length);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
    };

    fetchDashboardData();
  }, []);

  const menuItems = [
    { name: "Home", href: "/", icon: <FiHome /> },
    { name: "Create Bill", href: "/create-bill", icon: <FiFileText /> },
    { name: "Admin", href: "/admin/login", icon: <FiUser /> },
    // { name: "Analytics", href: "/admin/analytics", icon: <FiBarChart2 /> },
    { name: "Calendar", href: "/calendar", icon: <FiCalendar /> },
  ];

  return (
    <html lang="en">
      <head>
        <title>🦷 Dentist Billing System</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="logo.png" type="image/png" />
      </head>
      <body className="app-body">
        <Toaster position="top-right" reverseOrder={false} />
        <div className="layout-container">
          {/* Sidebar */}
          <aside
            className={`sidebar ${
              isMobile ? (sidebarOpen ? "open" : "closed") : "open"
            }`}
          >
            <div className="sidebar-header">
              <div className="brand">
                <span className="logo">🦷</span>
                {(!isMobile || sidebarOpen) && (
                  <span className="brand-text">Dentist</span>
                )}
              </div>
              {isMobile && (
                <button
                  className="toggle-btn"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? <FiX /> : <FiMenu />}
                </button>
              )}
            </div>

            <nav
              className="sidebar-nav d-flex flex-column"
              style={{ height: "100%" }}
            >
              {/* Top items */}
              <div className="flex-grow-1">
                {menuItems
                  .filter((item) => item.name !== "Admin")
                  .map((item, idx) => (
                    <a
                      key={idx}
                      href={item.href}
                      className={`nav-item ${
                        pathname === item.href ? "active" : ""
                      }`}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {(!isMobile || sidebarOpen) && (
                        <span className="nav-text">{item.name}</span>
                      )}
                    </a>
                  ))}
              </div>

              {/* Admin pinned at bottom */}
              <div>
                {menuItems
                  .filter((item) => item.name === "Admin")
                  .map((item, idx) => (
                    <a
                      key={idx}
                      href={item.href}
                      className={`nav-item ${
                        pathname === item.href ? "active" : ""
                      }`}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {(!isMobile || sidebarOpen) && (
                        <span className="nav-text">{item.name}</span>
                      )}
                    </a>
                  ))}
              </div>
            </nav>
          </aside>

          {isMobile && sidebarOpen && (
            <div className="overlay" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Main Content */}
          <main
            className="main-content"
            style={{
              marginLeft: !isMobile ? 240 : 0,
              transition: "margin-left 0.3s ease",
            }}
          >
            <header className="topbar">
              <div className="left-section d-flex align-items-center gap-2">
                {isMobile && (
                  <button
                    className="btn-toggle-mobile"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <FiMenu size={22} />
                  </button>
                )}
                <h5 className="page-title">Dentist Billing System</h5>
              </div>
              <div className="right-section">
                <div className="user-badge">Current user : Admin</div>
              </div>
            </header>

            {/* Dashboard cards only on Home */}
            {pathname === "/" && (
              <div className="container-fluid my-3">
                <div className="row g-3" style={{ width: "100%" }}>
                  {/* Welcome Card */}
                  <div className="col-lg-6">
                    <div
                      className="card shadow-sm border-0 bg-white"
                      style={{
                        borderRadius: 16,
                        padding: "1.5rem",
                        height: "100%",
                      }}
                    >
                      <div className="card-body d-flex flex-column justify-content-between">
                        <div>
                          <h5
                            className="card-title mb-1"
                            style={{
                              color: "#0d6efd",
                              fontWeight: 600,
                              fontSize: "1.25rem",
                            }}
                          >
                            Welcome back, Dr. {dentistName}!
                          </h5>
                          <p
                            className="card-text mb-3"
                            style={{ color: "#6c757d", fontSize: "0.95rem" }}
                          >
                            {dentistQualification}
                          </p>
                          <p
                            className="mb-0"
                            style={{ color: "#212529", fontSize: "1rem" }}
                          >
                            <strong>{appointmentsTodayCount}</strong>{" "}
                            appointments scheduled for today
                          </p>
                        </div>
                        <div className="mt-4">
                          <button
                            className="btn btn-primary px-4 py-2"
                            onClick={() => router.push("/calendar")}
                            style={{ borderRadius: 8, fontWeight: 500 }}
                          >
                            View Schedule
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats Card */}
                  <div className="col-lg-6">
                    <div
                      className="card shadow-sm border-0 bg-white"
                      style={{
                        borderRadius: 16,
                        padding: "1.5rem",
                        height: "100%",
                      }}
                    >
                      <div className="card-body d-flex flex-column justify-content-between">
                        <div>
                          <h5
                            className="card-title mb-1"
                            style={{
                              color: "#198754",
                              fontWeight: 600,
                              fontSize: "1.25rem",
                            }}
                          >
                            Quick Stats
                          </h5>
                          <p
                            className="card-text mb-2"
                            style={{ color: "#6c757d", fontSize: "0.95rem" }}
                          >
                            Here’s a quick overview of your clinic today:
                          </p>
                          <ul
                            className="mb-0"
                            style={{ color: "#212529", fontSize: "1rem" }}
                          >
                            <li>
                              🧾 Total Bills Today: {appointmentsTodayCount}
                            </li>
                            <li>💰 Revenue Collected: ₹{revenueToday}</li>
                            <li>👥 New Patients: {newPatientsToday}</li>
                          </ul>
                        </div>
                        <div className="mt-4">
                          <button
                            className="btn btn-success px-4 py-2"
                            onClick={() => router.push("/admin/analytics")}
                            style={{ borderRadius: 8, fontWeight: 500 }}
                          >
                            View Analytics
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <section className="page-content">{children}</section>

            <footer className="footer d-flex flex-column flex-md-row align-items-center justify-content-between py-3 px-4 bg-light border-top">
              <span className="text-muted">
                © {new Date().getFullYear()} Dentist Billing System. All rights
                reserved.
              </span>
              <span className="text-muted mt-2 mt-md-0">
                Designed and developed by{" "}
                <a
                  href="https://shreesha99.github.io/personal-website/"
                  target="_blank"
                  className="text-decoration-none"
                >
                  Shreesha Venkatram
                </a>
              </span>
            </footer>
          </main>
        </div>
      </body>
    </html>
  );
}
