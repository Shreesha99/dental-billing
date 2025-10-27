"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  getAllBills,
  getAppointments,
  getPatientsWithId,
} from "../lib/firebase";
import gsap from "gsap";
import { FiDollarSign, FiFileText, FiClock, FiUser } from "react-icons/fi";

export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const [revenueToday, setRevenueToday] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [billsToday, setBillsToday] = useState(0);
  const [completedAppointments, setCompletedAppointments] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const [cancelledAppointments, setCancelledAppointments] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);

  const [totalPatients, setTotalPatients] = useState(0);
  const [newPatients, setNewPatients] = useState(0);
  const [returningPatients, setReturningPatients] = useState(0);
  const [followUps, setFollowUps] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const hasAnimated = useRef(false);

  // Fetch data
  // Fetch data
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const bills = await getAllBills();
        const appointments = await getAppointments();
        const patients = await getPatientsWithId();

        // ====== Bills (already correct) ======
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

        // ====== Appointments Breakdown ======
        const todayAppointments = appointments.filter((a: any) => {
          const date = new Date(a.start).toISOString().split("T")[0];
          return date === todayStr;
        });

        const completed = todayAppointments.filter((a) =>
          a.description?.toLowerCase().includes("completed")
        ).length;
        const pending = todayAppointments.filter((a) =>
          a.description?.toLowerCase().includes("pending")
        ).length;
        const cancelled = todayAppointments.filter((a) =>
          a.description?.toLowerCase().includes("cancelled")
        ).length;

        // ====== Patients Overview ======
        const totalPatients = patients.length;
        const thisWeekStart = new Date();
        thisWeekStart.setDate(thisWeekStart.getDate() - 7);

        const newPatients = patients.filter((p: any) => {
          const created =
            typeof p.createdAt?.toDate === "function"
              ? p.createdAt.toDate()
              : new Date(p.createdAt);
          return created >= thisWeekStart;
        }).length;

        const returningPatients = totalPatients - newPatients;
        const followUps = todayAppointments.filter(
          (a) => a.type === "Follow-up"
        ).length;

        // ====== Update State ======
        setRevenueToday(totalRevenue);
        setBillsToday(todayBills.length);
        setPendingPayments(Math.max(0, Math.floor(todayBills.length * 0.3)));

        setCompletedAppointments(completed);
        setPendingAppointments(pending);
        setCancelledAppointments(cancelled);
        setTotalAppointments(todayAppointments.length);

        setTotalPatients(totalPatients);
        setNewPatients(newPatients);
        setReturningPatients(returningPatients);
        setFollowUps(followUps);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // GSAP entrance animation
  useEffect(() => {
    if (loading || hasAnimated.current) return;

    const timeout = setTimeout(() => {
      hasAnimated.current = true;
      const ctx = gsap.context(() => {
        const tl = gsap.timeline();

        if (titleRef.current) {
          tl.fromTo(
            titleRef.current,
            { y: 28, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.9, ease: "power3.out" }
          );
        }

        const els = cardsRef.current.filter(Boolean) as Element[];
        if (els.length > 0) {
          tl.fromTo(
            els,
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.7,
              stagger: 0.12,
              ease: "back.out(1.4)",
            },
            "-=0.45"
          );
        }
      }, containerRef);

      return () => ctx.revert();
    }, 100); // 🔥 small delay ensures DOM is ready

    return () => clearTimeout(timeout);
  }, [loading]);

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

  // Move GSAP loader animation OUTSIDE the conditional
  useEffect(() => {
    if (!loading) return;

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.3 });
    tl.to(".progress-fill", {
      width: "100%",
      duration: 1.2,
      ease: "power2.inOut",
    }).to(".progress-fill", {
      width: "0%",
      duration: 0,
    });

    // ✅ Proper cleanup — no return value from kill()
    return () => {
      tl.kill();
    };
  }, [loading]);

  if (loading) {
    return (
      <div
        className="dashboard-wrap d-flex align-items-center justify-content-center"
        style={{ minHeight: "60vh" }}
      >
        <div className="text-center w-50">
          <div
            className="progress"
            style={{
              height: "10px",
              background: "#e0e6ef",
              borderRadius: "20px",
              overflow: "hidden",
            }}
          >
            <div
              className="progress-fill"
              style={{
                width: "0%",
                height: "100%",
                background: "linear-gradient(90deg, #007bff, #00c4ff)",
              }}
            ></div>
          </div>
          <p className="mt-3 mb-0 fw-semibold text-secondary">
            Loading dashboard...
          </p>
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

        {/* TOP ROW */}
        <div className="row g-4">
          {/* Left large card (matches image proportions) */}
          <div className="col-xl-7 col-lg-7 col-md-12">
            <div
              ref={(el) => {
                if (el) cardsRef.current[0] = el;
              }}
              className="glass-card p-4 h-100 d-flex flex-column"
              onMouseEnter={() => handleHover(0, true)}
              onMouseLeave={() => handleHover(0, false)}
              style={{ minHeight: 320 }}
            >
              <div className="d-flex justify-content-between align-items-start mb-2">
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

                <div
                  style={{
                    alignSelf: "center",
                    width: 72,
                    height: 72,
                    borderRadius: 18,
                    display: "grid",
                    placeItems: "center",
                    background:
                      "linear-gradient(135deg, rgba(13,110,253,0.12), rgba(25,135,84,0.06))",
                    flexShrink: 0,
                  }}
                >
                  <FiDollarSign size={34} color="#0d6efd" />
                </div>
              </div>

              {/* Below large card content: small metrics row */}
              <div className="mt-auto">
                <div className="row g-3">
                  <div className="col-sm-4">
                    <div className="mini-metric p-3 rounded-3 bg-white border">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="small text-muted">Today's Bills</div>
                          <div className="h5 mb-0">{billsToday}</div>
                        </div>
                        <div className="ms-3">
                          <FiFileText size={20} color="#0d6efd" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-sm-4">
                    <div className="mini-metric p-3 rounded-3 bg-white border">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="small text-muted">Pending</div>
                          <div className="h5 mb-0">{pendingPayments}</div>
                        </div>
                        <div className="ms-3">
                          <FiClock size={20} color="#f59e0b" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-sm-4">
                    <div className="mini-metric p-3 rounded-3 bg-white border">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="small text-muted">Avg / Bill</div>
                          <div className="h5 mb-0">
                            ₹
                            {billsToday
                              ? Math.round(revenueToday / billsToday)
                              : 0}
                          </div>
                        </div>
                        <div className="ms-3">
                          <FiUser size={20} color="#16a34a" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column with two stacked cards */}
          <div className="col-xl-5 col-lg-5 col-md-12 d-flex flex-column gap-3">
            <div
              ref={(el) => {
                if (el) cardsRef.current[1] = el;
              }}
              className="glass-card-sm p-3 h-100"
              onMouseEnter={() => handleHover(1, true)}
              onMouseLeave={() => handleHover(1, false)}
              style={{ minHeight: 150 }}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="mb-1" style={{ color: "#0f172a" }}>
                    Today's Top Bill
                  </h6>
                  <div className="h5 mb-1">Latest bill summary</div>
                  <div className="text-muted small">
                    View important billing details
                  </div>
                </div>
                <div
                  style={{
                    alignSelf: "center",
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    background:
                      "linear-gradient(135deg, rgba(13,110,253,0.08), rgba(13,110,253,0.02))",
                  }}
                >
                  <FiFileText size={22} color="#0d6efd" />
                </div>
              </div>
            </div>

            <div
              ref={(el) => {
                if (el) cardsRef.current[2] = el;
              }}
              className="glass-card-sm p-3 h-100"
              onMouseEnter={() => handleHover(2, true)}
              onMouseLeave={() => handleHover(2, false)}
              style={{ minHeight: 150 }}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="mb-1" style={{ color: "#0f172a" }}>
                    Pending Actions
                  </h6>
                  <div className="h5 mb-1">{pendingPayments} Pending</div>
                  <div className="text-muted small">
                    Follow-ups, payments and more
                  </div>
                </div>
                <div
                  style={{
                    alignSelf: "center",
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    background:
                      "linear-gradient(135deg, rgba(220,53,69,0.08), rgba(220,53,69,0.02))",
                  }}
                >
                  <FiClock size={20} color="#dc3545" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: three cards (like image) */}
        <div className="row g-3 mt-3">
          <div
            className="col-lg-4 col-md-6"
            ref={(el) => {
              if (el) cardsRef.current[3] = el;
            }}
            onMouseEnter={() => handleHover(3, true)}
            onMouseLeave={() => handleHover(3, false)}
          >
            <div className="small-card p-3 rounded-3 h-100 bg-white border">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="small text-muted">New Patients</div>
                  <div className="h5 mb-0">—</div>
                </div>
                <div>
                  <FiUser size={22} color="#0d6efd" />
                </div>
              </div>
            </div>
          </div>

          <div
            className="col-lg-4 col-md-6"
            ref={(el) => {
              if (el) cardsRef.current[4] = el;
            }}
            onMouseEnter={() => handleHover(4, true)}
            onMouseLeave={() => handleHover(4, false)}
          >
            <div className="small-card p-3 rounded-3 h-100 bg-white border">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="small text-muted">Appointments Today</div>
                  <div className="h5 mb-0">{billsToday}</div>
                </div>
                <div>
                  <FiClock size={22} color="#16a34a" />
                </div>
              </div>
            </div>
          </div>

          <div
            className="col-lg-4 col-md-12"
            ref={(el) => {
              if (el) cardsRef.current[5] = el;
            }}
            onMouseEnter={() => handleHover(5, true)}
            onMouseLeave={() => handleHover(5, false)}
          >
            <div className="small-card p-3 rounded-3 h-100 bg-white border">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="small text-muted">Payments Collected</div>
                  <div className="h5 mb-0">
                    ₹{revenueToday.toLocaleString()}
                  </div>
                </div>
                <div>
                  <FiDollarSign size={22} color="#0d6efd" />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* APPOINTMENT BREAKDOWN + PATIENT OVERVIEW */}
        {/* APPOINTMENT BREAKDOWN + PATIENT OVERVIEW */}
        <div className="row g-3 mt-3">
          {/* Appointment Breakdown */}
          <div className="col-lg-6 col-md-12">
            <div className="glass-card-sm p-4 h-100">
              <h6 className="fw-semibold mb-3 text-primary">
                Appointment Breakdown
              </h6>

              <div className="progress mb-3" style={{ height: "8px" }}>
                <div
                  className="progress-bar bg-success"
                  role="progressbar"
                  style={{
                    width: `${
                      (completedAppointments / totalAppointments) * 100 || 0
                    }%`,
                  }}
                ></div>
                <div
                  className="progress-bar bg-warning"
                  role="progressbar"
                  style={{
                    width: `${
                      (pendingAppointments / totalAppointments) * 100 || 0
                    }%`,
                  }}
                ></div>
                <div
                  className="progress-bar bg-danger"
                  role="progressbar"
                  style={{
                    width: `${
                      (cancelledAppointments / totalAppointments) * 100 || 0
                    }%`,
                  }}
                ></div>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Completed</span>
                <span className="fw-semibold text-success">
                  {completedAppointments}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Pending</span>
                <span className="fw-semibold text-warning">
                  {pendingAppointments}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Cancelled</span>
                <span className="fw-semibold text-danger">
                  {cancelledAppointments}
                </span>
              </div>
            </div>
          </div>

          {/* Patient Overview */}
          <div className="col-lg-6 col-md-12">
            <div className="glass-card-sm p-4 h-100">
              <h6 className="fw-semibold mb-3 text-success">
                Patient Overview
              </h6>

              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Total Patients</span>
                <span className="fw-semibold text-dark">{totalPatients}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">New This Week</span>
                <span className="fw-semibold text-primary">{newPatients}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Returning</span>
                <span className="fw-semibold text-info">
                  {returningPatients}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Follow-ups Scheduled</span>
                <span className="fw-semibold text-warning">{followUps}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Glass & card styles */}
      <style jsx>{`
        .glass-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.85),
            rgba(255, 255, 255, 0.75)
          );
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(8px);
          box-shadow: 0 18px 40px rgba(16, 24, 40, 0.06);
          transition: transform 0.28s ease, box-shadow 0.28s ease;
        }

        .glass-card-sm {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.92),
            rgba(255, 255, 255, 0.9)
          );
          border-radius: 12px;
          border: 1px solid rgba(240, 240, 240, 0.9);
          backdrop-filter: blur(6px);
          box-shadow: 0 10px 28px rgba(16, 24, 40, 0.05);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }

        .mini-metric {
          box-shadow: none;
        }

        .small-card {
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }

        .small-card:hover,
        .mini-metric:hover {
          transform: translateY(-6px);
          box-shadow: 0 10px 30px rgba(16, 24, 40, 0.06);
        }

        @media (max-width: 991px) {
          .glass-card {
            min-height: unset !important;
          }
          .glass-card-sm {
            min-height: unset !important;
          }
        }
      `}</style>
    </div>
  );
}
