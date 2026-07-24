export type LoginResponse = {
  access_token: string;
  token_type: string;
  workshop_id: number;
  user_name: string;
  role: string;
};

export type WorkshopProfile = {
  id: number;
  name: string;
  business_name: string | null;
  ruc: string | null;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  footer_text: string | null;
  setup_completed: boolean;
  status: string;
  created_at: string;
  updated_at: string | null;
};

export type WorkshopProfileUpdate = {
  name?: string;
  business_name?: string | null;
  ruc?: string | null;
  owner_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logo_url?: string | null;
  footer_text?: string | null;
};

export type AdminWorkshop = {
  id: number;
  name: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
  setup_completed: boolean;
  created_at: string;
  admin_name: string | null;
  admin_email: string | null;
};

export type AdminWorkshopCreate = {
  name: string;
  owner_name: string;
  phone?: string;
  email?: string;
  address?: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
};

export type AdminWorkshopUpdate = {
  name?: string;
  owner_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  admin_name?: string;
  admin_email?: string;
  admin_password?: string;
};

const TOKEN_KEY = "siadauto_token";
const USER_NAME_KEY = "siadauto_user_name";
const WORKSHOP_ID_KEY = "siadauto_workshop_id";
const ROLE_KEY = "siadauto_role";

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
  localStorage.setItem(ROLE_KEY, data.role);
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

export function getRole() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ROLE_KEY) || "";
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(WORKSHOP_ID_KEY);
  localStorage.removeItem(ROLE_KEY);
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
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed.detail || text;
    } catch {
      // Se conserva el texto original.
    }
    throw new Error(message);
  }

  return res.json();
}

export function getMyWorkshop() {
  return apiFetch<WorkshopProfile>("/workshops/me");
}

export function updateMyWorkshop(data: WorkshopProfileUpdate) {
  return apiFetch<WorkshopProfile>("/workshops/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getAdminWorkshops() {
  return apiFetch<AdminWorkshop[]>("/admin/workshops");
}

export function createAdminWorkshop(data: AdminWorkshopCreate) {
  return apiFetch<{ message: string; workshop_id: number }>("/admin/workshops", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAdminWorkshop(workshopId: number, data: AdminWorkshopUpdate) {
  return apiFetch<{ message: string }>(`/admin/workshops/${workshopId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function changeAdminWorkshopStatus(workshopId: number, status: "activo" | "suspendido") {
  return apiFetch<{ message: string }>(`/admin/workshops/${workshopId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
