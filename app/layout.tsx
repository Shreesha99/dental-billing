"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./AuthProvider";
import ProtectedLayout from "./ProtectedLayout";
import {
  FiHome,
  FiFileText,
  FiUser,
  FiMenu,
  FiCalendar,
  FiX,
} from "react-icons/fi";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname() ?? "/";

  const publicRoutes = ["/login", "/signup"];
  const isPublic = publicRoutes.includes(pathname);

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

  const menuItems = [
    { name: "Home", href: "/", icon: <FiHome /> },
    { name: "Create Bill", href: "/create-bill", icon: <FiFileText /> },
    { name: "Calendar", href: "/calendar", icon: <FiCalendar /> },
    { name: "Admin", href: "/admin/login", icon: <FiUser /> },
  ];

  // 🦷 Public layout (Login / Signup)
  if (isPublic) {
    return (
      <div className="auth-layout">
        <div className="auth-info">
          <div className="auth-brand text-center">
            <span className="auth-logo">🦷</span>
            <h1>Dentist Billing System</h1>
            <p>
              Manage your clinic’s billing, appointments, and patient history —
              seamlessly and securely.
            </p>
          </div>
        </div>

        <div className="auth-divider" />

        <div className="auth-form-area">{children}</div>
      </div>
    );
  }

  // 🧭 Authenticated Layout
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
          {menuItems.map((item, idx) => (
            <a
              key={idx}
              href={item.href}
              className={`nav-item ${pathname === item.href ? "active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {(!isMobile || sidebarOpen) && (
                <span className="nav-text">{item.name}</span>
              )}
            </a>
          ))}
        </nav>
      </aside>

      {isMobile && sidebarOpen && (
        <div className="overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <h5 className="page-title mb-0">Dentist Billing System</h5>
        </header>

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
      </head>
      <body className="app-body">
        <AuthProvider>
          <Toaster position="top-right" reverseOrder={false} />
          <ProtectedLayout>
            <LayoutContent>{children}</LayoutContent>
          </ProtectedLayout>
        </AuthProvider>

        <style jsx global>{`
          /* General */
          html,
          body {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden; /* Prevent scrollbars on auth pages */
          }

          body {
            font-family: "Poppins", sans-serif;
            background-color: #ffffff;
          }

          /* ---------- AUTH LAYOUT ---------- */
          .auth-layout {
            display: flex;
            width: 100%;
            height: 100vh;
            overflow: hidden;
          }

          .auth-info {
            flex: 1;
            background: linear-gradient(135deg, #007bff, #00c6ff);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
          }

          .auth-brand {
            max-width: 420px;
            padding: 2rem;
          }

          .auth-logo {
            font-size: 4rem;
          }

          .auth-brand h1 {
            font-weight: 600;
            margin-top: 1rem;
            font-size: 2rem;
          }

          .auth-brand p {
            margin-top: 0.75rem;
            font-size: 1.1rem;
            opacity: 0.9;
          }

          .auth-divider {
            width: 1.5px;
            background: rgba(0, 0, 0, 0.08);
          }

          .auth-form-area {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #ffffff;
            padding: 3rem 2rem;
            overflow: hidden;
          }

          /* ✅ Responsive Fixes */
          @media (max-width: 992px) {
            html,
            body {
              overflow-y: auto;
            }

            .auth-layout {
              flex-direction: column;
              height: auto;
              min-height: 100vh;
            }

            .auth-divider {
              height: 1.5px;
              width: 100%;
            }

            .auth-info {
              padding: 3rem 1.5rem;
            }

            .auth-form-area {
              padding: 2rem 1rem;
            }
          }
        `}</style>
      </body>
    </html>
  );
}
