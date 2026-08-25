const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const TOKEN_KEY = "gulit_cpa_admin_token";

export const getToken = (): string | null => window.localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => window.localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => window.localStorage.removeItem(TOKEN_KEY);

export type Admin = { id: string; name: string; email: string };

export type Merchant = {
  _id: string;
  businessName: string;
  email: string;
  walletBalance: number;
  totalDeposited: number;
  totalSpent: number;
  isActive: boolean;
  createdAt: string;
};

export type Campaign = {
  _id: string;
  merchantId: { _id: string; businessName: string; email: string } | string;
  productName: string;
  totalBudget: number;
  budgetRemaining: number;
  cpaReward: number;
  salesGenerated: number;
  isActive: boolean;
  createdAt: string;
};

export type PlatformUser = {
  _id: string;
  telegramId: string;
  username?: string;
  role: "influencer" | "buyer";
  earningsBalance: number;
  totalEarnings: number;
  totalConversions: number;
};

export type Session = {
  _id: string;
  buyerTelegramId: string;
  referrerId: string;
  campaignId: { _id: string; productName: string; cpaReward: number } | string;
  status: "pending" | "converted" | "expired";
  createdAt: string;
  convertedAt?: string;
};

export type Stats = {
  merchantCount: number;
  campaignCount: number;
  activeCampaignCount: number;
  userCount: number;
  totalSales: number;
  totalEscrow: number;
  totalPaidOut: number;
  sessions: { total: number; converted: number; pending: number };
};

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...rest, headers: finalHeaders });
  const json: ApiResponse<T> = await response
    .json()
    .catch(() => ({ success: false, message: "Invalid server response" }));

  if (!response.ok || !json.success) {
    throw new ApiError(json.message || "Request failed", response.status);
  }
  return json.data as T;
}

export const loginAdmin = (email: string, password: string) =>
  request<{ token: string; admin: Admin }>("/admin/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
  });

export const getStats = () => request<Stats>("/admin/stats");
export const getMerchants = () => request<Merchant[]>("/admin/merchants");
export const setMerchantActive = (id: string, isActive: boolean) =>
  request<Merchant>(`/admin/merchants/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) });

export const getCampaigns = () => request<Campaign[]>("/admin/campaigns");
export const setCampaignActive = (id: string, isActive: boolean) =>
  request<Campaign>(`/admin/campaigns/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) });

export const getUsers = () => request<PlatformUser[]>("/admin/users");
export const getSessions = () => request<Session[]>("/admin/sessions");

export const etb = (value: number) => `${value.toLocaleString("en-US")} ETB`;
