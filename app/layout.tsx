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
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./AuthProvider";
import ProtectedLayout from "./ProtectedLayout";
import {
  getAppointments,
  getAllBills,
  getPatientsWithId,
} from "../lib/firebase";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { user, logout } = useAuth();

  // ✅ Public routes — hide sidebar/navbar
  const publicRoutes = ["/login", "/signup"];
  const isPublic = publicRoutes.includes(pathname);

  const [appointmentsTodayCount, setAppointmentsTodayCount] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [newPatientsToday, setNewPatientsToday] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ Skip dashboard fetching for public routes
  useEffect(() => {
    if (isPublic) return;

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
          const created = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAt);
          return created.toISOString().split("T")[0] === todayStr;
        });

        const revenue = todayBills.reduce((sum: number, bill: any) => {
          if (bill.consultations && Array.isArray(bill.consultations)) {
            return (
              sum +
              bill.consultations.reduce(
                (s: number, c: { amount: number }) => s + (c.amount || 0),
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
  }, [isPublic]);

  const menuItems = [
    { name: "Home", href: "/", icon: <FiHome /> },
    { name: "Create Bill", href: "/create-bill", icon: <FiFileText /> },
    { name: "Calendar", href: "/calendar", icon: <FiCalendar /> },
    { name: "Admin", href: "/admin/login", icon: <FiUser /> },
  ];

  // ✅ Show only login/signup content without sidebar/navbar
  if (isPublic) {
    return <main className="w-100">{children}</main>;
  }

  // ✅ Protected layout with sidebar/navbar
  return (
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

        <nav className="sidebar-nav d-flex flex-column">
          <div className="grow">
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

      <main className="main-content">
        {/* Navbar */}
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
          <div className="right-section d-flex align-items-center gap-3">
            {user ? (
              <>
                <div className="user-badge">
                  <strong>{user.displayName || user.email}</strong>
                </div>
                <button
                  onClick={logout}
                  className="btn btn-outline-danger btn-sm px-3"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="text-muted small">Not logged in</div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <section className="page-content">{children}</section>

        <footer className="footer py-3 px-4 bg-light border-top text-center">
          <span className="text-muted">
            © {new Date().getFullYear()} Dentist Billing System
          </span>
        </footer>
      </main>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Dentist Billing System</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/logo-removebg-preview.png" type="image/png" />
      </head>
      <body className="app-body">
        <AuthProvider>
          <Toaster position="top-right" reverseOrder={false} />
          <ProtectedLayout>
            <LayoutContent>{children}</LayoutContent>
          </ProtectedLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
