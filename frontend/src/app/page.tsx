"use client";

import { UnifiedNavbar } from "@/components/UnifiedNavbar";
import { Hero } from "@/components/landing/Hero";
import { WhatItIs } from "@/components/landing/WhatItIs";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ scrollBehavior: "smooth" }}>
      <UnifiedNavbar variant="landing" />
      <Hero />
      <WhatItIs />
      <Features />
      <HowItWorks />
      <Footer />
    </div>
  );
}
