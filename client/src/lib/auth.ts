const AUTH_KEY = "app_authenticated";
const AUTH_TOKEN_KEY = "app_auth_token";

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthenticated(token: string): void {
  localStorage.setItem(AUTH_KEY, "true");
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthentication(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

