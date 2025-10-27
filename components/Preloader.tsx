"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const preloaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const toothPath = svgRef.current?.querySelector("path");

    if (toothPath) {
      const length = toothPath.getTotalLength();
      gsap.set(toothPath, {
        strokeDasharray: length,
        strokeDashoffset: length,
      });

      // Animate tooth outline
      gsap.to(toothPath, {
        strokeDashoffset: 0,
        duration: 3,
        ease: "power2.inOut",
      });
    }

    // Animate percentage counter
    gsap.to(
      {},
      {
        duration: 3,
        onUpdate: function () {
          const newProgress = Math.round(this.progress() * 100);
          setProgress(newProgress);
        },
        onComplete: () => {
          // Fade out preloader
          gsap.to(preloaderRef.current, {
            opacity: 0,
            duration: 1,
            delay: 0.5,
            onComplete: () => {
              preloaderRef.current?.remove();
            },
          });
        },
      }
    );
  }, []);

  return (
    <div
      ref={preloaderRef}
      className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white z-3"
      style={{ transition: "opacity 0.6s ease" }}
    >
      <svg
        ref={svgRef}
        width="120"
        height="120"
        viewBox="0 0 64 64"
        fill="none"
        stroke="#0d6efd"
        strokeWidth="2.5"
      >
        {/* Simple tooth outline */}
        <path
          d="M32 2 C22 2 12 12 12 24 C12 38 20 62 28 62 C30 62 32 58 32 54 C32 58 34 62 36 62 C44 62 52 38 52 24 C52 12 42 2 32 2 Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <h5 className="mt-3 fw-semibold text-primary">{progress}%</h5>
    </div>
  );
}
