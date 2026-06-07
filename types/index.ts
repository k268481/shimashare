// シマシェアの主要ドメイン型（SPEC.md 準拠）

export type UserRole = "super_admin" | "moderator" | "user";

export interface User {
  id: string;
  email: string;
  nickname: string;
  // 都道府県・市区町村・島（任意）で地域を表現
  prefecture: string;
  city: string;
  island?: string;
  pictureUrl?: string;
  role: UserRole;
  // 個人情報（本人と運営のみ閲覧可）
  realName?: string;
  address?: string;
  phone?: string;
  createdAt: string;
}

// 他ユーザーに見せてよい公開プロフィール（ジモティー方式）
export interface PublicProfile {
  id: string;
  nickname: string;
  prefecture: string;
  city: string;
  island?: string;
  pictureUrl?: string;
  role: UserRole;
}

// 地域の表示文字列を生成するユーティリティ
export function formatLocation(
  user: Pick<User, "prefecture" | "city" | "island">,
): string {
  const base = `${user.prefecture}${user.city}`;
  return user.island ? `${base}（${user.island}）` : base;
}

// SPEC.md 3.6: 6大分類
export type Category =
  | "food"
  | "daily"
  | "clothing"
  | "baby"
  | "appliance"
  | "other";

export const CATEGORY_LABELS: Record<Category, string> = {
  food: "食品（生鮮含む）",
  daily: "日用品",
  clothing: "衣類",
  baby: "ベビー・キッズ",
  appliance: "家電・道具",
  other: "その他",
};

export type ListingStatus = "active" | "matched" | "completed" | "hidden";

export interface Listing {
  id: string;
  userId: string;
  title: string;
  description: string;
  price: number; // 0 = ゆずります
  category: Category;
  photos: string[];
  handover: string;
  status: ListingStatus;
  createdAt: string;
  // 表示用（join済み想定）
  userNickname?: string;
  userLocation?: string; // formatLocation済みの文字列
}

export interface Conversation {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: "open" | "completed";
  createdAt: string;
  // 表示用
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  partnerNickname?: string;
  partnerLocation?: string;
  listingTitle?: string;
  listingPhoto?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  createdAt: string;
}

export type ResponseChannel = "line" | "phone";

export interface Shop {
  id: string;
  name: string;
  location: string; // 表示用（例: 沖縄県石垣市）
  phone: string;
  lineUserId?: string;
  responseChannel: ResponseChannel;
  itemsDescription: string;
  openingHours?: string;
  address?: string;
}

export type RequestStatus =
  | "pending"
  | "ok"
  | "ng"
  | "alternative"
  | "received"
  | "expired";

export interface ShopRequest {
  id: string;
  userId: string;
  shopId: string;
  item: string;
  quantity: number;
  deadline?: string;
  note?: string;
  status: RequestStatus;
  shopReply?: string;
  createdAt: string;
}

// 緊急モード（台風）
export interface EmergencyMode {
  active: boolean;
  startedAt?: string;
  endedAt?: string;
  triggerSource: "auto" | "manual";
  warningText?: string;
}

export type StockStatus = "out_of_stock" | "restocked" | "low_stock";

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  out_of_stock: "品切れ",
  restocked: "入荷",
  low_stock: "在庫少",
};

export interface StockAlert {
  id: string;
  userId: string;
  userNickname: string;
  location: string; // 表示用
  shopName?: string;
  item: string;
  status: StockStatus;
  comment?: string;
  createdAt: string;
}
