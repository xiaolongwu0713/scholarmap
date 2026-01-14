"use client";

import { useState } from "react";

export function HowItWorks() {
  const [activePhase1Index, setActivePhase1Index] = useState(0);
  const [activePhase2Index, setActivePhase2Index] = useState(0);

  const phase1Cards = [
    {
      image: "/landing_page_figures/1.png",
      title: "Step 1",
      description: "Define your research by iteratively chatting with the system.",
      accent: "#60a5fa",
      accentShadow: "rgba(96, 165, 250, 0.35)"
    },
    {
      image: "/landing_page_figures/2.png",
      title: "Step 2",
      description: "Review the generated retrieval framework and tell the system what to change.",
      accent: "#34d399",
      accentShadow: "rgba(52, 211, 153, 0.35)"
    },
    {
      image: "/landing_page_figures/3.png",
      title: "Step 3",
      description: "Validate the final database queries the system prepares for each source (PubMed / Semantic Scholar / OpenAlex / Web of Science).",
      accent: "#a78bfa",
      accentShadow: "rgba(84, 36, 229, 0.35)"
    },
    {
      image: "/landing_page_figures/4.png",
      title: "Step 4",
      description: "Execute the search and inspect the retrieved papers across databases (PubMed / Semantic Scholar / OpenAlex / Web of Science).",
      accent: "#fbbf24",
      accentShadow: "rgba(251, 191, 36, 0.35)"
    },
    {
      image: "/landing_page_figures/5.png",
      title: "Step 5",
      description: "Process and aggregate author by institution/city/country.",
      accent: "#f472b6",
      accentShadow: "rgba(244, 114, 182, 0.35)"
    }
  ];

  const phase2Cards = [
    {
      image: "/landing_page_figures/6.png",
      title: "Extract",
      description: "Country distribution of scholars.",
      accent: "#38bdf8",
      accentShadow: "rgba(56, 189, 248, 0.35)"
    },
    {
      image: "/landing_page_figures/7.png",
      title: "Geocode",
      description: "City distribution of scholars.",
      accent: "#4ade80",
      accentShadow: "rgba(74, 222, 128, 0.35)"
    },
    {
      image: "/landing_page_figures/8.png",
      title: "Aggregate",
      description: "Institution distribution of scholars.",
      accent: "#f59e0b",
      accentShadow: "rgba(245, 158, 11, 0.35)"
    },
    {
      image: "/landing_page_figures/9.png",
      title: "Visualize",
      description: "List all scholars from one particular institution of interest.",
      accent: "#fb7185",
      accentShadow: "rgba(251, 113, 133, 0.35)"
    }
  ];

  const handlePhase1Prev = () => {
    setActivePhase1Index((prev) => (prev === 0 ? phase1Cards.length - 1 : prev - 1));
  };

  const handlePhase1Next = () => {
    setActivePhase1Index((prev) => (prev === phase1Cards.length - 1 ? 0 : prev + 1));
  };

  const handlePhase2Prev = () => {
    setActivePhase2Index((prev) => (prev === 0 ? phase2Cards.length - 1 : prev - 1));
  };

  const handlePhase2Next = () => {
    setActivePhase2Index((prev) => (prev === phase2Cards.length - 1 ? 0 : prev + 1));
  };

  return (
    <section id="how-it-works" style={{ paddingTop: "6rem", paddingBottom: "6rem", background: "linear-gradient(to bottom right, #f9fafb, #eff6ff)", scrollMarginTop: "80px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingLeft: "1rem", paddingRight: "1rem" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h2 style={{ fontSize: "3rem", fontWeight: "700", marginBottom: "1rem", color: "#111827" }}>
            How It Works
          </h2>
          <p style={{ fontSize: "1.125rem", color: "#4b5563", maxWidth: "48rem", margin: "0 auto" }}>
            From your research question to global visualization in two simple phases
          </p>
        </div>

        {/* Phase 1: Carousel */}
        <div style={{ marginBottom: "4rem" }}>
          {/* Phase Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
            <div style={{ 
              padding: "0.5rem 1.5rem", 
              backgroundColor: "white", 
              border: "2px solid #3b82f6",
              borderRadius: "999px",
              color: "#3b82f6",
              fontWeight: "600",
              fontSize: "1rem"
            }}>
              Phase 1
            </div>
            <div style={{ 
              width: "48px", 
              height: "48px", 
              backgroundColor: "#dbeafe", 
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#3b82f6"
            }}>
              <svg style={{ width: "24px", height: "24px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: "1.875rem", fontWeight: "700", color: "#111827", margin: 0 }}>
                Smart Query & Data Retrieval
              </h3>
              <p style={{ fontSize: "1rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>
                From research description to comprehensive paper collection
              </p>
            </div>
          </div>

          {/* Carousel Container */}
          <div style={{ position: "relative", height: "500px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Left Arrow */}
            <button
              onClick={handlePhase1Prev}
              style={{
                position: "absolute",
                left: "20px",
                zIndex: 100,
                width: "64px",
                height: "64px",
                backgroundColor: "transparent",
                background: "transparent",
                borderRadius: "0",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "none",
                padding: 0,
                lineHeight: 0,
                appearance: "none",
                transition: "all 0.2s",
                color: "#f97316"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <svg style={{ width: "44px", height: "44px" }} fill="none" stroke="#f97316" viewBox="0 0 32 32" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 6l-10 10 10 10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M28 6l-10 10 10 10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 6l-10 10 10 10" />
              </svg>
            </button>

            {/* Cards */}
            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {phase1Cards.map((card, index) => {
                const diff = index - activePhase1Index;
                const absIndex = Math.abs(diff);
                const isActive = index === activePhase1Index;
                
                let scale = 1;
                let translateX = 0;
                let zIndex = 0;
                let opacity = 1;

                if (isActive) {
                  scale = 1;
                  translateX = 0;
                  zIndex = 10;
                  opacity = 1;
                } else if (absIndex === 1) {
                  scale = 0.75;
                  translateX = diff > 0 ? 350 : -350;
                  zIndex = 5;
                  opacity = 0.6;
                } else if (absIndex === 2) {
                  scale = 0.6;
                  translateX = diff > 0 ? 500 : -500;
                  zIndex = 3;
                  opacity = 0.3;
                } else {
                  scale = 0.5;
                  translateX = diff > 0 ? 600 : -600;
                  zIndex = 1;
                  opacity = 0;
                }

                return (
                  <div
                    key={index}
                    style={{
                      position: "absolute",
                      width: "600px",
                      height: "400px",
                      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                      transform: `translateX(${translateX}px) scale(${scale})`,
                      zIndex: zIndex,
                      opacity: opacity,
                      cursor: isActive ? "default" : "pointer"
                    }}
                    onClick={() => !isActive && setActivePhase1Index(index)}
                  >
                    <div style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: "white",
                      borderRadius: "1rem",
                      overflow: "hidden",
                      boxShadow: isActive ? `0 20px 30px -12px ${card.accentShadow}` : `0 10px 16px -14px ${card.accentShadow}`,
                      border: `1px solid ${card.accent}`
                    }}>
                      <img
                        src={card.image}
                        alt={card.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain"
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Arrow */}
            <button
              onClick={handlePhase1Next}
              style={{
                position: "absolute",
                right: "20px",
                zIndex: 100,
                width: "64px",
                height: "64px",
                backgroundColor: "transparent",
                background: "transparent",
                borderRadius: "0",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "none",
                padding: 0,
                lineHeight: 0,
                appearance: "none",
                transition: "all 0.2s",
                color: "#f97316"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <svg style={{ width: "44px", height: "44px" }} fill="none" stroke="#f97316" viewBox="0 0 32 32" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l10 10-10 10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l10 10-10 10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 6l10 10-10 10" />
              </svg>
            </button>

            {/* Caption */}
            <div style={{
              position: "absolute",
              bottom: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 100,
              width: "calc(100% - 220px)",
              maxWidth: "780px"
            }}>
              <div style={{
                backgroundColor: "white",
                borderRadius: "999px",
                border: "1px solid #bfdbfe",
                padding: "14px 24px",
                fontSize: "1.25rem",
                fontWeight: "700",
                color: "#940ce3",
                textAlign: "center",
                boxShadow: "0 6px 12px rgba(0,0,0,0.08)"
              }}>
                {phase1Cards[activePhase1Index].description}
              </div>
            </div>
          </div>
        </div>

        {/* Phase 2: Carousel */}
        <div style={{ marginBottom: "4rem" }}>
          {/* Phase Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
            <div style={{ 
              padding: "0.5rem 1.5rem", 
              backgroundColor: "white", 
              border: "2px solid #3b82f6",
              borderRadius: "999px",
              color: "#3b82f6",
              fontWeight: "600",
              fontSize: "1rem"
            }}>
              Phase 2
            </div>
            <div style={{ 
              width: "48px", 
              height: "48px", 
              backgroundColor: "#dbeafe", 
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#3b82f6"
            }}>
              <svg style={{ width: "24px", height: "24px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: "1.875rem", fontWeight: "700", color: "#111827", margin: 0 }}>
                Geographic Analysis & Visualization
              </h3>
              <p style={{ fontSize: "1rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>
                From paper collection to interactive global map
              </p>
            </div>
          </div>

          {/* Carousel Container */}
          <div style={{ position: "relative", height: "500px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Left Arrow */}
            <button
              onClick={handlePhase2Prev}
              style={{
                position: "absolute",
                left: "20px",
                zIndex: 100,
                width: "64px",
                height: "64px",
                backgroundColor: "transparent",
                background: "transparent",
                borderRadius: "0",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "none",
                padding: 0,
                lineHeight: 0,
                appearance: "none",
                transition: "all 0.2s",
                color: "#f97316"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <svg style={{ width: "44px", height: "44px" }} fill="none" stroke="#f97316" viewBox="0 0 32 32" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 6l-10 10 10 10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M28 6l-10 10 10 10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 6l-10 10 10 10" />
              </svg>
            </button>

            {/* Cards */}
            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {phase2Cards.map((card, index) => {
                const diff = index - activePhase2Index;
                const absIndex = Math.abs(diff);
                const isActive = index === activePhase2Index;
                
                let scale = 1;
                let translateX = 0;
                let zIndex = 0;
                let opacity = 1;

                if (isActive) {
                  scale = 1;
                  translateX = 0;
                  zIndex = 10;
                  opacity = 1;
                } else if (absIndex === 1) {
                  scale = 0.75;
                  translateX = diff > 0 ? 350 : -350;
                  zIndex = 5;
                  opacity = 0.6;
                } else if (absIndex === 2) {
                  scale = 0.6;
                  translateX = diff > 0 ? 500 : -500;
                  zIndex = 3;
                  opacity = 0.3;
                } else {
                  scale = 0.5;
                  translateX = diff > 0 ? 600 : -600;
                  zIndex = 1;
                  opacity = 0;
                }

                return (
                  <div
                    key={index}
                    style={{
                      position: "absolute",
                      width: "600px",
                      height: "400px",
                      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                      transform: `translateX(${translateX}px) scale(${scale})`,
                      zIndex: zIndex,
                      opacity: opacity,
                      cursor: isActive ? "default" : "pointer"
                    }}
                    onClick={() => !isActive && setActivePhase2Index(index)}
                  >
                    <div style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: "white",
                      borderRadius: "1rem",
                      overflow: "hidden",
                      boxShadow: isActive ? `0 20px 30px -12px ${card.accentShadow}` : `0 10px 16px -14px ${card.accentShadow}`,
                      border: `1px solid ${card.accent}`
                    }}>
                      <img
                        src={card.image}
                        alt={card.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain"
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Arrow */}
            <button
              onClick={handlePhase2Next}
              style={{
                position: "absolute",
                right: "20px",
                zIndex: 100,
                width: "64px",
                height: "64px",
                backgroundColor: "transparent",
                background: "transparent",
                borderRadius: "0",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "none",
                padding: 0,
                lineHeight: 0,
                appearance: "none",
                transition: "all 0.2s",
                color: "#f97316"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <svg style={{ width: "44px", height: "44px" }} fill="none" stroke="#f97316" viewBox="0 0 32 32" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l10 10-10 10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l10 10-10 10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 6l10 10-10 10" />
              </svg>
            </button>

            {/* Caption */}
            <div style={{
              position: "absolute",
              bottom: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 100,
              width: "calc(100% - 220px)",
              maxWidth: "780px"
            }}>
              <div style={{
                backgroundColor: "white",
                borderRadius: "999px",
                border: "1px solid #bfdbfe",
                padding: "14px 24px",
                fontSize: "1.25rem",
                fontWeight: "700",
                color: "#940ce3",
                textAlign: "center",
                boxShadow: "0 6px 12px rgba(0,0,0,0.08)"
              }}>
                {phase2Cards[activePhase2Index].description}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
