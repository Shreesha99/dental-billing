"use client";

import { useEffect, useRef, useState } from "react";
import { auth, googleProvider } from "../../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { Google, EnvelopeFill, LockFill } from "react-bootstrap-icons";
import gsap from "gsap";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 50, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 1, ease: "power3.out" }
    );
  }, []);

  const handleEmailLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (e) {
      alert("Login failed: " + (e as Error).message);
    }
  };

  const handleSignup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (e) {
      alert("Signup failed: " + (e as Error).message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/");
    } catch (e) {
      alert("Google login failed: " + (e as Error).message);
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
          🦷 Dental Care Login
        </h3>

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

        <div className="mb-3 position-relative">
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

        <button
          onClick={handleEmailLogin}
          className="btn btn-primary w-100 mb-2 fw-semibold py-2"
          style={{ borderRadius: "10px" }}
        >
          Login
        </button>

        <div className="text-center mb-3 text-muted">or</div>

        <button
          onClick={handleGoogleLogin}
          className="btn btn-light border w-100 d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm"
          style={{ borderRadius: "10px" }}
        >
          <Google color="#DB4437" size={20} />
          <span className="fw-semibold text-dark">Continue with Google</span>
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
