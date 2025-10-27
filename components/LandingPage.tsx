"use client";

import React, { useEffect, useState, useRef } from "react";
import { getAllBills } from "../lib/firebase";
import gsap from "gsap";

export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const [revenueToday, setRevenueToday] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [billsToday, setBillsToday] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const hasAnimated = useRef(false); // guard to avoid double animation in StrictMode

  // Fetch data
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const bills = await getAllBills();

        const todayBills = bills.filter((b: any) => {
          if (!b.createdAt) return false;
          let billDate: string | null = null;
          try {
            if (typeof b.createdAt.toDate === "function") {
              billDate = b.createdAt.toDate().toISOString().split("T")[0];
            } else if (b.createdAt instanceof Date) {
              billDate = b.createdAt.toISOString().split("T")[0];
            } else if (typeof b.createdAt === "string") {
              const parsed = new Date(b.createdAt);
              if (!isNaN(parsed.getTime())) {
                billDate = parsed.toISOString().split("T")[0];
              }
            }
          } catch {
            return false;
          }
          return billDate === todayStr;
        });

        const totalRevenue = todayBills.reduce((sum: number, bill: any) => {
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

        setRevenueToday(totalRevenue);
        setBillsToday(todayBills.length);
        setPendingPayments(Math.max(0, Math.floor(todayBills.length * 0.3)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Entrance animations (title + cards) — runs once, cleaned up properly
  useEffect(() => {
    if (loading) return; // wait for data
    if (hasAnimated.current) return; // already ran once (prevents StrictMode double-run)
    hasAnimated.current = true;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Title reveal
      tl.fromTo(
        titleRef.current,
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: "power3.out" }
      );

      // Cards stagger (use card elements that exist)
      const els = cardsRef.current.filter(Boolean) as Element[];
      tl.fromTo(
        els,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.18,
          ease: "back.out(1.4)",
        },
        "-=0.45"
      );
    }, containerRef);

    // cleanup
    return () => {
      ctx.revert();
    };
  }, [loading]);

  // Hover animation: gentle upward movement + slight scale (GSAP)
  const handleHover = (index: number, enter: boolean) => {
    const el = cardsRef.current[index];
    if (!el) return;
    gsap.to(el, {
      y: enter ? -8 : 0,
      scale: enter ? 1.02 : 1,
      duration: 0.28,
      ease: "power2.out",
      overwrite: true,
    });
  };

  if (loading) {
    return (
      <div
        className="dashboard-wrap d-flex align-items-center justify-content-center"
        style={{ minHeight: "60vh" }}
      >
        <div className="text-center">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-3 mb-0">Loading dashboard...</p>
        </div>
        <style jsx>{`
          .dashboard-wrap {
            background: linear-gradient(180deg, #f3f6fb 0%, #eef2f7 100%);
            padding: 3rem 1rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="dashboard-wrap"
      style={{ padding: "2rem 1rem", minHeight: "60vh" }}
    >
      {/* page background so glass shows */}
      <style jsx global>{`
        body {
          background: linear-gradient(135deg, #e9eef6 0%, #f8fbff 100%);
        }
      `}</style>

      <div className="container">
        <h2
          ref={titleRef}
          className="mb-4 fw-semibold text-center"
          style={{ color: "#223249" }}
        >
          Welcome back, <span style={{ color: "#0d6efd" }}>Doctor!</span>
        </h2>

        <div className="row g-4 justify-content-center">
          {/* Large card */}
          <div className="col-lg-7 col-md-9">
            <div
              ref={(el) => {
                if (el) cardsRef.current[0] = el;
              }}
              className="glass-card p-4 h-100"
              onMouseEnter={() => handleHover(0, true)}
              onMouseLeave={() => handleHover(0, false)}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="mb-1" style={{ color: "#198754" }}>
                    Revenue & Payments
                  </h6>
                  <h2 style={{ marginBottom: 8, color: "#0b2b22" }}>
                    ₹{revenueToday.toLocaleString()}
                  </h2>
                  <p className="mb-1">
                    ⚠️ Pending Payments:{" "}
                    <strong style={{ color: "#c92a2a" }}>
                      {pendingPayments}
                    </strong>
                  </p>
                  <p className="mb-1">
                    🧾 Bills Generated: <strong>{billsToday}</strong>
                  </p>
                  <p className="mb-0">
                    💵 Avg Revenue/Bill:{" "}
                    <strong>
                      ₹{billsToday ? Math.round(revenueToday / billsToday) : 0}
                    </strong>
                  </p>
                </div>
                <div style={{ alignSelf: "center" }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 16,
                      display: "grid",
                      placeItems: "center",
                      background:
                        "linear-gradient(135deg, rgba(13,110,253,0.12), rgba(25,135,84,0.06))",
                    }}
                  >
                    <i
                      className="bi bi-cash-coin"
                      style={{ fontSize: 28, color: "#0d6efd" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Small card */}
          <div className="col-lg-4 col-md-9">
            <div
              ref={(el) => {
                if (el) cardsRef.current[1] = el;
              }}
              className="glass-card p-4 h-100"
              onMouseEnter={() => handleHover(1, true)}
              onMouseLeave={() => handleHover(1, false)}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="mb-1" style={{ color: "#d97706" }}>
                    Bills Summary
                  </h6>
                  <h2 style={{ marginBottom: 8, color: "#1f2937" }}>
                    {billsToday}
                  </h2>
                  <p className="mb-1">📄 Total Bills Today</p>
                  <p className="mb-0">
                    💰 Avg per Bill:{" "}
                    <strong>
                      ₹{billsToday ? Math.round(revenueToday / billsToday) : 0}
                    </strong>
                  </p>
                </div>
                <div style={{ alignSelf: "center" }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background:
                        "linear-gradient(135deg, rgba(245,158,11,0.10), rgba(13,110,253,0.02))",
                    }}
                  >
                    <i
                      className="bi bi-receipt-cutoff"
                      style={{ fontSize: 24, color: "#d97706" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Glass CSS */}
      <style jsx>{`
        .glass-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.55),
            rgba(255, 255, 255, 0.35)
          );
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.6);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          box-shadow: 0 8px 30px rgba(16, 24, 40, 0.06);
          transition: transform 0.28s ease, box-shadow 0.28s ease;
        }

        /* stronger hover glow */
        .glass-card:hover {
          box-shadow: 0 16px 42px rgba(16, 24, 40, 0.12);
        }

        /* small responsive tweaks */
        @media (max-width: 768px) {
          .glass-card {
            border-radius: 12px;
          }
        }
      `}</style>
    </div>
  );
}
