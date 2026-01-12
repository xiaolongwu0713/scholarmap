/**
 * Authentication utilities and token management.
 */

const TOKEN_KEY = "scholarmap_auth_token";
const USER_KEY = "scholarmap_user";

export interface User {
  user_id: string;
  email: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Check if current user is a super user.
 * Super users have access to admin features like resource monitoring.
 */
export function isSuperUser(): boolean {
  const user = getUser();
  if (!user) return false;
  // Super user email from config (should match backend config.super_user_email)
  const SUPER_USER_EMAIL = "xiaolongwu0713@gmail.com";
  return user.email === SUPER_USER_EMAIL;
}

/**
 * Get headers with authentication token.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "X-Requested-With": "ScholarMap-Frontend",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

