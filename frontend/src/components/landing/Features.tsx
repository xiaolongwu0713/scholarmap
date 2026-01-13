"use client";

export function Features() {
  const features = [
    {
      icon: (
        <svg
          style={{ width: "32px", height: "32px" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
      title: "AI-Powered Query Understanding",
      description:
        "Our advanced LLM interprets your research description and automatically constructs optimal query strings for academic databases.",
    },
    {
      icon: (
        <svg
          style={{ width: "32px", height: "32px" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
          />
        </svg>
      ),
      title: "Comprehensive Database Search",
      description:
        "Search across multiple academic databases to find relevant papers and researchers matching your query criteria.",
    },
    {
      icon: (
        <svg
          style={{ width: "32px", height: "32px" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
      ),
      title: "Intelligent Aggregation",
      description:
        "Automatically processes and aggregates research data by institution, city, and country for meaningful geographic insights.",
    },
    {
      icon: (
        <svg
          style={{ width: "32px", height: "32px" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      title: "Interactive 3D Visualization",
      description:
        "Explore research distribution on a stunning 3D globe interface with real-time filtering and detailed tooltips.",
    },
  ];

  return (
    <section id="features" style={{ paddingTop: "6rem", paddingBottom: "6rem", backgroundColor: "white", scrollMarginTop: "80px" }}>
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
            Powerful Features for Researchers
          </h2>
          <p style={{ fontSize: "1.25rem", color: "#4b5563", maxWidth: "42rem", margin: "0 auto" }}>
            Everything you need to discover, analyze, and visualize academic
            research networks across the globe
          </p>
        </div>

        <div 
          style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", 
            gap: "2rem", 
            maxWidth: "1200px", 
            margin: "0 auto" 
          }}
        >
          {features.map((feature, index) => (
            <div
              key={index}
              style={{
                backgroundColor: "white",
                borderRadius: "1rem",
                border: "1px solid #e5e7eb",
                overflow: "hidden",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div 
                style={{
                  backgroundColor: "#dbeafe",
                  color: "#2563eb",
                  padding: "2rem",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {feature.icon}
              </div>
              <div style={{ padding: "2rem" }}>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "#111827" }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: "1rem", color: "#4b5563", lineHeight: "1.625" }}>
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

