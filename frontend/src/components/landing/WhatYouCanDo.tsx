"use client";

const cards = [
  {
    title: "Built for biomedical and life science scholars",
    description:
      "ScholarMap focuses on biomedical and life science research, so the insights and discovery workflows fit your field.",
    accent: "#0ea5e9",
    icon: "🧬"
  },
  {
    title: "LLM-generated literature queries",
    description:
      "Describe your research in natural language and get a full-strength retrieval script with broader coverage than manual search.",
    accent: "#2563eb",
    icon: "🧠"
  },
  {
    title: "Global fit and collaborator discovery",
    description:
      "Find your best-fit country, city, or institution and list scholars there to discover potential collaborators in your field.",
    accent: "#059669",
    icon: "🌍"
  },
  {
    title: "Share and export",
    description:
      "Share and export the workflow as a PDF for reporting or distributing to your team.",
    accent: "#c2410c",
    icon: "📤"
  }
];

export function WhatYouCanDo() {
  return (
    <section
      id="what-you-can-do"
      style={{
        paddingTop: "4rem",
        paddingBottom: "6rem",
        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        scrollMarginTop: "80px"
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingLeft: "1rem", paddingRight: "1rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "2.6rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.75rem" }}>
            Find Research Labs and Postdoc Positions Worldwide
          </h2>
          <p style={{ maxWidth: "720px", margin: "0 auto", color: "#475569", fontSize: "1.05rem" }}>
            Discover researchers, institutions, and collaboration opportunities across 150+ countries. Get comprehensive search coverage, location-based insights, and instant results.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px"
          }}
        >
          {cards.map((card) => (
            <div
              key={card.title}
              style={{
                background: "white",
                borderRadius: "18px",
                padding: "22px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
                position: "relative",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-40px",
                  right: "-40px",
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: card.accent,
                  opacity: 0.08
                }}
              />
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: `${card.accent}1A`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  marginBottom: "12px"
                }}
              >
                {card.icon}
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px", color: "#0f172a" }}>
                {card.title}
              </h3>
              <p style={{ color: "#475569", fontSize: "0.98rem", lineHeight: 1.6, margin: 0 }}>
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
