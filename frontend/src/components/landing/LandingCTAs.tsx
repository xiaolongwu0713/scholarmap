"use client";

import { DEMO_RUN_PATH, PLANS } from '@/lib/site';
import Link from "next/link";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";

export function LandingCTAs() {
  // Decided after mount: the server can't see the login token, and React doesn't
  // patch a mismatched href, so logged-in users were sent to the register page.
  const [startHref, setStartHref] = useState("/auth/register");
  useEffect(() => {
    if (isAuthenticated()) setStartHref("/projects");
  }, []);

  return (
    <section style={{ paddingBottom: "4rem", backgroundColor: "white" }}>
      <div style={{ display: "flex", flexDirection: "row", gap: "16px", justifyContent: "center", alignItems: "center" }}>
        <Link href={startHref}>
          <button
            className="group"
            style={{
              fontSize: "16px",
              padding: "12px 28px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            Get Started
            <svg
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </Link>
        <button
          className="group"
          style={{
            fontSize: "16px",
            padding: "12px 28px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
          onClick={() => {
            window.open(DEMO_RUN_PATH, "_blank");
          }}
        >
          Try Demo
          <svg
            className="w-5 h-5 group-hover:translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      </div>
      <p style={{ textAlign: "center", marginTop: "1rem", color: "#64748b", fontSize: "0.95rem", padding: "0 1rem" }}>
        Free to start with {PLANS.free.searchesPerWeek} searches a week. Applying this season?{" "}
        <Link href="/pricing" style={{ color: "#2563eb", fontWeight: 600 }}>
          Pro is ${PLANS.pro.quarterlyPrice} for 3 months
        </Link>
        .
      </p>
    </section>
  );
}
