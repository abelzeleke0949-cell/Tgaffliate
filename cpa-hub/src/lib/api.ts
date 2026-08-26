const API_BASE_URL = import.meta.env["VITE_API_URL"] || "http://localhost:5001/api";
const WEBHOOK_SECRET = import.meta.env["VITE_CHAPA_WEBHOOK_SECRET"] as string | undefined;

const TOKEN_KEY = "gulit_cpa_token";

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
};

export type Merchant = {
  _id: string;
  businessName: string;
  email: string;
  walletBalance: number;
  totalDeposited: number;
  totalSpent: number;
};

export type Campaign = {
  _id: string;
  merchantId: string | { _id: string; businessName: string };
  productName: string;
  productDescription?: string;
  productPrice?: number;
  totalBudget: number;
  budgetRemaining: number;
  cpaReward: number;
  salesGenerated: number;
  isActive: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = false, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
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

// ---- Auth ----

export const registerMerchant = (data: { businessName: string; email: string; password: string }) =>
  request<{ token: string; merchant: Merchant }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const loginMerchant = (data: { email: string; password: string }) =>
  request<{ token: string; merchant: Merchant }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getMe = () => request<Merchant>("/auth/me", { auth: true });

// ---- Merchant wallet ----

export const initializeDeposit = (amount: number) =>
  request<{ checkoutUrl: string; txRef: string }>("/merchant/deposit/initialize", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ amount }),
  });

export const verifyDeposit = (txRef: string) =>
  request<{ walletBalance: number; totalDeposited: number }>(
    `/merchant/deposit/verify/${encodeURIComponent(txRef)}`,
    { auth: true },
  );

// ---- Campaigns ----

export const getActiveCampaigns = () => request<Campaign[]>("/campaigns?isActive=true");

export const getMyCampaigns = () => request<Campaign[]>("/campaigns/mine/list", { auth: true });

export const createCampaign = (data: {
  productName: string;
  totalBudget: number;
  cpaReward: number;
}) =>
  request<Campaign>("/campaigns", {
    method: "POST",
    auth: true,
    body: JSON.stringify(data),
  });

// ---- Conversion webhook (mock Chapa) ----

export const processConversion = (buyerTelegramId: string, campaignId: string) =>
  request<{ influencerNewBalance: number; campaignBudgetRemaining: number }>(
    "/webhooks/chapa-mock",
    {
      method: "POST",
      headers: WEBHOOK_SECRET ? { "X-Webhook-Secret": WEBHOOK_SECRET } : {},
      body: JSON.stringify({ buyerTelegramId, campaignId }),
    },
  );

export const etb = (value: number) => `${value.toLocaleString("en-US")} ETB`;
