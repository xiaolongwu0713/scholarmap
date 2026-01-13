"use client";

export function WhatItIs() {
  const useCases = [
    {
      icon: (
        <svg style={{ width: "48px", height: "48px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Explore Dream Destinations",
      description: "Discover research hotspots in your dream country or city. Find out which institutions are leading in your field and visualize the global distribution of expertise.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: (
        <svg style={{ width: "48px", height: "48px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: "Find Postdoc Positions",
      description: "Search for postdoc opportunities by exploring active research groups worldwide. Identify labs with recent publications and strong collaboration networks in your research area.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: (
        <svg style={{ width: "48px", height: "48px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      title: "Apply for PhD Programs",
      description: "Research potential PhD supervisors and programs. Map out which universities have strong research output in your field and discover emerging research trends.",
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: (
        <svg style={{ width: "48px", height: "48px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Identify Collaborators",
      description: "Find potential research collaborators by exploring who's working on similar topics. Visualize global research networks and discover cross-institutional partnerships.",
      gradient: "from-green-500 to-teal-500"
    },
    {
      icon: (
        <svg style={{ width: "48px", height: "48px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Analyze Research Trends",
      description: "Understand research landscapes and emerging trends in your field. See which countries and institutions are leading in specific research areas over time.",
      gradient: "from-indigo-500 to-purple-500"
    },
    {
      icon: (
        <svg style={{ width: "48px", height: "48px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Discover Funding Opportunities",
      description: "Identify regions with active research funding by analyzing publication patterns. Find institutions and countries investing heavily in your research domain.",
      gradient: "from-yellow-500 to-orange-500"
    }
  ];

  return (
    <section id="what-it-is" style={{ paddingTop: "6rem", paddingBottom: "6rem", backgroundColor: "white", scrollMarginTop: "80px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingLeft: "1rem", paddingRight: "1rem" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h2 
            style={{ 
              fontSize: "3rem", 
              fontWeight: "700", 
              marginBottom: "1rem",
              background: "linear-gradient(to right, #2563eb, #9333ea)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            What Can You Do with ScholarMap?
          </h2>
          <p style={{ fontSize: "1.25rem", color: "#4b5563", maxWidth: "48rem", margin: "0 auto" }}>
            From career planning to research discovery, ScholarMap helps you make informed decisions
          </p>
        </div>

        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", 
          gap: "2rem"
        }}>
          {useCases.map((useCase, index) => (
            <div
              key={index}
              style={{
                backgroundColor: "white",
                borderRadius: "1rem",
                border: "1px solid #e5e7eb",
                padding: "2rem",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1)";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div 
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "1rem",
                  background: `linear-gradient(to right, ${useCase.gradient.split(' ')[1]}, ${useCase.gradient.split(' ')[3]})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  marginBottom: "1.5rem"
                }}
              >
                {useCase.icon}
              </div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "#111827" }}>
                {useCase.title}
              </h3>
              <p style={{ fontSize: "1rem", color: "#6b7280", lineHeight: "1.625" }}>
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

