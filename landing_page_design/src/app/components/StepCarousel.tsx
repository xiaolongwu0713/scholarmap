import { useState } from "react";
import Slider from "react-slick";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "./ui/card";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

interface Step {
  number: string;
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  image?: string;
  placeholder?: boolean;
}

interface StepCarouselProps {
  steps: Step[];
  color: "blue" | "purple";
}

export function StepCarousel({ steps, color }: StepCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const settings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: Math.min(3, steps.length),
    slidesToScroll: 1,
    beforeChange: (_current: number, next: number) => setCurrentSlide(next),
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(2, steps.length),
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
  };

  return (
    <div className="relative px-12">
      <Slider {...settings}>
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          return (
            <div key={index} className="px-3">
              <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 h-full">
                {step.image && (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div
                      className={`absolute top-4 left-4 w-10 h-10 rounded-full ${
                        color === "blue" ? "bg-blue-600" : "bg-purple-600"
                      } flex items-center justify-center text-white text-lg shadow-lg`}
                    >
                      {step.number}
                    </div>
                  </div>
                )}
                {step.placeholder && (
                  <div
                    className={`h-48 flex items-center justify-center relative ${
                      color === "blue"
                        ? "bg-gradient-to-br from-blue-50 to-blue-100"
                        : "bg-gradient-to-br from-purple-50 to-purple-100"
                    }`}
                  >
                    {StepIcon && (
                      <StepIcon
                        className={`w-12 h-12 ${
                          color === "blue" ? "text-blue-600/40" : "text-purple-600/40"
                        }`}
                      />
                    )}
                    <div
                      className={`absolute top-4 left-4 w-10 h-10 rounded-full ${
                        color === "blue" ? "bg-blue-600" : "bg-purple-600"
                      } flex items-center justify-center text-white text-lg shadow-lg`}
                    >
                      {step.number}
                    </div>
                  </div>
                )}
                <div className="p-6">
                  <h4 className="text-xl mb-2">{step.title}</h4>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              </Card>
            </div>
          );
        })}
      </Slider>
    </div>
  );
}

function NextArrow(props: any) {
  const { className, style, onClick } = props;
  return (
    <button
      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"
      onClick={onClick}
      aria-label="Next slide"
    >
      <ChevronRight className="w-6 h-6 text-gray-700" />
    </button>
  );
}

function PrevArrow(props: any) {
  const { className, style, onClick } = props;
  return (
    <button
      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"
      onClick={onClick}
      aria-label="Previous slide"
    >
      <ChevronLeft className="w-6 h-6 text-gray-700" />
    </button>
  );
}
