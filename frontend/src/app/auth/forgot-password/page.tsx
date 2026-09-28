"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPasswordRequirements, resetPassword, sendVerificationCode, type PasswordRequirements } from "@/lib/api";
import { postAuthRedirect, setToken, setUser } from "@/lib/auth";
import { passwordProblems } from "@/lib/password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRetype, setPasswordRetype] = useState("");
  const [requirements, setRequirements] = useState<PasswordRequirements | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prefilled from the register page's "reset your password" link
    const prefill = new URLSearchParams(window.location.search).get("email");
    if (prefill) setEmail(prefill);
    getPasswordRequirements().then(setRequirements).catch(() => {
      setError("Failed to load password requirements. Please refresh the page.");
    });
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  async function handleSendCode() {
    setError(null);
    setSendingCode(true);
    try {
      await sendVerificationCode(email.trim(), "reset");
      setCodeSent(true);
      setCountdown(60);
    } catch (e: any) {
      setError(e.message || "Failed to send verification code");
    } finally {
      setSendingCode(false);
    }
  }

  const problems = requirements && password ? passwordProblems(password, requirements) : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!requirements || passwordProblems(password, requirements).length > 0) {
      setError("Password does not meet requirements");
      return;
    }
    if (password !== passwordRetype) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const response = await resetPassword(email.trim(), code.trim(), password);
      setToken(response.access_token);
      setUser({ user_id: response.user_id, email: response.email });
      router.push(postAuthRedirect());
    } catch (e: any) {
      setError(e.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: "400px", margin: "2rem auto" }}>
      <div className="card">
        <h1>Reset your password</h1>
        <p className="muted">We'll email you a code to set a new password.</p>
      </div>

      <form onSubmit={handleSubmit} className="card stack">
        <div className="stack">
          <label htmlFor="email">Email</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
              disabled={loading || sendingCode}
              autoComplete="email"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={!email.trim() || sendingCode || countdown > 0}
              className="secondary"
            >
              {sendingCode ? "Sending..." : countdown > 0 ? `${countdown}s` : "Send Code"}
            </button>
          </div>
          {codeSent && (
            <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              If an account exists for this email, a code is on its way. Check your spam folder too.
            </div>
          )}
        </div>

        <div className="stack">
          <label htmlFor="verification-code">Verification Code</label>
          <input
            id="verification-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit code"
            maxLength={6}
            required
            disabled={loading || !codeSent}
            autoComplete="one-time-code"
          />
        </div>

        <div className="stack">
          <label htmlFor="password">New Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
            maxLength={requirements?.max_length || 15}
          />
          {problems.length > 0 && (
            <ul style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0, paddingLeft: "1.2rem" }}>
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="stack">
          <label htmlFor="password-retype">Confirm New Password</label>
          <input
            id="password-retype"
            type="password"
            value={passwordRetype}
            onChange={(e) => setPasswordRetype(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
            maxLength={requirements?.max_length || 15}
          />
          {passwordRetype && password !== passwordRetype && (
            <div style={{ fontSize: "0.8rem", color: "var(--error)" }}>Passwords do not match</div>
          )}
        </div>

        {error && <div style={{ color: "var(--error)", fontSize: "0.9rem" }}>{error}</div>}

        <button type="submit" disabled={loading || !codeSent}>
          {loading ? "Saving..." : "Set new password"}
        </button>
      </form>

      <div className="card" style={{ textAlign: "center" }}>
        <p className="muted">
          Remembered it? <Link href="/auth/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
