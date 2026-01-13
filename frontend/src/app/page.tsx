"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { About } from "@/components/landing/About";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ scrollBehavior: "smooth" }}>
      <Navbar />
      <Hero />
      <About />
      <Features />
      <HowItWorks />
      <Footer />
    </div>
  );
}
