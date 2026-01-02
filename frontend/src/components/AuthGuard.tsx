"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticatedState, setIsAuthenticatedState] = useState<boolean | null>(null);

  useEffect(() => {
    // Only check authentication on client side
    const authenticated = isAuthenticated();
    setIsAuthenticatedState(authenticated);
    
    if (!authenticated) {
      // Only redirect if not already on auth pages
      if (!pathname?.startsWith("/auth/")) {
        router.push("/auth/login");
      }
    }
  }, [router, pathname]);

  // Show loading state during initial check (prevents hydration mismatch)
  if (isAuthenticatedState === null) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div className="muted">Loading...</div>
      </div>
    );
  }

  // If not authenticated, don't render children (redirect will happen)
  if (!isAuthenticatedState) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div className="muted">Redirecting to login...</div>
      </div>
    );
  }

  return <>{children}</>;
}

