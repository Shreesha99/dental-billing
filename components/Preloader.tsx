"use client";

import { useEffect, useState } from "react";

export default function Preloader() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center bg-white"
      style={{ zIndex: 9999 }}
    >
      <svg width="50" height="50" viewBox="0 0 50 50" className="mb-3">
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke="#2575fc"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-primary fw-bold">Loading...</p>
    </div>
  );
}
