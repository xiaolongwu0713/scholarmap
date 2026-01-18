"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getUser, removeToken, isAuthenticated } from "@/lib/auth";

interface UnifiedNavbarProps {
  variant?: "landing" | "app";
}

export function UnifiedNavbar({ variant = "app" }: UnifiedNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [user, setUser] = useState<{ user_id: string; email: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  const linkStyle = (linkName: string) => ({
    fontSize: "16px",
    padding: "8px 16px",
    borderRadius: "8px",
    fontWeight: "500",
    backgroundColor: hoveredLink === linkName ? "#dbeafe" : "#eff6ff",
    color: hoveredLink === linkName ? "#2563eb" : "#1f4ed8",
    transition: "all 0.2s ease",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block"
  });

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Always links to landing page */}
          <Link href="/" style={{ textDecoration: "none" }}>
            <div className="flex items-center gap-2 cursor-pointer">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xl font-semibold" style={{ color: "#111827" }}>ScholarMap</span>
            </div>
          </Link>

          {/* Navigation Links - Different based on variant */}
          <div className="flex items-center gap-6 md:gap-10">
            {variant === "landing" ? (
              <>
                <a
                  href={pathname === "/" ? "#what-it-is" : "/#what-it-is"}
                  style={linkStyle("what-it-is")}
                  onMouseEnter={() => setHoveredLink("what-it-is")}
                  onMouseLeave={() => setHoveredLink(null)}
                >
                  What It Is
                </a>
                <a
                  href={pathname === "/" ? "#what-you-can-do" : "/#what-you-can-do"}
                  style={linkStyle("what-you-can-do")}
                  onMouseEnter={() => setHoveredLink("what-you-can-do")}
                  onMouseLeave={() => setHoveredLink(null)}
                >
                  Capabilities
                </a>
                <a
                  href={pathname === "/" ? "#how-it-works" : "/#how-it-works"}
                  style={linkStyle("how-it-works")}
                  onMouseEnter={() => setHoveredLink("how-it-works")}
                  onMouseLeave={() => setHoveredLink(null)}
                >
                  How It Works
                </a>
                <a
                  href={pathname === "/" ? "#contact" : "/#contact"}
                  style={linkStyle("contact")}
                  onMouseEnter={() => setHoveredLink("contact")}
                  onMouseLeave={() => setHoveredLink(null)}
                >
                  Contact
                </a>
              </>
            ) : null}
          </div>

          {/* Right side: Sign In button or User Menu */}
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
                  <span style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user?.email || "User"}
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

                {/* Dropdown Menu */}
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
                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)",
                        border: "1px solid #e5e7eb",
                        overflow: "hidden",
                        zIndex: 50
                      }}
                    >
                      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
                        <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>Signed in as</div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{user?.email}</div>
                      </div>
                      <div style={{ padding: "8px 0" }}>
                        <Link href="/projects" onClick={() => setShowUserMenu(false)}>
                          <div
                            style={{
                              padding: "10px 16px",
                              fontSize: "14px",
                              color: "#374151",
                              cursor: "pointer",
                              transition: "background-color 0.15s ease",
                              display: "flex",
                              alignItems: "center",
                              gap: "10px"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f9fafb";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            <svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Go to Projects
                          </div>
                        </Link>
                        <div
                          style={{
                            padding: "10px 16px",
                            fontSize: "14px",
                            color: "#dc2626",
                            cursor: "pointer",
                            transition: "background-color 0.15s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px"
                          }}
                          onClick={handleLogout}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#fef2f2";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          <svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
