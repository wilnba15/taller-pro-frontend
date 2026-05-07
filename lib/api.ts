export type LoginResponse = {
  access_token: string;
  token_type: string;
  workshop_id: number;
  user_name: string;
};

const TOKEN_KEY = "siadauto_token";
const USER_NAME_KEY = "siadauto_user_name";
const WORKSHOP_ID_KEY = "siadauto_workshop_id";

export function getApiBase() {
  const api = process.env.NEXT_PUBLIC_API_BASE;
  if (!api) throw new Error("Falta NEXT_PUBLIC_API_BASE en las variables de entorno");
  return api;
}

export function saveSession(data: LoginResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_NAME_KEY, data.user_name);
  localStorage.setItem(WORKSHOP_ID_KEY, String(data.workshop_id));
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUserName() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(USER_NAME_KEY) || "";
}

export function getWorkshopId() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(WORKSHOP_ID_KEY) || "";
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(WORKSHOP_ID_KEY);
}

export function requireToken() {
  const token = getToken();
  if (!token) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Sesión no iniciada");
  }
  return token;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = requireToken();
  const api = getApiBase();

  const res = await fetch(`${api}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Sesión vencida o no autorizada");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error API ${res.status}: ${text}`);
  }

  return res.json();
}
