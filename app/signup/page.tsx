"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db, googleProvider } from "../../lib/firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  Google,
  EnvelopeFill,
  LockFill,
  PersonFill,
} from "react-bootstrap-icons";
import gsap from "gsap";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 50, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 1, ease: "power3.out" }
    );
  }, []);

  // ✅ Handle Email Signup
  const handleSignup = async () => {
    setError("");

    if (!email || !password || !name) {
      setError("Please fill all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCred.user;

      await updateProfile(user, { displayName: name });

      // ✅ Store user in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        createdAt: serverTimestamp(),
      });

      router.push("/");
    } catch (e: any) {
      console.error(e);
      switch (e.code) {
        case "auth/email-already-in-use":
          setError("This email is already registered. Please log in instead.");
          break;
        case "auth/invalid-email":
          setError("Invalid email address format.");
          break;
        case "auth/weak-password":
          setError(
            "Password too weak. Try a mix of letters, numbers, and symbols."
          );
          break;
        default:
          setError("Signup failed. Please try again.");
      }
    }
  };

  // ✅ Handle Google Signup
  const handleGoogleSignup = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

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
    } catch (e: any) {
      setError("Google signup failed. Please try again.");
    }
  };

  return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100 bg-light">
      <div
        ref={cardRef}
        className="card shadow-lg p-4 border-0"
        style={{
          width: "400px",
          borderRadius: "20px",
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
        }}
      >
        <h3 className="text-center mb-3 fw-bold text-primary">
          🦷 Create Account
        </h3>

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
          />
        </div>

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
          />
        </div>

        <div className="mb-2 position-relative">
          <LockFill
            size={18}
            className="text-secondary position-absolute top-50 start-0 translate-middle-y ms-3"
          />
          <input
            type="password"
            className="form-control ps-5 py-2"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ borderRadius: "10px" }}
          />
        </div>

        {/* Password Rules + Error */}
        <div className="text-muted small mb-2">
          Password must be at least <strong>6 characters</strong> and include a
          mix of <strong>letters</strong> and <strong>numbers</strong>.
        </div>
        {error && <div className="text-danger small mb-3">{error}</div>}

        <button
          onClick={handleSignup}
          className="btn btn-primary w-100 mb-2 fw-semibold py-2"
          style={{ borderRadius: "10px" }}
        >
          Sign Up
        </button>

        <div className="text-center mb-3 text-muted">or</div>

        <button
          onClick={handleGoogleSignup}
          className="btn btn-light border w-100 d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm"
          style={{ borderRadius: "10px" }}
        >
          <Google color="#DB4437" size={20} />
          <span className="fw-semibold text-dark">Sign up with Google</span>
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
