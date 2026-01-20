"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, removeToken, isAuthenticated } from "@/lib/auth";

export function LandingNavbarUser() {
  const router = useRouter();
  const [user, setUser] = useState<{ user_id: string; email: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const displayName = (() => {
    if (!user?.email) return "User";
    const localPart = user.email.split("@")[0] || user.email;
    const maxLength = 12;
    return localPart.length > maxLength ? `${localPart.slice(0, maxLength)}...` : localPart;
  })();

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    setIsLoggedIn(isAuthenticated());
  }, []);

  const handleLogout = () => {
    removeToken();
    setUser(null);
    setIsLoggedIn(false);
    router.push("/");
  };

  return (
    <div className="flex items-center gap-3">
      {!isLoggedIn ? (
        <Link href="/auth/login">
          <button
            className="secondary"
            style={{
              padding: "8px 20px",
              fontSize: "14px",
              borderRadius: "8px"
            }}
          >
            Sign In
          </button>
        </Link>
      ) : (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: showUserMenu ? "#dfe7fb" : "#e6efff",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "14px",
              fontWeight: "500",
              color: "#475569"
            }}
            onMouseEnter={(e) => {
              if (!showUserMenu) {
                e.currentTarget.style.background = "#d9e3fb";
              }
            }}
            onMouseLeave={(e) => {
              if (!showUserMenu) {
                e.currentTarget.style.background = "#e6efff";
              }
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "#e8f0ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#3b82f6",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              {user?.email?.[0].toUpperCase() || "U"}
            </div>
            <span
              style={{
                maxWidth: "150px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {displayName}
            </span>
            <svg
              style={{
                width: "16px",
                height: "16px",
                transition: "transform 0.2s ease",
                transform: showUserMenu ? "rotate(180deg)" : "rotate(0deg)"
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showUserMenu && (
            <>
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 40
                }}
                onClick={() => setShowUserMenu(false)}
              />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  minWidth: "220px",
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "8px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                  zIndex: 50
                }}
              >
                <Link
                  href="/projects"
                  style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    color: "#0f172a",
                    textDecoration: "none"
                  }}
                >
                  Projects
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    color: "#dc2626",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer"
                  }}
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
