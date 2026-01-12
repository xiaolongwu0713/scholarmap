import { Card } from "./ui/card";
import { Brain, Database, Map, Zap } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Query Understanding",
    description: "Our advanced LLM interprets your research description and automatically constructs optimal query strings for academic databases.",
  },
  {
    icon: Database,
    title: "Comprehensive Database Search",
    description: "Search across multiple academic databases to find relevant papers and researchers matching your query criteria.",
  },
  {
    icon: Map,
    title: "Intelligent Aggregation",
    description: "Automatically processes and aggregates research data by institution, city, and country for meaningful geographic insights.",
  },
  {
    icon: Zap,
    title: "Interactive 3D Visualization",
    description: "Explore research distribution on a stunning 3D globe interface with real-time filtering and detailed tooltips.",
  },
];

export function Features() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl mb-4">
            Powerful Features for Research Discovery
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to explore and understand global research distribution in one platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-8 hover:shadow-lg transition-shadow duration-300">
                <div className="mb-4 inline-flex p-3 bg-blue-100 rounded-lg">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
