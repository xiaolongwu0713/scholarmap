interface MetricCardProps {
  icon: string;
  label: string;
  value: number | string;
  subtitle?: string;
  color?: "blue" | "green" | "purple" | "orange" | "red";
  trend?: number;
}

export default function MetricCard({
  icon,
  label,
  value,
  subtitle,
  color = "blue",
  trend
}: MetricCardProps) {
  const colorClasses = {
    blue: "from-blue-50 to-blue-100 text-blue-600",
    green: "from-green-50 to-green-100 text-green-600",
    purple: "from-purple-50 to-purple-100 text-purple-600",
    orange: "from-orange-50 to-orange-100 text-orange-600",
    red: "from-red-50 to-red-100 text-red-600"
  };

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${getGradient(color)})`,
        padding: "20px",
        borderRadius: "16px",
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
        transition: "all 0.2s",
        cursor: "default",
        flex: 1,
        minWidth: "180px"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 6px -1px rgb(0 0 0 / 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 3px 0 rgb(0 0 0 / 0.1)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <span style={{ fontSize: "28px" }}>{icon}</span>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </span>
      </div>
      
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <span style={{ fontSize: "32px", fontWeight: 700, color: "#111827" }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {trend !== undefined && trend !== 0 && (
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: trend > 0 ? "#10b981" : "#ef4444"
            }}
          >
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      
      {subtitle && (
        <div style={{ marginTop: "4px", fontSize: "12px", color: "#6b7280" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function getGradient(color: string): string {
  const gradients = {
    blue: "#eff6ff, #dbeafe",
    green: "#d1fae5, #a7f3d0",
    purple: "#f3e8ff, #e9d5ff",
    orange: "#ffedd5, #fed7aa",
    red: "#fee2e2, #fecaca"
  };
  return gradients[color as keyof typeof gradients] || gradients.blue;
}

