"use client";

import { useEffect, useRef, useState } from "react";

export function Hero() {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const slideWidthPercent = 85;
  const slideGap = 24;

  useEffect(() => {
    const handleResize = () => {
      setContainerWidth(containerRef.current?.offsetWidth ?? 0);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const slides = [
    {
      key: "hero",
      heading: (
        <h1 className="text-5xl md:text-7xl font-bold mb-12 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
          Let Research Lead You To Your Dream Country, City, and Institution.
        </h1>
      ),
      image: (
        <div className="relative max-w-5xl mx-auto w-full">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
            <img
              src="/landing_page_figures/0.png"
              alt="Global research network visualization"
              className="w-full h-auto"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          </div>
        </div>
      )
    },
    {
      key: "discover",
      heading: (
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
          Discover global research opportunities—grouped by country, city, and institution.
        </h2>
      ),
      image: (
        <img
          src="/landing_page_figures/10.png"
          alt="ScholarMap use case"
          style={{
            width: "100%",
            maxWidth: "1030px",
            maxHeight: "940px",
            marginBottom: "4rem",
            marginTop: "2rem",
            height: "auto",
            display: "block",
            borderRadius: "0.75rem",
            objectFit: "cover",
            background: "linear-gradient(to right, #2563eb, #9333ea)",
          }}
        />
      )
    }
  ];

  const handlePrev = () => {
    setActiveSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveSlideIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  return (
    <section
      id="what-it-is"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div style={{ position: "relative" }}>
          <button
            onClick={handlePrev}
            style={{
              position: "absolute",
              left: "-8px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
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
            aria-label="Previous slide"
          >
            <svg style={{ width: "44px", height: "44px" }} fill="none" stroke="#f97316" viewBox="0 0 32 32" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M22 6l-10 10 10 10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M28 6l-10 10 10 10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 6l-10 10 10 10" />
            </svg>
          </button>

          <div ref={containerRef} style={{ overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                gap: `${slideGap}px`,
                transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: `translateX(${(() => {
                  if (!containerWidth) return 0;
                  const slideWidth = containerWidth * (slideWidthPercent / 100);
                  const offset = (containerWidth - slideWidth) / 2;
                  return offset - activeSlideIndex * (slideWidth + slideGap);
                })()}px)`
              }}
            >
              {slides.map((slide) => (
                <div
                  key={slide.key}
                  style={{
                    flex: `0 0 ${slideWidthPercent}%`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "2rem"
                  }}
                >
                  {slide.heading}
                  {slide.image}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleNext}
            style={{
              position: "absolute",
              right: "-8px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
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
            aria-label="Next slide"
          >
            <svg style={{ width: "44px", height: "44px" }} fill="none" stroke="#f97316" viewBox="0 0 32 32" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l10 10-10 10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l10 10-10 10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 6l10 10-10 10" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
