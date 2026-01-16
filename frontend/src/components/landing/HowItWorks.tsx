"use client";

import { useEffect, useState } from "react";
import { getConfig } from "@/lib/parseConfig";
import Image from "next/image";

export function HowItWorks() {
  const [simpleMode, setSimpleMode] = useState(false);
  const [activePhase1Index, setActivePhase1Index] = useState(0);
  const [activePhase2Index, setActivePhase2Index] = useState(0);

  useEffect(() => {
    getConfig()
      .then((cfg) => setSimpleMode(cfg.simple_how_it_works))
      .catch(() => setSimpleMode(false));
  }, []);

  const phase1Cards = [
    {
      image: "/landing_page_figures_optimized/1-md.webp",
      title: "Step 1",
      description: "Step 1: Define Your Research by Chatting With the System.",
      accent: "#60a5fa",
      accentShadow: "rgba(96, 165, 250, 0.35)"
    },
    {
      image: "/landing_page_figures_optimized/2-md.webp",
      title: "Step 2",
      description: "Step 2: Review the Generated Retrieval Framework.",
      accent: "#34d399",
      accentShadow: "rgba(52, 211, 153, 0.35)"
    },
    {
      image: "/landing_page_figures_optimized/3-md.webp",
      title: "Step 3",
      description: "Step 3: Review the Generated Database Queries (PubMed / Web of Science).",
      accent: "#a78bfa",
      accentShadow: "rgba(84, 36, 229, 0.35)"
    },
    {
      image: "/landing_page_figures_optimized/4-md.webp",
      title: "Step 4",
      description: "Step 4: Query the Databases.",
      accent: "#fbbf24",
      accentShadow: "rgba(251, 191, 36, 0.35)"
    },
    {
      image: "/landing_page_figures_optimized/5-md.webp",
      title: "Step 5",
      description: "Step 5: Process and Aggregate Author by Institution/City/Country.",
      accent: "#f472b6",
      accentShadow: "rgba(244, 114, 182, 0.35)"
    }
  ];

  const phase2Cards = [
    {
      image: "/landing_page_figures_optimized/6-md.webp",
      title: "Extract",
      description: "Option 1: Country Distribution of Scholars.",
      accent: "#38bdf8",
      accentShadow: "rgba(56, 189, 248, 0.35)"
    },
    {
      image: "/landing_page_figures_optimized/7-md.webp",
      title: "Geocode",
      description: "Option 2: City Distribution of Scholars.",
      accent: "#4ade80",
      accentShadow: "rgba(74, 222, 128, 0.35)"
    },
    {
      image: "/landing_page_figures_optimized/8-md.webp",
      title: "Aggregate",
      description: "Option 3: Institution Distribution of Scholars.",
      accent: "#f59e0b",
      accentShadow: "rgba(245, 158, 11, 0.35)"
    },
    {
      image: "/landing_page_figures_optimized/9-md.webp",
      title: "Visualize",
      description: "Option 4: Scholars List From an Institution of Interest.",
      accent: "#fb7185",
      accentShadow: "rgba(251, 113, 133, 0.35)"
    }
  ];

  const simpleCards = [
    {
      image: "/landing_page_figures_optimized/1-md.webp",
      description: "Step 1 – Describe your research in natural language."
    },
    {
      image: "/landing_page_figures_optimized/5-md.webp",
      description: "Step 2 – Map the global landscape by grouped scholars by country, city, and institution."
    },
    {
      image: "/landing_page_figures_optimized/6-md.webp",
      description: "Step 3 – Explore & decide. Compare locations, find collaborators, and plan your next move."
    }
  ];
  const exploreCards = [
    { image: "/landing_page_figures_optimized/6-md.webp" },
    { image: "/landing_page_figures_optimized/7-md.webp" },
    { image: "/landing_page_figures_optimized/8-md.webp" },
    { image: "/landing_page_figures_optimized/9-md.webp" }
  ];
  const [activeExploreIndex, setActiveExploreIndex] = useState(0);

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

  if (simpleMode) {
    return (
      <section
        id="how-it-works"
        style={{
          paddingTop: "6rem",
          paddingBottom: "6rem",
          background: "linear-gradient(to bottom right, #f9fafb, #eff6ff)",
          scrollMarginTop: "80px"
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto", paddingLeft: "1rem", paddingRight: "1rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "3rem", fontWeight: "700", marginBottom: "0.75rem", color: "#111827" }}>
              How It Works
            </h2>
            <p style={{ color: "#64748b", fontSize: "1.05rem" }}>
              Three clear steps to go from idea to action.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {simpleCards.slice(0, 2).map((card, index) => (
              <div
                key={card.image}
                style={{
                  padding: "28px",
                  borderRadius: "24px",
                  border: "1px solid #e5e7eb",
                  background: "white",
                  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)"
                }}
              >
                <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "#0f172a", textAlign: "center", marginBottom: "18px" }}>
                  {card.description}
                </div>
                <div
                  style={{
                    width: "100%",
                    maxWidth: "980px",
                    height: "460px",
                    borderRadius: "18px",
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                    background: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto"
                  }}
                >
                  <Image
                    src={card.image}
                    alt={`Step ${index + 1}`}
                    width={980}
                    height={460}
                    quality={75}
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 980px"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain"
                    }}
                  />
                </div>
              </div>
            ))}
            <div
              style={{
                padding: "28px",
                borderRadius: "24px",
                border: "1px solid #e5e7eb",
                background: "white",
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)"
              }}
            >
              <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "#0f172a", textAlign: "center", marginBottom: "18px" }}>
                {simpleCards[2].description}
              </div>
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "18px",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    transition: "transform 0.4s ease",
                    transform: `translateX(-${activeExploreIndex * 100}%)`
                  }}
                >
                  {exploreCards.map((card, idx) => (
                    <div
                      key={card.image}
                      style={{
                        minWidth: "100%",
                        padding: "18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          maxWidth: "980px",
                          height: "460px",
                          borderRadius: "16px",
                          border: "1px solid #e2e8f0",
                          overflow: "hidden",
                          background: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <Image
                          src={card.image}
                          alt={`Step 3 detail ${idx + 1}`}
                          width={600}
                          height={400}
                          quality={75}
                          loading="lazy"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 600px"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain"
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setActiveExploreIndex((prev) => (prev === 0 ? exploreCards.length - 1 : prev - 1))
                  }
                  style={{
                    position: "absolute",
                    left: "20px",
                    top: "50%",
                    transform: "translateY(-50%)",
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
                    e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(-50%) scale(1)";
                  }}
                  aria-label="Previous step 3 card"
                >
                  <svg style={{ width: "44px", height: "44px" }} fill="none" stroke="#f97316" viewBox="0 0 32 32" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M22 6l-10 10 10 10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M28 6l-10 10 10 10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 6l-10 10 10 10" />
                  </svg>
                </button>
                <button
                  onClick={() =>
                    setActiveExploreIndex((prev) => (prev === exploreCards.length - 1 ? 0 : prev + 1))
                  }
                  style={{
                    position: "absolute",
                    right: "20px",
                    top: "50%",
                    transform: "translateY(-50%)",
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
                    e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(-50%) scale(1)";
                  }}
                  aria-label="Next step 3 card"
                >
                  <svg style={{ width: "44px", height: "44px" }} fill="none" stroke="#f97316" viewBox="0 0 32 32" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l10 10-10 10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l10 10-10 10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 6l10 10-10 10" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="how-it-works" style={{ paddingTop: "6rem", paddingBottom: "6rem", background: "linear-gradient(to bottom right, #f9fafb, #eff6ff)", scrollMarginTop: "80px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingLeft: "1rem", paddingRight: "1rem" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h2 style={{ fontSize: "3rem", fontWeight: "700", marginBottom: "1rem", color: "#111827" }}>
            How It Works (Two phases)
          </h2>

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
                Define Your Research & Aggregate Global Scholars By Location
              </h3>
              <p style={{ fontSize: "1rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>
                5 Steps From Research Understanding to Geographic Organization
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
                      <Image
                        src={card.image}
                        alt={card.title}
                        width={600}
                        height={400}
                        quality={75}
                        loading="lazy"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 600px"
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
              bottom: "-40px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 100,
              width: "calc(100% - 220px)",
              maxWidth: "780px"
            }}>
              <div style={{
                backgroundColor: "white",
                borderRadius: "999px",
                border: "2px solid #bfdbfe",
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
                Explore Results On Map
              </h3>
              <p style={{ fontSize: "1rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>
                4 Viewing Options: Country, City, Institution, Author.
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
                      <Image
                        src={card.image}
                        alt={card.title}
                        width={600}
                        height={400}
                        quality={75}
                        loading="lazy"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 600px"
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
              bottom: "-30px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 100,
              width: "calc(100% - 220px)",
              maxWidth: "780px"
            }}>
              <div style={{
                backgroundColor: "white",
                borderRadius: "999px",
                border: "2px solid #bfdbfe",
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
