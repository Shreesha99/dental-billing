"use client";

import React from "react";

export default function LandingPage() {
  return (
    <div
      className="d-flex flex-column justify-content-center align-items-center text-center"
      style={{
        minHeight: "80vh",
        background: "linear-gradient(to right, #6a11cb, #2575fc)",
        color: "white",
        padding: "2rem",
        borderRadius: "1rem",
      }}
    >
      {/* Optional Icon */}
      <div className="mb-4">
        <img src="/logo.png" alt="Clinic Icon" width={200} height={200} />
      </div>

      <h1 className="display-4 fw-bold mb-3">
        Welcome to Dentist Billing System
      </h1>
      <p className="lead mb-4">
        Simplifying your clinic billing and payments with ease and speed.
      </p>

      {/* Buttons */}
      <div className="d-flex gap-3 flex-wrap justify-content-center">
        <a
          href="/create-bill"
          className="btn btn-outline-light btn-lg fw-bold shadow-sm"
        >
          + Create Bill
        </a>
      </div>
    </div>
  );
}
