import { Hero } from "@/components/landing/Hero";
import { WhatYouCanDo } from "@/components/landing/WhatYouCanDo";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Footer } from "@/components/landing/Footer";
import { LandingCTAs } from "@/components/landing/LandingCTAs";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { 
  StructuredData, 
  organizationSchema, 
  webApplicationSchema, 
  softwareApplicationSchema,
  faqSchema,
  howToSchema,
  breadcrumbSchema
} from "@/components/StructuredData";

export default function LandingPage() {
  return (
    <>
      {/* Structured Data for SEO */}
      <StructuredData data={organizationSchema} />
      <StructuredData data={webApplicationSchema} />
      <StructuredData data={softwareApplicationSchema} />
      <StructuredData data={faqSchema} />
      <StructuredData data={howToSchema} />
      <StructuredData data={breadcrumbSchema} />
      
    <div className="min-h-screen" style={{ scrollBehavior: "smooth" }}>
      <LandingNavbar />
      <Hero />
      <LandingCTAs />
      <WhatYouCanDo />
      <HowItWorks />
      <Footer />
    </div>
    </>
  );
}
