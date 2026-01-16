"use client";

import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";

export function LandingCTAs() {
  const startHref = isAuthenticated() ? "/projects" : "/auth/register";

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
            window.open("/projects/6af7ac1b6254/runs/53e099cdb74e", "_blank");
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
    </section>
  );
}
