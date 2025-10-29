"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, googleProvider } from "../../lib/firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { setDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import {
  Google,
  EnvelopeFill,
  LockFill,
  PersonFill,
  ExclamationTriangleFill,
  Eye,
  EyeSlash,
} from "react-bootstrap-icons";
import gsap from "gsap";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    label: string;
    color: string;
  }>({ label: "", color: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 50, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 1, ease: "power3.out" }
    );
  }, []);

  // ✅ Centralized Error Handler
  const handleFirebaseError = (code: string) => {
    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please log in instead.";
      case "auth/invalid-email":
        return "Invalid email format. Please check and try again.";
      case "auth/weak-password":
        return "Password too weak. Try using at least 6 characters.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection and try again.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a few minutes before trying again.";
      case "auth/internal-error":
        return "Unexpected error. Please try again later.";
      case "auth/popup-closed-by-user":
        return "Signup cancelled. Please complete the Google login.";
      case "auth/cancelled-popup-request":
        return "Another sign-in process is ongoing. Please try again.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  // ✅ Password Strength Checker
  const evaluatePasswordStrength = (pwd: string) => {
    if (!pwd) return { label: "", color: "" };

    let score = 0;
    if (pwd.length >= 6) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    switch (score) {
      case 0:
      case 1:
        return { label: "Weak", color: "text-danger" };
      case 2:
        return { label: "Moderate", color: "text-warning" };
      case 3:
      case 4:
        return { label: "Strong", color: "text-success" };
      default:
        return { label: "", color: "" };
    }
  };

  // ✅ Email/Password Signup
  const handleSignup = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill all the required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      // Check if email already exists
      const existingMethods = await fetchSignInMethodsForEmail(auth, email);
      if (existingMethods.length > 0) {
        setError("This email is already registered. Please log in instead.");
        setLoading(false);
        return;
      }

      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCred.user;
      await updateProfile(user, { displayName: name });

      // Save user info
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        createdAt: serverTimestamp(),
      });

      router.push("/");
    } catch (err: any) {
      console.error("Signup Error:", err);
      setError(handleFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  // ✅ Google Signup
  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        router.push("/");
        return;
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          name: user.displayName,
          email: user.email,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      router.push("/");
    } catch (err: any) {
      console.error("Google Signup Error:", err);
      setError(handleFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  // ✅ Update strength dynamically
  useEffect(() => {
    setPasswordStrength(evaluatePasswordStrength(password));
  }, [password]);

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
          🦷 Create Account
        </h3>

        {/* Name */}
        <div className="mb-3 position-relative">
          <PersonFill
            size={18}
            className="text-secondary position-absolute top-50 start-0 translate-middle-y ms-3"
          />
          <input
            type="text"
            className="form-control ps-5 py-2"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ borderRadius: "10px" }}
            disabled={loading}
          />
        </div>

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

        {/* Password + Eye + Strength */}
        <div className="mb-2 position-relative">
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
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
            }}
          >
            {showPassword ? (
              <EyeSlash size={18} className="text-secondary" />
            ) : (
              <Eye size={18} className="text-secondary" />
            )}
          </span>
        </div>

        {/* Password Strength */}
        {password && (
          <div className={`small fw-semibold mb-2 ${passwordStrength.color}`}>
            Password strength: {passwordStrength.label}
          </div>
        )}

        {error && (
          <div
            className="alert alert-danger d-flex align-items-center py-2 px-3 mb-3"
            style={{ borderRadius: "10px" }}
          >
            <ExclamationTriangleFill className="me-2" size={18} />
            <div className="small">{error}</div>
          </div>
        )}

        <button
          onClick={handleSignup}
          className="btn btn-primary w-100 mb-2 fw-semibold py-2"
          style={{ borderRadius: "10px" }}
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>

        <div className="text-center mb-3 text-muted">or</div>

        <button
          onClick={handleGoogleSignup}
          className="btn btn-light border w-100 d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm"
          style={{ borderRadius: "10px" }}
          disabled={loading}
        >
          <Google color="#DB4437" size={20} />
          <span className="fw-semibold text-dark">
            {loading ? "Please wait..." : "Sign up with Google"}
          </span>
        </button>

        <div className="text-center mt-3">
          <small>
            Already have an account?{" "}
            <a href="/login" className="text-primary fw-semibold">
              Login here
            </a>
          </small>
        </div>
      </div>
    </div>
  );
}
