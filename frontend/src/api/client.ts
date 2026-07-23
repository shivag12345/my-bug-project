const API_URL = import.meta.env.VITE_API_URL ?? "/api";
const sessionKeys = ["accessToken", "refreshToken", "user"] as const;
export const AUTH_EXPIRED_EVENT = "bug-tracking:auth-expired";

type RefreshResponse = {
  accessToken: string;
};

let refreshRequest: Promise<string | null> | null = null;

export function getToken() {
  return sessionStorage.getItem("accessToken");
}

export function getRefreshToken() {
  return sessionStorage.getItem("refreshToken");
}

export function setSession(accessToken: string, refreshToken: string, user: unknown) {
  clearSession();
  sessionStorage.setItem("accessToken", accessToken);
  sessionStorage.setItem("refreshToken", refreshToken);
  sessionStorage.setItem("user", JSON.stringify(user));
}

export function clearSession() {
  for (const key of sessionKeys) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
}

export function currentUser<T>() {
  const raw = sessionStorage.getItem("user");
  return raw ? (JSON.parse(raw) as T) : null;
}

export function setCurrentUser(user: unknown) {
  if (sessionStorage.getItem("accessToken")) sessionStorage.setItem("user", JSON.stringify(user));
}

function setAccessToken(accessToken: string) {
  sessionStorage.setItem("accessToken", accessToken);
  localStorage.removeItem("accessToken");
}

function notifySessionExpired() {
  clearSession();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  refreshRequest ??= fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = (await res.json()) as RefreshResponse;
      if (!data.accessToken) return null;
      setAccessToken(data.accessToken);
      return data.accessToken;
    })
    .catch(() => null)
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}

function buildHeaders(options: RequestInit, token: string | null) {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function send(path: string, options: RequestInit, token: string | null) {
  return fetch(`${API_URL}${path}`, { ...options, headers: buildHeaders(options, token) });
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res = await send(path, options, getToken());
  const canRefresh = path !== "/auth/login" && path !== "/auth/refresh";

  if (res.status === 401 && canRefresh) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) res = await send(path, options, refreshedToken);
    if (!refreshedToken || res.status === 401) notifySessionExpired();
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const crud = {
  list: <T>(name: string) => api<T[]>(`/${name}`),
  create: <T>(name: string, data: unknown) => api<T>(`/${name}`, { method: "POST", body: JSON.stringify(data) }),
  update: <T>(name: string, id: string, data: unknown) => api<T>(`/${name}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (name: string, id: string) => api<void>(`/${name}/${id}`, { method: "DELETE" })
};
