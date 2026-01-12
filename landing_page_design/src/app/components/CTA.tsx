import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ArrowRight, Mail } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl mb-6">
          Ready to Explore Global Research?
        </h2>
        <p className="text-xl mb-10 text-blue-100">
          Join researchers worldwide in discovering and visualizing academic networks like never before
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-xl mx-auto mb-8">
          <Input
            type="email"
            placeholder="Enter your email"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 h-12"
          />
          <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 h-12 whitespace-nowrap">
            Get Early Access
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        <p className="text-sm text-blue-100">
          No credit card required • Free during beta
        </p>
      </div>
    </section>
  );
}
