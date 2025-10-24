"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import { House, FileText, People, BarChart } from "react-bootstrap-icons";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setHydrated(true);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);

    const timer = setTimeout(() => setLoading(false), 800);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  const menuItems = [
    { name: "Home", href: "/", icon: <House /> },
    { name: "Create Bill", href: "/create-bill", icon: <FileText /> },
    { name: "Admin", href: "/admin/login", icon: <People /> },
    { name: "Analytics", href: "/admin/analytics", icon: <BarChart /> },
  ];

  const Skeleton = ({ width = "100%", height = 20, className = "" }) => (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: 6 }}
    />
  );

  return (
    <html lang="en">
      <head>
        <title>🦷 Dentist Billing System</title>
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className="bg-light d-flex flex-column min-vh-100">
        <div
          className="d-flex flex-grow-1 position-relative"
          style={{ minHeight: "100vh" }}
        >
          {/* Sidebar */}
          <div
            className="bg-primary text-light d-flex flex-column shadow-sm position-fixed top-0 h-100"
            style={{
              width: sidebarOpen ? 220 : 60,
              transition: "width 0.3s",
              left: 0,
              zIndex: 1050,
            }}
          >
            {loading ? (
              <>
                <Skeleton height={40} className="my-3 mx-2" />
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} height={40} className="my-2 mx-2" />
                  ))}
              </>
            ) : (
              <>
                {!isMobile && (
                  <button
                    className="btn btn-light mb-3 mx-auto d-flex align-items-center justify-content-center"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    style={{ width: sidebarOpen ? "90%" : "40px" }}
                  >
                    {sidebarOpen ? "⬅" : "➡"}
                  </button>
                )}

                <nav className="flex-grow-1 d-flex flex-column gap-2 px-2">
                  {menuItems.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.href}
                      className="text-decoration-none text-light d-flex align-items-center gap-3 p-2 rounded hover-bg-light transition"
                      title={!sidebarOpen ? item.name : undefined}
                    >
                      <span
                        className="fs-5 d-flex justify-content-center"
                        style={{ minWidth: 24 }}
                      >
                        {item.icon}
                      </span>
                      {sidebarOpen && (
                        <span className="fw-medium">{item.name}</span>
                      )}
                    </a>
                  ))}
                </nav>
              </>
            )}
          </div>

          {/* Overlay for mobile */}
          {isMobile && sidebarOpen && (
            <div
              className="position-fixed top-0 start-0 w-100 h-100"
              style={{ backgroundColor: "rgba(0,0,0,0.3)", zIndex: 1040 }}
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main content */}
          <div
            className="flex-grow-1 d-flex flex-column"
            style={{
              marginLeft: !isMobile ? (sidebarOpen ? 220 : 60) : 0,
              transition: "margin-left 0.3s",
            }}
          >
            {/* Navbar */}
            <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
              <div className="container d-flex justify-content-between align-items-center">
                {loading ? (
                  <Skeleton height={40} width={"120"} />
                ) : (
                  <span className="navbar-brand fw-bold">
                    <a href="/" className="text-decoration-none text-light">
                      🦷 Dentist Billing
                    </a>
                  </span>
                )}
              </div>
            </nav>

            {/* Main content */}
            <main className="flex-grow-1 w-100 p-4">{children}</main>

            {/* Footer */}
            <footer className="bg-dark text-light text-center py-3 mt-auto">
              <p className="mb-0 small">
                © {new Date().getFullYear()} Dentist Billing System. All rights
                reserved.
              </p>
            </footer>
          </div>
        </div>

        <style jsx>{`
          .hover-bg-light:hover {
            background-color: rgba(255, 255, 255, 0.15);
            transition: background-color 0.2s;
          }
          .skeleton {
            background: linear-gradient(
              90deg,
              #e0e0e0 25%,
              #f5f5f5 50%,
              #e0e0e0 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.2s infinite;
          }
          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
        `}</style>
      </body>
    </html>
  );
}
