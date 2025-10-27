"use client";

import { useState } from "react";
import { auth, googleProvider, githubProvider } from "../../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

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
    await signInWithPopup(auth, googleProvider);
    router.push("/");
  };

  const handleGithubLogin = async () => {
    await signInWithPopup(auth, githubProvider);
    router.push("/");
  };

  return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100 bg-light">
      <div className="card p-4 shadow-sm" style={{ width: "360px" }}>
        <h4 className="mb-3 text-center">Login to Dental App</h4>

        <input
          className="form-control mb-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="form-control mb-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="btn btn-primary w-100 mb-2"
          onClick={handleEmailLogin}
        >
          Login
        </button>
        <button className="btn btn-secondary w-100 mb-3" onClick={handleSignup}>
          Sign Up
        </button>

        <hr />

        <button
          className="btn btn-outline-danger w-100 mb-2"
          onClick={handleGoogleLogin}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
