"use client";

import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-3 bg-blue-100 text-blue-700 px-5 py-2 rounded-full" style={{ fontSize: "16px" }}>
          <svg
            style={{ width: "20px", height: "20px" }}
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
          <span>AI-Powered Research Mapping</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
          Discover Global Research
          <br />
          Distribution in 3D
        </h1>

        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Visualize the global distribution of scholars and research papers on an
          interactive 3D map. Powered by advanced LLM technology to understand
          your research queries and map academic networks worldwide.
        </p>

        <div style={{ display: "flex", flexDirection: "row", gap: "16px", justifyContent: "center", alignItems: "center", marginBottom: "4rem" }}>
          <Link href="/auth/register">
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
            className="secondary"
            style={{ fontSize: "16px", padding: "12px 28px" }}
            onClick={() => {
              // Open demo run in new tab
              window.open("/projects/6af7ac1b6254/runs/53e099cdb74e", "_blank");
            }}
          >
            Watch Demo
          </button>
        </div>

        {/* Hero Image/Visual */}
        <div className="relative max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
            <img
              src="/landing_page_figures/0.png"
              alt="Global research network visualization"
              className="w-full h-auto"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}

