"use client";

const cards = [
  {
    title: "See who is publishing in your niche",
    description:
      "Built on PubMed, so it covers biomedical and life-science research in depth — down to specific methods, diseases, and targets.",
    accent: "#0ea5e9",
    icon: "🧬"
  },
  {
    title: "No search syntax needed",
    description:
      "Describe your interest in natural language; LabScout writes a full-strength literature query with broader coverage than manual search.",
    accent: "#2563eb",
    icon: "🧠"
  },
  {
    title: "Shortlist labs and PIs anywhere",
    description:
      "Compare countries, cities, and institutions, then list the researchers behind the papers — your contact list for applications or collaboration.",
    accent: "#059669",
    icon: "🌍"
  },
  {
    title: "Take your shortlist with you",
    description:
      "Save any map as a PDF. Pro adds full researcher and institution lists and CSV export for your applications or team.",
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
          From research interest to a shortlist of labs
          </h2>
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
