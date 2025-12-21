interface Step {
  label: string;
  status: "completed" | "in_progress" | "pending";
}

interface ProgressStepsProps {
  steps: Step[];
}

export default function ProgressSteps({ steps }: ProgressStepsProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "20px",
        background: "white",
        borderRadius: "16px",
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
        overflowX: "auto"
      }}
    >
      {steps.map((step, index) => (
        <div key={step.label} style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
          {/* Step Circle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              flex: 1
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: 700,
                background:
                  step.status === "completed"
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : step.status === "in_progress"
                      ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
                      : "#f3f4f6",
                color:
                  step.status === "completed" || step.status === "in_progress" ? "white" : "#9ca3af",
                boxShadow: step.status !== "pending" ? "0 2px 4px 0 rgb(0 0 0 / 0.1)" : "none",
                transition: "all 0.3s"
              }}
            >
              {step.status === "completed" ? "✓" : index + 1}
            </div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: step.status !== "pending" ? "#374151" : "#9ca3af",
                textAlign: "center",
                whiteSpace: "nowrap"
              }}
            >
              {step.label}
            </div>
          </div>

          {/* Arrow */}
          {index < steps.length - 1 && (
            <div
              style={{
                fontSize: "20px",
                color: steps[index + 1].status !== "pending" ? "#2563eb" : "#d1d5db",
                marginBottom: "24px"
              }}
            >
              →
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

