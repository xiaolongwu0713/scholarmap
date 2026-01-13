"use client";

export function About() {
  return (
    <section id="about" style={{ paddingTop: "6rem", paddingBottom: "6rem", backgroundColor: "#f9fafb", scrollMarginTop: "80px" }}>
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
            About ScholarMap
          </h2>
          <p style={{ fontSize: "1.25rem", color: "#4b5563", maxWidth: "48rem", margin: "0 auto" }}>
            Transforming academic research discovery through AI and interactive visualization
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "3rem", marginBottom: "4rem" }}>
          {/* Mission */}
          <div style={{ textAlign: "center" }}>
            <div 
              style={{ 
                width: "80px", 
                height: "80px", 
                margin: "0 auto 1.5rem", 
                backgroundColor: "#dbeafe", 
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb"
              }}
            >
              <svg style={{ width: "40px", height: "40px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "#111827" }}>
              Our Mission
            </h3>
            <p style={{ fontSize: "1rem", color: "#4b5563", lineHeight: "1.75" }}>
              To make academic research discovery more intuitive and accessible by combining 
              cutting-edge AI technology with beautiful, interactive visualizations.
            </p>
          </div>

          {/* Technology */}
          <div style={{ textAlign: "center" }}>
            <div 
              style={{ 
                width: "80px", 
                height: "80px", 
                margin: "0 auto 1.5rem", 
                backgroundColor: "#dbeafe", 
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb"
              }}
            >
              <svg style={{ width: "40px", height: "40px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "#111827" }}>
              Advanced Technology
            </h3>
            <p style={{ fontSize: "1rem", color: "#4b5563", lineHeight: "1.75" }}>
              Powered by state-of-the-art Large Language Models that understand your research 
              needs and translate them into precise database queries.
            </p>
          </div>

          {/* Impact */}
          <div style={{ textAlign: "center" }}>
            <div 
              style={{ 
                width: "80px", 
                height: "80px", 
                margin: "0 auto 1.5rem", 
                backgroundColor: "#dbeafe", 
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb"
              }}
            >
              <svg style={{ width: "40px", height: "40px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "#111827" }}>
              Global Impact
            </h3>
            <p style={{ fontSize: "1rem", color: "#4b5563", lineHeight: "1.75" }}>
              Helping researchers worldwide discover collaborations, understand research landscapes, 
              and identify emerging trends in their fields.
            </p>
          </div>
        </div>

        {/* Key Stats */}
        <div style={{ 
          background: "white", 
          borderRadius: "1.5rem", 
          padding: "3rem 2rem",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)"
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2rem", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: "3rem", fontWeight: "700", color: "#2563eb", marginBottom: "0.5rem" }}>
                3+
              </div>
              <div style={{ fontSize: "1rem", color: "#6b7280" }}>
                Academic Databases
              </div>
            </div>
            <div>
              <div style={{ fontSize: "3rem", fontWeight: "700", color: "#2563eb", marginBottom: "0.5rem" }}>
                AI
              </div>
              <div style={{ fontSize: "1rem", color: "#6b7280" }}>
                Powered Search
              </div>
            </div>
            <div>
              <div style={{ fontSize: "3rem", fontWeight: "700", color: "#2563eb", marginBottom: "0.5rem" }}>
                3D
              </div>
              <div style={{ fontSize: "1rem", color: "#6b7280" }}>
                Interactive Globe
              </div>
            </div>
            <div>
              <div style={{ fontSize: "3rem", fontWeight: "700", color: "#2563eb", marginBottom: "0.5rem" }}>
                ∞
              </div>
              <div style={{ fontSize: "1rem", color: "#6b7280" }}>
                Research Possibilities
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
