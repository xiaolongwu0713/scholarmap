import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Search, Database, BarChart3, Globe2, FileText, Settings, Zap } from "lucide-react";
import { StepCarousel } from "./StepCarousel";

const phases = [
  {
    phase: "Phase 1",
    title: "Smart Query & Data Retrieval",
    description: "From research description to comprehensive paper collection",
    icon: Search,
    color: "blue",
    steps: [
      {
        number: "1",
        title: "Parse",
        description: "Validate and refine your research description with AI assistance, then build the retrieval framework",
        icon: FileText,
        // Placeholder - will be replaced with actual screenshot
        placeholder: true,
      },
      {
        number: "2",
        title: "Framework",
        description: "Review the generated retrieval framework and optionally adjust it before locking it in",
        icon: Settings,
        placeholder: true,
      },
      {
        number: "3",
        title: "Query",
        description: "Generate database queries from the framework and execute them across multiple sources",
        icon: Database,
        placeholder: true,
      },
      {
        number: "4",
        title: "Results",
        description: "Fetch and display papers from PubMed, Semantic Scholar, and OpenAlex with deduplicated aggregate view",
        icon: BarChart3,
        placeholder: true,
      },
      {
        number: "5",
        title: "Map",
        description: "Process authorship and affiliations to build geographic statistics and open the interactive scholar map",
        icon: Globe2,
        placeholder: true,
      },
    ],
  },
  {
    phase: "Phase 2",
    title: "Interactive 3D Visualization",
    description: "Explore research distribution on an interactive globe",
    icon: Globe2,
    color: "purple",
    steps: [
      {
        number: "6",
        title: "3D Globe Interaction",
        description: "Navigate the interactive 3D map to explore research clusters by institution, city, and country",
        placeholder: true,
      },
      {
        number: "7",
        title: "Geographic Clusters",
        description: "View research concentration across different regions and zoom into specific areas of interest",
        placeholder: true,
      },
      {
        number: "8",
        title: "Institution Details",
        description: "Click on markers to see detailed information about institutions and their research output",
        placeholder: true,
      },
      {
        number: "9",
        title: "Data Filtering",
        description: "Apply filters to refine the visualization by time period, research field, or other criteria",
        placeholder: true,
      },
    ],
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            From your research question to global visualization in two simple phases
          </p>
        </div>

        <div className="space-y-24">
          {phases.map((phase, phaseIndex) => {
            const PhaseIcon = phase.icon;
            return (
              <div key={phaseIndex}>
                {/* Phase Header */}
                <div className="flex items-center gap-4 mb-12 justify-center">
                  <Badge 
                    variant="outline" 
                    className={`px-4 py-2 text-lg ${
                      phase.color === "blue" 
                        ? "border-blue-300 text-blue-700 bg-blue-50" 
                        : "border-purple-300 text-purple-700 bg-purple-50"
                    }`}
                  >
                    {phase.phase}
                  </Badge>
                  <div className={`p-3 rounded-lg ${
                    phase.color === "blue" ? "bg-blue-100" : "bg-purple-100"
                  }`}>
                    <PhaseIcon className={`w-6 h-6 ${
                      phase.color === "blue" ? "text-blue-600" : "text-purple-600"
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-3xl">{phase.title}</h3>
                    <p className="text-gray-600">{phase.description}</p>
                  </div>
                </div>

                {/* Steps Carousel */}
                <StepCarousel steps={phase.steps} color={phase.color} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}