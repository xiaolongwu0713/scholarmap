import Link from "next/link";
import { LandingNavbarUser } from "@/components/landing/LandingNavbarUser";

export function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex flex-col items-center">
            <Link href="/" style={{ textDecoration: "none" }}>
              <div className="flex items-center gap-2 cursor-pointer">
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
                <span className="text-xl font-semibold" style={{ color: "#111827" }}>
                  ScholarMap
                </span>
              </div>
            </Link>
            <span className="text-xs sm:text-sm font-semibold text-emerald-600 text-center">
              For Biomedical and Life Sciences Research
            </span>
          </div>

          <div className="flex items-center gap-6 md:gap-10">
            <a
              href="#what-it-is"
              className="text-sm md:text-base px-4 py-2 rounded-lg font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
            >
              What It Is
            </a>
            <a
              href="#what-you-can-do"
              className="text-sm md:text-base px-4 py-2 rounded-lg font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
            >
              Who It's For
            </a>
            <a
              href="#how-it-works"
              className="text-sm md:text-base px-4 py-2 rounded-lg font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
            >
              How It Works
            </a>
            <a
              href="#contact"
              className="text-sm md:text-base px-4 py-2 rounded-lg font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
            >
              Contact
            </a>
          </div>

          <LandingNavbarUser />
        </div>
      </div>
    </nav>
  );
}
