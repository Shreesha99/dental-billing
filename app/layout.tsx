"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FiHome,
  FiFileText,
  FiUser,
  FiMenu,
  FiCalendar,
  FiX,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  const [appointmentsTodayCount, setAppointmentsTodayCount] =
    useState<number>(0);
  const [revenueToday, setRevenueToday] = useState<number>(0);
  const [newPatientsToday, setNewPatientsToday] = useState<number>(0);

  useEffect(() => {
    setHydrated(true);

    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const today = new Date();
        const todayStr = today.toLocaleDateString("en-CA");

        const fetchedAppointments = await getAppointments();
        const todayAppointments = fetchedAppointments.filter((a: any) => {
          const startDate = new Date(a.start);
          return startDate.toLocaleDateString("en-CA") === todayStr;
        });
        setAppointmentsTodayCount(todayAppointments.length);

        const bills = await getAllBills();
        const todayBills = bills.filter((b: any) => {
          let billDate: string;
          if (b.createdAt?.toDate) {
            billDate = b.createdAt.toDate().toISOString().split("T")[0];
          } else if (b.createdAt) {
            billDate = new Date(b.createdAt).toISOString().split("T")[0];
          } else return false;
          return billDate === todayStr;
        });

        const revenue = todayBills.reduce((sum: number, bill: any) => {
          if (bill.consultations && Array.isArray(bill.consultations)) {
            return (
              sum +
              bill.consultations.reduce(
                (s: any, c: { amount: number }) => s + (c.amount || 0),
                0
              )
            );
          }
          return sum;
        }, 0);
        setRevenueToday(revenue);

        const patients = await getPatientsWithId();
        const todayNewPatients = patients.filter((p: any) => {
          const created = p.createdAt ? new Date(p.createdAt) : new Date();
          return created.toISOString().split("T")[0] === todayStr;
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
    { name: "Calendar", href: "/calendar", icon: <FiCalendar /> },
    { name: "Admin", href: "/admin/login", icon: <FiUser /> },
  ];

  return (
    <html lang="en">
      <head>
        <title>🦷 Dentist Billing System</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/logo.png" type="image/png" />
      </head>
      <body className="app-body">
        <Toaster position="top-right" reverseOrder={false} />
        {/* <Preloader /> */}
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
                {/* ✅ Show text when sidebar is open on mobile OR always on desktop */}
                {(!isMobile || sidebarOpen) && (
                  <span className="brand-text">Dentist</span>
                )}
              </div>

              {/* ✅ Toggle only on mobile, switch icons dynamically */}
              {isMobile && (
                <button
                  className="toggle-btn"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? <FiX /> : <FiMenu />}
                </button>
              )}
            </div>

            <nav className="sidebar-nav d-flex flex-column">
              <div className="grow">
                {menuItems
                  .filter((item) => item.name !== "Admin")
                  .map((item, idx: number) => (
                    <a
                      key={idx}
                      href={item.href}
                      className={`nav-item ${
                        pathname === item.href ? "active" : ""
                      }`}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {/* ✅ Show text when sidebar is open on mobile */}
                      {(!isMobile || sidebarOpen) && (
                        <span className="nav-text">{item.name}</span>
                      )}
                    </a>
                  ))}
              </div>

              <div>
                {menuItems
                  .filter((item) => item.name === "Admin")
                  .map((item, idx: number) => (
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

          {/* Overlay for mobile */}
          {isMobile && sidebarOpen && (
            <div className="overlay" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Main content */}
          <main className="main-content">
            <header className="topbar">
              <div className="left-section">
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
