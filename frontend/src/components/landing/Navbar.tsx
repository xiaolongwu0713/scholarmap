"use client";

import Link from "next/link";
import { useState } from "react";

export function Navbar() {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  const linkStyle = (linkName: string) => ({
    fontSize: "16px",
    padding: "8px 16px",
    borderRadius: "8px",
    fontWeight: "500",
    backgroundColor: hoveredLink === linkName ? "#eff6ff" : "transparent",
    color: hoveredLink === linkName ? "#2563eb" : "#374151",
    transition: "all 0.2s ease"
  });

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xl font-semibold">ScholarMap</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-6 md:gap-10">
            <a
              href="#about"
              style={linkStyle("about")}
              onMouseEnter={() => setHoveredLink("about")}
              onMouseLeave={() => setHoveredLink(null)}
            >
              About
            </a>
            <a
              href="#features"
              style={linkStyle("features")}
              onMouseEnter={() => setHoveredLink("features")}
              onMouseLeave={() => setHoveredLink(null)}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              style={linkStyle("how-it-works")}
              onMouseEnter={() => setHoveredLink("how-it-works")}
              onMouseLeave={() => setHoveredLink(null)}
            >
              How It Works
            </a>
            <a
              href="#contact"
              style={linkStyle("contact")}
              onMouseEnter={() => setHoveredLink("contact")}
              onMouseLeave={() => setHoveredLink(null)}
            >
              Contact
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <button 
                className="secondary" 
                style={{ 
                  padding: "8px 20px", 
                  fontSize: "14px",
                  borderRadius: "8px"
                }}
              >
                Sign In
              </button>
            </Link>
          </div>
        </div>

      </div>
    </nav>
  );
}

