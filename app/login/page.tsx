"use client";

import { useEffect, useRef, useState } from "react";
import { auth, googleProvider } from "../../lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  Google,
  EnvelopeFill,
  LockFill,
  Eye,
  EyeSlash,
  ExclamationTriangleFill,
} from "react-bootstrap-icons";
import gsap from "gsap";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 50, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 1, ease: "power3.out" }
    );
  }, []);

  // ✅ Centralized Firebase Error Handler (same as signup)
  const handleFirebaseError = (code: string) => {
    switch (code) {
      case "auth/invalid-email":
        return "Invalid email format. Please check and try again.";
      case "auth/user-disabled":
        return "This account has been disabled. Contact support.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please wait and try again later.";
      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";
      case "auth/popup-closed-by-user":
        return "Login cancelled. Please complete the Google sign-in.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  // ✅ Handle Email Login
  const handleEmailLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(handleFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Google Login
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/");
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError(handleFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100">
      <div
        ref={cardRef}
        className="card shadow-lg p-4 border-0"
        style={{
          width: "400px",
          borderRadius: "20px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
        }}
      >
        <h3 className="text-center mb-3 fw-bold text-primary">
          🦷 Welcome Back
        </h3>

        {/* Email */}
        <div className="mb-3 position-relative">
          <EnvelopeFill
            size={18}
            className="text-secondary position-absolute top-50 start-0 translate-middle-y ms-3"
          />
          <input
            type="email"
            className="form-control ps-5 py-2"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ borderRadius: "10px" }}
            disabled={loading}
          />
        </div>

        {/* Password */}
        <div className="mb-3 position-relative">
          <LockFill
            size={18}
            className="text-secondary position-absolute top-50 start-0 translate-middle-y ms-3"
          />
          <input
            type={showPassword ? "text" : "password"}
            className="form-control ps-5 pe-5 py-2"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ borderRadius: "10px" }}
            disabled={loading}
          />
          <span
            role="button"
            onClick={() => setShowPassword(!showPassword)}
            className="position-absolute top-50 end-0 translate-middle-y me-3 text-secondary"
          >
            {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
          </span>
        </div>

        {/* Error Alert (Styled same as signup) */}
        {error && (
          <div
            className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3"
            style={{ borderRadius: "10px" }}
          >
            <ExclamationTriangleFill className="me-2" size={18} />
            <div className="small">{error}</div>
          </div>
        )}

        {/* Buttons */}
        <button
          onClick={handleEmailLogin}
          className="btn btn-primary w-100 mb-2 fw-semibold py-2"
          style={{ borderRadius: "10px" }}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="text-center mb-3 text-muted">or</div>

        <button
          onClick={handleGoogleLogin}
          className="btn btn-light border w-100 d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm"
          style={{ borderRadius: "10px" }}
          disabled={loading}
        >
          <Google color="#DB4437" size={20} />
          <span className="fw-semibold text-dark">
            {loading ? "Please wait..." : "Continue with Google"}
          </span>
        </button>

        <div className="text-center mt-3">
          <small>
            Don’t have an account?{" "}
            <Link
              href="/signup"
              className="text-primary fw-semibold text-decoration-none"
            >
              Create one
            </Link>
          </small>
        </div>
      </div>
    </div>
  );
}
