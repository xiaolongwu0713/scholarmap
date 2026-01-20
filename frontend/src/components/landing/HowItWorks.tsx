"use client";

import { useState } from "react";
import Image from "next/image";

export function HowItWorks() {
  const simpleCards = [
    {
      image: "/landing_page_figures_optimized/1-md.webp",
      description: "Step 1 – Describe your research in natural language."
    },
    {
      image: "/landing_page_figures_optimized/5-md.webp",
      description: "Step 2 – Aggregate scholars, and map the global landscape by country, city, and institution."
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

  const renderStep1Mock = () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: "20px",
        display: "grid",
        gridTemplateColumns: "1.1fr 0.9fr",
        gap: "16px"
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div
          style={{
            flex: 1,
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "12px",
            background: "#f8fafc"
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#2563eb" }}>You</div>
          <div style={{ fontSize: "0.85rem", color: "#1f2937", marginTop: "6px" }}>
            My research focuses on EEG-driven closed-loop neuromodulation using TMS.
          </div>
        </div>
        <div
          style={{
            flex: 1,
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "12px",
            background: "#eef2ff"
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4338ca" }}>System</div>
          <div style={{ fontSize: "0.85rem", color: "#1f2937", marginTop: "6px" }}>
            Can you specify the targeted population, application/outcome and evaluation metrics of your research?
          </div>
        </div>
        <div
          style={{
            flex: 1,
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "12px",
            background: "#f8fafc"
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#2563eb" }}>You</div>
          <div style={{ fontSize: "0.85rem", color: "#1f2937", marginTop: "6px" }}>
            My research has no restriction on the application/outcome, metrics, and the targeted subjects.
          </div>
        </div>
        <div
          style={{
            flex: 1,
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "12px",
            background: "#eef2ff"
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4338ca" }}>System</div>
          <div style={{ fontSize: "0.85rem", color: "#1f2937", marginTop: "6px" }}>
            This is a broad concept, and can you specify if you are working with realtime situation, or mainly
            focus on the offline data analysis?
          </div>
        </div>
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "12px",
            background: "white"
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>
            Write your next response...
          </div>
          <div style={{ fontSize: "0.9rem", color: "#1f2937" }}>
            My research has no restriction on the application/outcome, metrics, and the targeted subjects.
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "14px",
            background: "white"
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
            LLM-generated research description
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>Version 1</div>
          <div style={{ fontSize: "0.9rem", color: "#1f2937", marginTop: "10px", lineHeight: 1.45 }}>
            My research focuses on EEG-driven closed-loop neuromodulation using transcranial magnetic stimulation (TMS). I am interested in systems that extract real-time features from ongoing EEG and adapt TMS timing and/or stimulation parameters accordingly to modulate brain states. The work broadly concerns algorithmic control, signal processing, and experimental validation of EEG–TMS closed-loop paradigms, without committing to a single clinical or cognitive application, outcome metric, or subject population.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            aria-disabled="true"
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "12px",
              padding: "10px 18px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "default",
              outline: "none",
              boxShadow: "none"
            }}
          >
            Use the current description
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2Mock = () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "18px"
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "26px", maxWidth: "980px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "22px" }}>
          {[
            { label: "Papers", value: "500", note: "Analyzed", color: "linear-gradient(120deg, #dbeafe, #bfdbfe)" },
            { label: "Authors", value: "3,127", note: "Unique authors", color: "linear-gradient(120deg, #ede9fe, #ddd6fe)" }
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: card.color,
                borderRadius: "16px",
                padding: "16px",
                border: "1px solid rgba(148, 163, 184, 0.25)",
                width: "210px",
                height: "150px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1f2937" }}>
                {card.label}
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#0f172a" }}>
                {card.value}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#475569" }}>{card.note}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "22px" }}>
          {[
            { label: "Countries", value: "55", note: "Countries", color: "linear-gradient(120deg, #dcfce7, #bbf7d0)" },
            { label: "Cities", value: "108", note: "Cities", color: "linear-gradient(120deg, #cffafe, #bae6fd)" },
            { label: "Institutions", value: "888", note: "Institutions", color: "linear-gradient(120deg, #ffedd5, #fed7aa)" }
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: card.color,
                borderRadius: "16px",
                padding: "16px",
                border: "1px solid rgba(148, 163, 184, 0.25)",
                width: "210px",
                height: "150px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1f2937" }}>
                {card.label}
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#0f172a" }}>
                {card.value}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#475569" }}>{card.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <section
      id="how-it-works"
      style={{
        paddingTop: "4rem",
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
                {index === 0 ? (
                  renderStep1Mock()
                ) : (
                  renderStep2Mock()
                )}
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
