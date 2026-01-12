"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await login(email.trim(), password);
      setToken(response.access_token);
      setUser({ user_id: response.user_id, email: response.email });
      router.push("/projects");
    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: "400px", margin: "2rem auto" }}>
      <div className="card">
        <h1>Login to ScholarMap</h1>
        <p className="muted">Enter your email and password to continue.</p>
      </div>

      <form onSubmit={handleSubmit} className="card stack">
        <div className="stack">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="stack">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        {error && <div style={{ color: "var(--error)", fontSize: "0.9rem" }}>{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="card" style={{ textAlign: "center" }}>
        <p className="muted">
          Don't have an account? <Link href="/auth/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}

