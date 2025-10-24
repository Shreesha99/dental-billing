"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Replace with your own credentials
    const ADMIN_USER = process.env.NEXT_PUBLIC_ADMIN_USER || "admin";
    const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || "12345";

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      localStorage.setItem("isAdmin", "true");
      router.push("/admin");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <div className="card shadow-sm p-4" style={{ width: "350px" }}>
        <h4 className="text-center mb-4">Admin Login</h4>
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-danger text-center">{error}</p>}
          <button type="submit" className="btn btn-primary w-100 mt-2">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
