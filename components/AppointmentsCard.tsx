"use client";

import { useEffect, useState } from "react";
import { getAppointments, AppointmentData } from "../lib/firebase";
import Image from "next/image";

export default function AppointmentsCard() {
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const data = await getAppointments();
        setAppointments(data);
      } catch (error) {
        console.error("Error fetching appointments:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAppointments();
  }, []);

  // Filter appointments for selected day
  const filteredAppointments = appointments.filter((a) => {
    const apptDate = new Date(a.start);
    return apptDate.toDateString() === selectedDate.toDateString();
  });

  // Generate week days dynamically (Mon–Fri)
  const getWeekDays = () => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  return (
    <div className="card border-0 shadow-sm rounded-4 appointments-card">
      <div className="card-body">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-semibold mb-0">Appointments</h5>
          <a
            href="#"
            className="text-decoration-none text-primary fw-semibold small"
          >
            View All
          </a>
        </div>

        {/* Month Selector */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(selectedDate.getMonth() - 1);
              setSelectedDate(newDate);
            }}
          >
            &lt;
          </button>
          <span className="fw-semibold">
            {selectedDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(selectedDate.getMonth() + 1);
              setSelectedDate(newDate);
            }}
          >
            &gt;
          </button>
        </div>

        {/* Weekday Carousel */}
        <div className="d-flex justify-content-between mb-3 overflow-auto week-scroll">
          {getWeekDays().map((day) => {
            const isActive = day.toDateString() === selectedDate.toDateString();
            return (
              <button
                key={day.toDateString()}
                className={`btn btn-sm rounded-3 px-3 py-2 ${
                  isActive
                    ? "btn-primary text-white"
                    : "btn-light text-dark border"
                }`}
                onClick={() => setSelectedDate(day)}
              >
                <div className="small fw-semibold">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div>{day.getDate()}</div>
              </button>
            );
          })}
        </div>

        {/* Appointment Cards */}
        {loading ? (
          <p className="text-muted small">Loading appointments...</p>
        ) : filteredAppointments.length === 0 ? (
          <p className="text-muted small">No appointments for this date.</p>
        ) : (
          filteredAppointments.map((appt) => (
            <div
              key={appt.id}
              className="appointment-item mb-3 p-3 rounded-3 shadow-sm bg-white"
            >
              <div className="d-flex align-items-center mb-2">
                <Image
                  src="/doctor-avatar.png"
                  alt={appt.patientName}
                  width={36}
                  height={36}
                  className="rounded-circle me-2"
                />
                <div>
                  <h6 className="mb-0 fw-semibold">{appt.type}</h6>
                  <small className="text-muted">{appt.patientName}</small>
                </div>
              </div>
              <p className="text-muted mb-2 small">{appt.description}</p>
              <div className="text-primary small">
                <i className="bi bi-calendar-event me-1"></i>
                {new Date(appt.start).toLocaleString("en-GB", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
