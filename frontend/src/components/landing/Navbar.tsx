"use client";

import Link from "next/link";

export function Navbar() {
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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-gray-700 hover:text-blue-600 transition-colors"
              style={{ fontSize: "15px" }}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-gray-700 hover:text-blue-600 transition-colors"
              style={{ fontSize: "15px" }}
            >
              How It Works
            </a>
            <a
              href="#about"
              className="text-gray-700 hover:text-blue-600 transition-colors"
              style={{ fontSize: "15px" }}
            >
              About
            </a>
            <a
              href="#contact"
              className="text-gray-700 hover:text-blue-600 transition-colors"
              style={{ fontSize: "15px" }}
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

