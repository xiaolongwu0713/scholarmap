"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendVerificationCode, register, getPasswordRequirements, type PasswordRequirements } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRetype, setPasswordRetype] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Load password requirements from API
  useEffect(() => {
    getPasswordRequirements()
      .then(setPasswordRequirements)
      .catch((e) => {
        console.error("Failed to load password requirements:", e);
        setError("Failed to load password requirements. Please refresh the page.");
      });
  }, []);

  async function handleSendCode(e: React.MouseEvent) {
    e.preventDefault();
    setError(null);
    setSendingCode(true);

    try {
      await sendVerificationCode(email.trim());
      setCodeSent(true);
      setCountdown(60); // 60 second countdown
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e: any) {
      setError(e.message || "Failed to send verification code");
    } finally {
      setSendingCode(false);
    }
  }

  // Real-time password validation using API configuration
  function validatePasswordRealTime(pwd: string): string[] {
    if (!passwordRequirements) return [];
    
    const errors: string[] = [];
    const req = passwordRequirements;
    
    // Minimum length
    if (pwd.length < req.min_length) {
      errors.push(`At least ${req.min_length} characters`);
    }
    // Maximum length
    if (pwd.length > req.max_length) {
      errors.push(`At most ${req.max_length} characters`);
    }
    // Require digit
    if (req.require_digit && !/\d/.test(pwd)) {
      errors.push("At least one digit (0-9)");
    }
    // Require letter
    if (req.require_letter && !/[a-zA-Z]/.test(pwd)) {
      errors.push("At least one letter (a-z, A-Z)");
    }
    // Require uppercase letter
    if (req.require_capital && !/[A-Z]/.test(pwd)) {
      errors.push("At least one uppercase letter (A-Z)");
    }
    // Require special character
    if (req.require_special) {
      // Escape special regex characters
      const escapedSpecial = req.special_chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const specialPattern = new RegExp(`[${escapedSpecial}]`);
      if (!specialPattern.test(pwd)) {
        errors.push(`At least one special character from: ${req.special_chars}`);
      }
    }
    
    return errors;
  }

  // Full password validation for form submission
  function validatePassword(): string | null {
    const errors = validatePasswordRealTime(password);
    if (errors.length > 0) {
      return "Password does not meet requirements";
    }
    // Passwords must match
    if (password !== passwordRetype) {
      return "Passwords do not match";
    }
    return null;
  }

  // Update password validation on change
  function handlePasswordChange(newPassword: string) {
    setPassword(newPassword);
    if (passwordTouched || newPassword.length > 0) {
      setPasswordErrors(validatePasswordRealTime(newPassword));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const passwordError = validatePassword();
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const response = await register(email.trim(), verificationCode.trim(), password, passwordRetype);
      setToken(response.access_token);
      setUser({ user_id: response.user_id, email: response.email });
      router.push("/");
    } catch (e: any) {
      setError(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: "400px", margin: "2rem auto" }}>
      <div className="card">
        <h1>Register for ScholarMap</h1>
        <p className="muted">Create a new account to get started.</p>
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
              {sendingCode
                ? "Sending..."
                : countdown > 0
                ? `${countdown}s`
                : "Send Code"}
            </button>
          </div>
          {codeSent && (
            <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              Verification code sent to your email
            </div>
          )}
        </div>

        <div className="stack">
          <label htmlFor="verification-code">Verification Code</label>
          <input
            id="verification-code"
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit code"
            maxLength={6}
            required
            disabled={loading || !codeSent}
            autoComplete="one-time-code"
          />
        </div>

        <div className="stack">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              handlePasswordChange(e.target.value);
            }}
            onBlur={() => setPasswordTouched(true)}
            placeholder="Enter your password"
            required
            disabled={loading}
            autoComplete="new-password"
            maxLength={passwordRequirements?.max_length || 15}
          />
          
          {/* Password Requirements Display */}
          {passwordRequirements && (
            <div className="stack" style={{ gap: "0.25rem", marginTop: "0.5rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: "500", color: "var(--text)" }}>
                Password Requirements:
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginLeft: "0.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  <div style={{ 
                    color: password.length >= passwordRequirements.min_length && 
                           password.length <= passwordRequirements.max_length ? "green" : "var(--muted)" 
                  }}>
                    ✓ {passwordRequirements.min_length}-{passwordRequirements.max_length} characters
                  </div>
                  {passwordRequirements.require_digit && (
                    <div style={{ color: /\d/.test(password) ? "green" : "var(--muted)" }}>
                      ✓ At least one digit (0-9)
                    </div>
                  )}
                  {passwordRequirements.require_letter && (
                    <div style={{ color: /[a-zA-Z]/.test(password) ? "green" : "var(--muted)" }}>
                      ✓ At least one letter (a-z, A-Z)
                    </div>
                  )}
                  {passwordRequirements.require_capital && (
                    <div style={{ color: /[A-Z]/.test(password) ? "green" : "var(--muted)" }}>
                      ✓ At least one uppercase letter (A-Z)
                    </div>
                  )}
                  {passwordRequirements.require_special && (
                    <div style={{ 
                      color: (() => {
                        const escapedSpecial = passwordRequirements.special_chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const specialPattern = new RegExp(`[${escapedSpecial}]`);
                        return specialPattern.test(password) ? "green" : "var(--muted)";
                      })()
                    }}>
                      ✓ At least one special character ({passwordRequirements.special_chars})
                    </div>
                  )}
                </div>
              </div>
              
              {/* Show errors if password is touched and has errors */}
              {passwordTouched && passwordErrors.length > 0 && (
                <div style={{ fontSize: "0.8rem", color: "var(--error)", marginTop: "0.5rem", marginLeft: "0.5rem" }}>
                  <div style={{ fontWeight: "500", marginBottom: "0.25rem" }}>Missing requirements:</div>
                  <ul style={{ margin: "0", paddingLeft: "1.2rem" }}>
                    {passwordErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {!passwordRequirements && (
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.5rem" }}>
              Loading password requirements...
            </div>
          )}
        </div>

        <div className="stack">
          <label htmlFor="password-retype">Confirm Password</label>
          <input
            id="password-retype"
            type="password"
            value={passwordRetype}
            onChange={(e) => setPasswordRetype(e.target.value)}
            placeholder="Re-enter your password"
            required
            disabled={loading}
            autoComplete="new-password"
            maxLength={passwordRequirements?.max_length || 15}
          />
          {passwordRetype && password !== passwordRetype && (
            <div style={{ fontSize: "0.8rem", color: "var(--error)" }}>
              Passwords do not match
            </div>
          )}
          {passwordRetype && password === passwordRetype && password.length > 0 && (
            <div style={{ fontSize: "0.8rem", color: "green" }}>
              ✓ Passwords match
            </div>
          )}
        </div>

        {error && <div style={{ color: "var(--error)", fontSize: "0.9rem" }}>{error}</div>}

        <button type="submit" disabled={loading || !codeSent}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      <div className="card" style={{ textAlign: "center" }}>
        <p className="muted">
          Already have an account? <Link href="/auth/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}

