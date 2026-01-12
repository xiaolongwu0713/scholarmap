"use client";

import { useEffect, useState } from "react";
import { getUserQuota, type UserQuotaInfo } from "@/lib/api";

export default function QuotaDisplay() {
  const [quota, setQuota] = useState<UserQuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuota();
  }, []);

  async function loadQuota() {
    try {
      setLoading(true);
      const data = await getUserQuota();
      setQuota(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="muted">Loading quota...</div>;
  }

  if (error) {
    return <div className="muted">Failed to load quota</div>;
  }

  if (!quota) {
    return null;
  }

  const getTierDisplayName = (tier: string): string => {
    const names: Record<string, string> = {
      super_user: "Super User",
      regular_user: "Regular User",
      premium_user: "Premium User",
      free_user: "Free User",
    };
    return names[tier] || tier;
  };

  const getTierColor = (tier: string): string => {
    const colors: Record<string, string> = {
      super_user: "#4CAF50",
      premium_user: "#FF9800",
      regular_user: "#2196F3",
      free_user: "#9E9E9E",
    };
    return colors[tier] || "#666";
  };

  const getUsageColor = (current: number, limit: number, unlimited: boolean): string => {
    if (unlimited) return "#4CAF50";
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return "#f44336"; // Red
    if (percentage >= 70) return "#FF9800"; // Orange
    return "#4CAF50"; // Green
  };

  const formatQuotaValue = (value: number, unlimited: boolean): string => {
    if (unlimited || value === -1) return "Unlimited";
    return value.toLocaleString();
  };

  return (
    <div className="card stack" style={{ padding: "1rem" }}>
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Your Account Limits</h3>
        <div
          style={{
            fontSize: "0.85rem",
            fontWeight: "bold",
            color: getTierColor(quota.tier),
            padding: "0.25rem 0.75rem",
            borderRadius: "12px",
            background: `${getTierColor(quota.tier)}15`,
          }}
        >
          {getTierDisplayName(quota.tier)}
        </div>
      </div>

      <div className="stack" style={{ gap: "0.75rem" }}>
        {/* Projects Quota */}
        <div className="stack" style={{ gap: "0.25rem" }}>
          <div
            className="row"
            style={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>Projects</span>
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: "bold",
                color: getUsageColor(
                  quota.quotas.max_projects.current,
                  quota.quotas.max_projects.limit,
                  quota.quotas.max_projects.unlimited
                ),
              }}
            >
              {quota.quotas.max_projects.current} /{" "}
              {formatQuotaValue(
                quota.quotas.max_projects.limit,
                quota.quotas.max_projects.unlimited
              )}
            </span>
          </div>
          {!quota.quotas.max_projects.unlimited && (
            <div
              style={{
                width: "100%",
                height: "4px",
                background: "#e0e0e0",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(
                    (quota.quotas.max_projects.current /
                      quota.quotas.max_projects.limit) *
                      100,
                    100
                  )}%`,
                  height: "100%",
                  background: getUsageColor(
                    quota.quotas.max_projects.current,
                    quota.quotas.max_projects.limit,
                    false
                  ),
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          )}
          {!quota.quotas.max_projects.unlimited && (
            <div style={{ fontSize: "0.75rem", color: "#666" }}>
              {quota.quotas.max_projects.remaining} remaining
            </div>
          )}
        </div>

        {/* Runs per Project Quota */}
        <div className="stack" style={{ gap: "0.25rem" }}>
          <div
            className="row"
            style={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>
              Runs per Project
            </span>
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: "bold",
                color: getUsageColor(
                  quota.quotas.max_runs_per_project.current,
                  quota.quotas.max_runs_per_project.limit,
                  quota.quotas.max_runs_per_project.unlimited
                ),
              }}
            >
              {quota.quotas.max_runs_per_project.current} /{" "}
              {formatQuotaValue(
                quota.quotas.max_runs_per_project.limit,
                quota.quotas.max_runs_per_project.unlimited
              )}
            </span>
          </div>
          {!quota.quotas.max_runs_per_project.unlimited && (
            <div
              style={{
                width: "100%",
                height: "4px",
                background: "#e0e0e0",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(
                    (quota.quotas.max_runs_per_project.current /
                      quota.quotas.max_runs_per_project.limit) *
                      100,
                    100
                  )}%`,
                  height: "100%",
                  background: getUsageColor(
                    quota.quotas.max_runs_per_project.current,
                    quota.quotas.max_runs_per_project.limit,
                    false
                  ),
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          )}
          {!quota.quotas.max_runs_per_project.unlimited && (
            <div style={{ fontSize: "0.75rem", color: "#666" }}>
              Max {quota.quotas.max_runs_per_project.limit} runs per project
            </div>
          )}
        </div>

        {/* Papers per Run Quota */}
        <div className="stack" style={{ gap: "0.25rem" }}>
          <div
            className="row"
            style={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>
              Papers per Run
            </span>
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: "bold",
                color: "#666",
              }}
            >
              {formatQuotaValue(
                quota.quotas.max_papers_per_run.limit,
                quota.quotas.max_papers_per_run.unlimited
              )}
            </span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#666" }}>
            Maximum papers that can be retrieved per run
          </div>
        </div>
      </div>
    </div>
  );
}
