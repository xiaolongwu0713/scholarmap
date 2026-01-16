"use client";

const cards = [
  {
    title: "Auto-build literature queries",
    description:
      "Write a short research description and get a full-strength retrieval script with broader coverage than manual search.",
    accent: "#2563eb",
    icon: "🧠"
  },
  {
    title: "Map global research fit",
    description:
      "See where your topic is active worldwide to identify ideal countries and cities for future work.",
    accent: "#059669",
    icon: "🌍"
  },
  {
    title: "Find collaborators fast",
    description:
      "List all scholars in a target institution to discover potential collaborators in your field.",
    accent: "#7c3aed",
    icon: "🤝"
  },
  {
    title: "Share and export in one click",
    description:
      "Share runs instantly and export the workflow as a PDF for reporting or team review.",
    accent: "#c2410c",
    icon: "📤"
  }
];

export function WhatYouCanDo() {
  return (
    <section
      id="what-you-can-do"
      style={{
        paddingTop: "6rem",
        paddingBottom: "6rem",
        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        scrollMarginTop: "80px"
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingLeft: "1rem", paddingRight: "1rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "999px",
              background: "#e0f2fe",
              color: "#0369a1",
              fontWeight: 600,
              fontSize: "0.9rem",
              marginBottom: "1rem"
            }}
          >
            What You Can Do
          </div>
          <h2 style={{ fontSize: "2.6rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.75rem" }}>
            Know in 10 seconds if ScholarMap is worth your time
          </h2>
          <p style={{ maxWidth: "720px", margin: "0 auto", color: "#475569", fontSize: "1.05rem" }}>
            Four outcomes you can get immediately — search strength, global fit, collaborator discovery, and instant sharing.
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
