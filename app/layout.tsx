"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  FiHome,
  FiFileText,
  FiUser,
  FiBarChart2,
  FiMenu,
  FiX,
} from "react-icons/fi";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname(); // Get current path
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setHydrated(true);

    const handleResize = () => setIsMobile(window.innerWidth < 992);
    handleResize();
    window.addEventListener("resize", handleResize);

    const timer = setTimeout(() => setLoading(false), 700);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  const menuItems = [
    { name: "Home", href: "/", icon: <FiHome /> },
    { name: "Create Bill", href: "/create-bill", icon: <FiFileText /> },
    { name: "Admin", href: "/admin/login", icon: <FiUser /> },
    { name: "Analytics", href: "/admin/analytics", icon: <FiBarChart2 /> },
    { name: "Calendar", href: "/calendar", icon: <FiBarChart2 /> },
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

            <nav className="sidebar-nav">
              {menuItems.map((item, idx) => (
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
            </nav>
          </aside>

          {/* Overlay for mobile */}
          {isMobile && sidebarOpen && (
            <div className="overlay" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Main Content */}
          <main
            className="main-content"
            style={{
              marginLeft: !isMobile ? 240 : 0, // sidebar always open on desktop
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

            <section className="page-content">{children}</section>

            <footer className="footer">
              © {new Date().getFullYear()} Dentist Billing System. All rights
              reserved.
            </footer>
          </main>
        </div>
      </body>
    </html>
  );
}
