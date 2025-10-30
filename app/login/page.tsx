"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db, googleProvider } from "../../lib/firebase";
import {
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
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
import { doc, getDoc, setDoc } from "firebase/firestore";

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

  // ✅ Centralized Firebase Error Handler
  const handleFirebaseError = (code?: string, fallback?: string) => {
    switch (code) {
      case "auth/invalid-email":
        return "Invalid email format. Please check and try again.";
      case "auth/user-disabled":
        return "This account has been disabled. Contact support.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/invalid-credential":
        return "Invalid email or password. Please double-check your credentials.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please wait a few minutes and try again.";
      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";
      case "auth/popup-closed-by-user":
        return "Login cancelled. Please complete the Google sign-in.";
      case "auth/popup-blocked":
        return "Your browser blocked the sign-in popup. Please allow popups and retry.";
      case "auth/cancelled-popup-request":
        return "Another sign-in popup was opened. Please try again.";
      case "auth/internal-error":
        return "Unexpected error occurred. Please try again.";
      default:
        if (fallback?.includes("auth/"))
          return "Something went wrong. Please try again.";
        return fallback || "Unexpected error. Please try again.";
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
      // Step 1: Check sign-in methods for this email
      const methods = await fetchSignInMethodsForEmail(auth, email);
      console.log("Sign-in methods for", email, ":", methods);

      // Step 2: If the email is linked only to Google, show friendly message
      if (methods.includes("google.com") && !methods.includes("password")) {
        setError(
          "This email is registered with Google. Please use 'Continue with Google' to sign in."
        );
        setLoading(false);
        return;
      }

      // Step 3: Ensure we are signed out before attempting login
      await signOut(auth);

      // Step 4: Attempt password login
      await signInWithEmailAndPassword(auth, email, password);

      // Step 5: Redirect to dashboard
      router.push("/");
    } catch (err: any) {
      console.error("❌ [handleEmailLogin] Error:", err);
      setError(handleFirebaseError(err.code, err.message));
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Google Login (auto-create dentist if not found)
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      await signOut(auth);

      // Step 1: Login with Google
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const dentistId = user.uid;

      // Step 2: Check if dentist exists in Firestore
      const dentistRef = doc(db, "dentists", dentistId);
      const snap = await getDoc(dentistRef);

      if (!snap.exists()) {
        // Step 3: Create dentist entry for first-time Google login
        await setDoc(dentistRef, {
          name: user.displayName || "New Dentist",
          email: user.email || "",
          photoURL: user.photoURL || "",
          createdAt: new Date(),
          clinicProfile: {
            clinicName: "",
            operatingHours: "",
            dentists: [],
          },
        });
      }

      localStorage.setItem("dentistId", dentistId);
      router.push("/");
    } catch (err: any) {
      console.error("❌ [GoogleLogin] Error:", err);
      const friendly = handleFirebaseError(err.code, err.message);

      if (
        err.code === "auth/popup-closed-by-user" ||
        err.message?.includes("popup")
      ) {
        setError("You closed the sign-in window. Please try again.");
      } else {
        setError(friendly);
      }
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
            name="email"
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
            name="password"
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

        {/* Error Alert */}
        {error && (
          <div
            className="alert alert-danger fade show d-flex align-items-center py-2 px-3 mb-3"
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
