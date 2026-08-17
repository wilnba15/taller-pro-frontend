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
  inventory_enabled: boolean;
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


export type SriSettings = {
  id: number;
  workshop_id: number;
  environment: string;
  establishment_code: string;
  emission_point_code: string;
  invoice_sequence: number;
  default_tax_rate: number;
  accounting_required: boolean;
  special_taxpayer_code: string | null;
  rimpe_type: string | null;
  created_at: string;
  updated_at: string | null;
};

export type SriSettingsUpdate = {
  environment: "pruebas";
  establishment_code: string;
  emission_point_code: string;
  default_tax_rate: number;
  accounting_required: boolean;
  special_taxpayer_code?: string | null;
  rimpe_type?: string | null;
};


export type SriCertificateInfo = {
  configured: boolean;
  id?: number;
  workshop_id?: number;
  filename?: string;
  certificate_subject?: string;
  certificate_issuer?: string;
  certificate_serial?: string;
  valid_from?: string;
  valid_to?: string;
  sha256?: string;
  status?: string;
  created_at?: string;
  updated_at?: string | null;
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
  inventory_enabled: boolean;
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
  inventory_enabled?: boolean;
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
  inventory_enabled?: boolean;
};

export type ChangePasswordData = {
  current_password: string;
  new_password: string;
  confirm_password: string;
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

async function readApiError(res: Response) {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.detail === "string") return parsed.detail;
    if (parsed.detail?.message) return parsed.detail.message;
    return text;
  } catch {
    return text || "Ocurrió un error";
  }
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

  if (!res.ok) throw new Error(await readApiError(res));
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


export function getMySriSettings() {
  return apiFetch<SriSettings>("/sri-settings/me");
}

export function updateMySriSettings(data: SriSettingsUpdate) {
  return apiFetch<SriSettings>("/sri-settings/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}


export function getMySriCertificate() {
  return apiFetch<SriCertificateInfo>("/sri-certificates/me");
}

export async function uploadMySriCertificate(
  file: File,
  password: string
) {
  const token = requireToken();
  const api = getApiBase();
  const formData = new FormData();

  formData.append("certificate", file);
  formData.append("password", password);

  const res = await fetch(`${api}/sri-certificates/me`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (res.status === 401 || res.status === 403) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Sesión vencida o no autorizada");
  }

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  return res.json() as Promise<SriCertificateInfo>;
}

export function deleteMySriCertificate() {
  return apiFetch<{ message: string }>("/sri-certificates/me", {
    method: "DELETE",
  });
}

export async function uploadMyWorkshopLogo(file: File) {
  const token = requireToken();
  const api = getApiBase();
  const formData = new FormData();
  formData.append("logo", file);

  const res = await fetch(`${api}/workshops/me/logo`, {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (res.status === 401 || res.status === 403) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Sesión vencida o no autorizada");
  }

  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<WorkshopProfile>;
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

export function changeAdminWorkshopInventory(
  workshopId: number,
  inventoryEnabled: boolean
) {
  return apiFetch<{
    message: string;
    workshop_id: number;
    inventory_enabled: boolean;
  }>(`/admin/workshops/${workshopId}/inventory`, {
    method: "PATCH",
    body: JSON.stringify({ inventory_enabled: inventoryEnabled }),
  });
}

export function changeMyPassword(data: ChangePasswordData) {
  return apiFetch<{ message: string }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type InventoryProduct = {
  id: number;
  workshop_id: number;
  code: string | null;
  name: string;
  category: string | null;
  brand: string | null;
  stock: number;
  minimum_stock: number;
  cost: number;
  sale_price: number;
  is_active: boolean;
  low_stock: boolean;
  created_at: string;
  updated_at: string;
};

export type InventoryProductPayload = {
  code?: string | null;
  name: string;
  category?: string | null;
  brand?: string | null;
  stock: number;
  minimum_stock: number;
  cost: number;
  sale_price: number;
  is_active: boolean;
};

export function getInventoryProducts(params?: {
  search?: string;
  low_stock?: boolean;
  include_inactive?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.low_stock) query.set("low_stock", "true");
  if (params?.include_inactive) query.set("include_inactive", "true");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<InventoryProduct[]>(`/inventory/${suffix}`);
}

export function createInventoryProduct(data: InventoryProductPayload) {
  return apiFetch<InventoryProduct>("/inventory/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateInventoryProduct(productId: number, data: Partial<InventoryProductPayload>) {
  return apiFetch<InventoryProduct>(`/inventory/${productId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deactivateInventoryProduct(productId: number) {
  return apiFetch<{ message: string }>(`/inventory/${productId}`, {
    method: "DELETE",
  });
}
