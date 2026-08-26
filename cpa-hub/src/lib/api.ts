const API_BASE_URL = import.meta.env["VITE_API_URL"] || "http://localhost:5001/api";

// Origin (no /api suffix) that uploaded images are served from
const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
export const imageUrl = (path: string) => `${apiOrigin}${path}`;

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

export type Product = {
  _id: string;
  merchantId: string | { _id: string; businessName: string };
  name: string;
  description: string;
  images: string[];
  price: number;
  category: string;
  stockQuantity: number | null;
  isActive: boolean;
};

export type Campaign = {
  _id: string;
  merchantId: string | { _id: string; businessName: string };
  productIds: Product[];
  totalBudget: number;
  budgetRemaining: number;
  cpaReward: number;
  salesGenerated: number;
  isActive: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  endDate: string;
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
  const isFormData = rest.body instanceof FormData;
  const finalHeaders: Record<string, string> = {
    // Omit Content-Type for FormData — the browser sets its own multipart boundary
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
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

// ---- Products (merchant catalog) ----

export const getMyProducts = () => request<Product[]>("/products/mine/list", { auth: true });

export const getProduct = (id: string) => request<Product>(`/products/${id}`);

export const createProduct = (data: {
  name: string;
  description: string;
  price: number;
  category: string;
  stockQuantity?: number | undefined;
  images: File[];
}) => {
  const formData = new FormData();
  formData.append("name", data.name);
  formData.append("description", data.description);
  formData.append("price", String(data.price));
  formData.append("category", data.category);
  if (data.stockQuantity !== undefined) formData.append("stockQuantity", String(data.stockQuantity));
  data.images.forEach((image) => formData.append("images", image));

  return request<Product>("/products", {
    method: "POST",
    auth: true,
    body: formData,
  });
};

export const updateProduct = (id: string, data: Partial<Pick<Product, "isActive">>) =>
  request<Product>(`/products/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(data),
  });

// ---- Campaigns ----

export const getActiveCampaigns = () => request<Campaign[]>("/campaigns?isActive=true");

export const getMyCampaigns = () => request<Campaign[]>("/campaigns/mine/list", { auth: true });

export const createCampaign = (data: {
  productIds: string[];
  totalBudget: number;
  cpaReward: number;
  endDate: string;
}) =>
  request<Campaign>("/campaigns", {
    method: "POST",
    auth: true,
    body: JSON.stringify(data),
  });

// ---- Buyer purchase (real Chapa checkout) ----

export const initializePurchase = (data: {
  buyerTelegramId: string;
  campaignId: string;
  productId: string;
  buyerName?: string | undefined;
}) =>
  request<{ checkoutUrl: string; txRef: string }>("/webhooks/purchase/initialize", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const verifyPurchase = (txRef: string) =>
  request<{ campaignBudgetRemaining?: number; influencerNewBalance?: number }>(
    `/webhooks/purchase/verify/${encodeURIComponent(txRef)}`,
  );

export const etb = (value: number) => `${value.toLocaleString("en-US")} ETB`;
