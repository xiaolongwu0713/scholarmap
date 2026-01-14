"use client";

export function WhatItIs() {
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
            Discover global research opportunities—mapped by field, city, and institution, all in one place.
          </h2>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <img
            src="/landing_page_figures/10.png"
            alt="ScholarMap use case"
            style={{
              width: "100%",
              maxWidth: "1100px",
              height: "auto",
              display: "block",
              borderRadius: "0.75rem",
              objectFit: "cover",
              border: "1px solid #e5e7eb"
            }}
          />
        </div>
      </div>
    </section>
  );
}
