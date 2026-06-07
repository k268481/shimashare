import "server-only";
import { getDb } from "@/lib/db";
import { formatLocation } from "@/types";
import type {
  Category,
  Conversation,
  EmergencyMode,
  Listing,
  ListingStatus,
  Message,
  PublicProfile,
  Shop,
  ShopRequest,
  StockAlert,
  StockStatus,
  User,
  UserRole,
} from "@/types";

// ── 行マッパー ──────────────────────────────────────────────────────
type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  nickname: string;
  prefecture: string;
  city: string;
  island: string | null;
  picture_url: string | null;
  role: UserRole;
  real_name: string | null;
  address: string | null;
  phone: string | null;
  proxy_for_household: number;
  is_adult: number;
  created_at: string;
};

function toUser(r: UserRow): User {
  return {
    id: r.id,
    email: r.email,
    nickname: r.nickname,
    prefecture: r.prefecture,
    city: r.city,
    island: r.island ?? undefined,
    pictureUrl: r.picture_url ?? undefined,
    role: r.role,
    realName: r.real_name ?? undefined,
    address: r.address ?? undefined,
    phone: r.phone ?? undefined,
    createdAt: r.created_at,
  };
}

// ── ユーザー ────────────────────────────────────────────────────────
export function getUserById(id: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function getUserRowByEmail(email: string): UserRow | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase()) as UserRow | undefined;
  return row ?? null;
}

export function getPublicProfile(id: string): PublicProfile | null {
  const row = getDb()
    .prepare("SELECT id, nickname, prefecture, city, island, picture_url, role FROM users WHERE id = ?")
    .get(id) as
    | { id: string; nickname: string; prefecture: string; city: string; island: string | null; picture_url: string | null; role: UserRole }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    nickname: row.nickname,
    prefecture: row.prefecture,
    city: row.city,
    island: row.island ?? undefined,
    pictureUrl: row.picture_url ?? undefined,
    role: row.role,
  };
}

export function emailExists(email: string): boolean {
  return !!getDb().prepare("SELECT 1 FROM users WHERE email = ?").get(email.toLowerCase());
}

export function createUser(input: {
  email: string;
  passwordHash: string;
  nickname: string;
  prefecture: string;
  city: string;
  island?: string;
  realName?: string;
  phone?: string;
  proxyForHousehold?: boolean;
}): User {
  const id = crypto.randomUUID();
  getDb()
    .prepare(
      `INSERT INTO users (id, email, password_hash, nickname, prefecture, city, island, real_name, phone, proxy_for_household, is_adult, created_at)
       VALUES (@id, @email, @hash, @nickname, @prefecture, @city, @island, @realName, @phone, @proxy, 1, @createdAt)`,
    )
    .run({
      id,
      email: input.email.toLowerCase(),
      hash: input.passwordHash,
      nickname: input.nickname,
      prefecture: input.prefecture,
      city: input.city,
      island: input.island ?? null,
      realName: input.realName ?? null,
      phone: input.phone ?? null,
      proxy: input.proxyForHousehold ? 1 : 0,
      createdAt: new Date().toISOString(),
    });
  return getUserById(id)!;
}

export function updateUserProfile(
  userId: string,
  input: {
    nickname: string;
    prefecture: string;
    city: string;
    island?: string;
    realName?: string;
    phone?: string;
    address?: string;
  },
): void {
  getDb()
    .prepare(
      `UPDATE users SET nickname = @nickname, prefecture = @prefecture, city = @city, island = @island,
         real_name = @realName, phone = @phone, address = @address
       WHERE id = @id`,
    )
    .run({
      id: userId,
      nickname: input.nickname,
      prefecture: input.prefecture,
      city: input.city,
      island: input.island ?? null,
      realName: input.realName ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
    });
}

// ── 出品 ────────────────────────────────────────────────────────────
type ListingRow = {
  id: string; user_id: string; title: string; description: string;
  price: number; category: Category; photos: string; handover: string;
  status: ListingStatus; is_emergency_offer: number; created_at: string;
  user_nickname?: string; user_prefecture?: string; user_city?: string; user_island?: string | null;
};

function toListing(r: ListingRow): Listing {
  let photos: string[] = [];
  try { photos = JSON.parse(r.photos); } catch { photos = []; }
  const userLocation = r.user_prefecture
    ? formatLocation({ prefecture: r.user_prefecture, city: r.user_city ?? "", island: r.user_island ?? undefined })
    : undefined;
  return {
    id: r.id, userId: r.user_id, title: r.title, description: r.description,
    price: r.price, category: r.category, photos, handover: r.handover,
    status: r.status, createdAt: r.created_at,
    userNickname: r.user_nickname, userLocation,
  };
}

export function listListings(filters?: { category?: Category; freeOnly?: boolean; query?: string }): Listing[] {
  const where: string[] = ["l.status != 'hidden'"];
  const params: Record<string, unknown> = {};
  if (filters?.category) { where.push("l.category = @category"); params.category = filters.category; }
  if (filters?.freeOnly) { where.push("l.price = 0"); }
  if (filters?.query?.trim()) {
    where.push("(l.title LIKE @q OR l.description LIKE @q)");
    params.q = `%${filters.query.trim()}%`;
  }
  const rows = getDb()
    .prepare(
      `SELECT l.*, u.nickname AS user_nickname, u.prefecture AS user_prefecture,
              u.city AS user_city, u.island AS user_island
       FROM listings l JOIN users u ON u.id = l.user_id
       WHERE ${where.join(" AND ")}
       ORDER BY (l.price = 0) DESC, l.created_at DESC`,
    )
    .all(params) as ListingRow[];
  return rows.map(toListing);
}

export function listListingsByUser(userId: string): Listing[] {
  const rows = getDb()
    .prepare(
      `SELECT l.*, u.nickname AS user_nickname, u.prefecture AS user_prefecture,
              u.city AS user_city, u.island AS user_island
       FROM listings l JOIN users u ON u.id = l.user_id
       WHERE l.user_id = ? ORDER BY l.created_at DESC`,
    )
    .all(userId) as ListingRow[];
  return rows.map(toListing);
}

export function getListing(id: string): Listing | null {
  const row = getDb()
    .prepare(
      `SELECT l.*, u.nickname AS user_nickname, u.prefecture AS user_prefecture,
              u.city AS user_city, u.island AS user_island
       FROM listings l JOIN users u ON u.id = l.user_id WHERE l.id = ?`,
    )
    .get(id) as ListingRow | undefined;
  return row ? toListing(row) : null;
}

export function createListing(input: {
  userId: string; title: string; description: string; price: number;
  category: Category; photos: string[]; handover: string;
}): string {
  const id = crypto.randomUUID();
  getDb()
    .prepare(
      `INSERT INTO listings (id, user_id, title, description, price, category, photos, handover, is_emergency_offer, created_at)
       VALUES (@id, @userId, @title, @description, @price, @category, @photos, @handover, @emergency, @createdAt)`,
    )
    .run({
      id, userId: input.userId, title: input.title, description: input.description,
      price: input.price, category: input.category, photos: JSON.stringify(input.photos),
      handover: input.handover, emergency: input.price === 0 ? 1 : 0,
      createdAt: new Date().toISOString(),
    });
  return id;
}

export function deleteListing(id: string, userId: string): void {
  getDb().prepare("DELETE FROM listings WHERE id = ? AND user_id = ?").run(id, userId);
}

// ── チャット ────────────────────────────────────────────────────────
export function getOrCreateConversation(listingId: string, buyerId: string): string | null {
  const db = getDb();
  const listing = db.prepare("SELECT user_id FROM listings WHERE id = ?").get(listingId) as { user_id: string } | undefined;
  if (!listing) return null;
  if (listing.user_id === buyerId) return null;
  const existing = db.prepare("SELECT id FROM conversations WHERE listing_id = ? AND buyer_id = ?").get(listingId, buyerId) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO conversations (id, listing_id, buyer_id, seller_id, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run(id, listingId, buyerId, listing.user_id, new Date().toISOString());
  return id;
}

export function listConversationsForUser(userId: string): Conversation[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.*, l.title AS listing_title, l.photos AS listing_photos
       FROM conversations c JOIN listings l ON l.id = c.listing_id
       WHERE c.buyer_id = ? OR c.seller_id = ?`,
    )
    .all(userId, userId) as Array<{
      id: string; listing_id: string; buyer_id: string; seller_id: string;
      status: "open" | "completed"; buyer_last_read_at: string | null;
      seller_last_read_at: string | null; created_at: string;
      listing_title: string; listing_photos: string;
    }>;

  const result: Conversation[] = rows.map((r) => {
    const isBuyer = r.buyer_id === userId;
    const partnerId = isBuyer ? r.seller_id : r.buyer_id;
    const partner = getPublicProfile(partnerId);
    const lastMsg = db.prepare(
      "SELECT text, image_url, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1",
    ).get(r.id) as { text: string | null; image_url: string | null; created_at: string } | undefined;
    const lastReadAt = isBuyer ? r.buyer_last_read_at : r.seller_last_read_at;
    const unread = db.prepare(
      `SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ? AND sender_id != ? AND (@lastRead IS NULL OR created_at > @lastRead)`,
    ).get(r.id, userId, { lastRead: lastReadAt }) as { n: number };
    let listingPhoto: string | undefined;
    try { listingPhoto = JSON.parse(r.listing_photos)[0]; } catch { /* noop */ }
    return {
      id: r.id, listingId: r.listing_id, buyerId: r.buyer_id, sellerId: r.seller_id,
      status: r.status, createdAt: r.created_at,
      lastMessage: lastMsg?.text ?? (lastMsg?.image_url ? "画像を送信しました" : undefined),
      lastMessageAt: lastMsg?.created_at, unreadCount: unread.n,
      partnerNickname: partner?.nickname,
      partnerLocation: partner ? formatLocation(partner) : undefined,
      listingTitle: r.listing_title, listingPhoto,
    };
  });
  result.sort((a, b) =>
    new Date(b.lastMessageAt ?? b.createdAt).getTime() - new Date(a.lastMessageAt ?? a.createdAt).getTime()
  );
  return result;
}

export function getConversation(id: string, userId: string): Conversation | null {
  const db = getDb();
  const r = db
    .prepare(
      `SELECT c.*, l.title AS listing_title, l.photos AS listing_photos
       FROM conversations c JOIN listings l ON l.id = c.listing_id WHERE c.id = ?`,
    )
    .get(id) as {
      id: string; listing_id: string; buyer_id: string; seller_id: string;
      status: "open" | "completed"; created_at: string; listing_title: string; listing_photos: string;
    } | undefined;
  if (!r) return null;
  if (r.buyer_id !== userId && r.seller_id !== userId) return null;
  const partnerId = r.buyer_id === userId ? r.seller_id : r.buyer_id;
  const partner = getPublicProfile(partnerId);
  let listingPhoto: string | undefined;
  try { listingPhoto = JSON.parse(r.listing_photos)[0]; } catch { /* noop */ }
  return {
    id: r.id, listingId: r.listing_id, buyerId: r.buyer_id, sellerId: r.seller_id,
    status: r.status, createdAt: r.created_at,
    partnerNickname: partner?.nickname,
    partnerLocation: partner ? formatLocation(partner) : undefined,
    listingTitle: r.listing_title, listingPhoto,
  };
}

export function listMessages(conversationId: string): Message[] {
  const rows = getDb()
    .prepare("SELECT id, conversation_id, sender_id, text, image_url, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at")
    .all(conversationId) as Array<{ id: string; conversation_id: string; sender_id: string; text: string | null; image_url: string | null; created_at: string }>;
  return rows.map((r) => ({
    id: r.id, conversationId: r.conversation_id, senderId: r.sender_id,
    text: r.text ?? undefined, imageUrl: r.image_url ?? undefined, createdAt: r.created_at,
  }));
}

export function sendMessage(input: { conversationId: string; senderId: string; text?: string; imageUrl?: string }): Message {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  getDb().prepare(`INSERT INTO messages (id, conversation_id, sender_id, text, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, input.conversationId, input.senderId, input.text ?? null, input.imageUrl ?? null, createdAt);
  return { id, conversationId: input.conversationId, senderId: input.senderId,
    text: input.text, imageUrl: input.imageUrl, createdAt };
}

export function markConversationRead(conversationId: string, userId: string): void {
  const db = getDb();
  const conv = db.prepare("SELECT buyer_id, seller_id FROM conversations WHERE id = ?").get(conversationId) as { buyer_id: string; seller_id: string } | undefined;
  if (!conv) return;
  const col = conv.buyer_id === userId ? "buyer_last_read_at" : "seller_last_read_at";
  db.prepare(`UPDATE conversations SET ${col} = ? WHERE id = ?`).run(new Date().toISOString(), conversationId);
}

// ── 取引完了・評価 ──────────────────────────────────────────────────
export type TransactionState = {
  id: string; conversationId: string;
  sellerCompleted: boolean; buyerCompleted: boolean;
  completedAt?: string; myReviewDone: boolean;
};

export function getOrCreateTransaction(conversationId: string, userId: string): TransactionState | null {
  const db = getDb();
  const conv = db.prepare("SELECT buyer_id, seller_id FROM conversations WHERE id = ?").get(conversationId) as { buyer_id: string; seller_id: string } | undefined;
  if (!conv || (conv.buyer_id !== userId && conv.seller_id !== userId)) return null;
  let tx = db.prepare("SELECT * FROM transactions WHERE conversation_id = ?").get(conversationId) as
    | { id: string; seller_completed: number; buyer_completed: number; completed_at: string | null } | undefined;
  if (!tx) {
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO transactions (id, conversation_id, created_at) VALUES (?, ?, ?)").run(id, conversationId, new Date().toISOString());
    tx = { id, seller_completed: 0, buyer_completed: 0, completed_at: null };
  }
  const myReview = db.prepare("SELECT 1 FROM reviews WHERE transaction_id = ? AND reviewer_id = ?").get(tx.id, userId);
  return { id: tx.id, conversationId, sellerCompleted: !!tx.seller_completed,
    buyerCompleted: !!tx.buyer_completed, completedAt: tx.completed_at ?? undefined, myReviewDone: !!myReview };
}

export function setTransactionCompleted(conversationId: string, userId: string, completed: boolean): TransactionState | null {
  const db = getDb();
  const conv = db.prepare("SELECT buyer_id, seller_id FROM conversations WHERE id = ?").get(conversationId) as { buyer_id: string; seller_id: string } | undefined;
  if (!conv) return null;
  const isSeller = conv.seller_id === userId;
  const isBuyer = conv.buyer_id === userId;
  if (!isSeller && !isBuyer) return null;
  getOrCreateTransaction(conversationId, userId);
  const col = isSeller ? "seller_completed" : "buyer_completed";
  db.prepare(`UPDATE transactions SET ${col} = ? WHERE conversation_id = ?`).run(completed ? 1 : 0, conversationId);
  const tx = db.prepare("SELECT * FROM transactions WHERE conversation_id = ?").get(conversationId) as { seller_completed: number; buyer_completed: number };
  if (tx.seller_completed && tx.buyer_completed) {
    db.prepare("UPDATE transactions SET completed_at = ? WHERE conversation_id = ? AND completed_at IS NULL").run(new Date().toISOString(), conversationId);
    db.prepare("UPDATE conversations SET status = 'completed' WHERE id = ?").run(conversationId);
  } else {
    db.prepare("UPDATE conversations SET status = 'open' WHERE id = ?").run(conversationId);
  }
  return getOrCreateTransaction(conversationId, userId);
}

export function createReview(input: { conversationId: string; reviewerId: string; rating: "good" | "normal" | "bad"; comment?: string }): boolean {
  const db = getDb();
  const conv = db.prepare("SELECT buyer_id, seller_id FROM conversations WHERE id = ?").get(input.conversationId) as { buyer_id: string; seller_id: string } | undefined;
  if (!conv || (conv.buyer_id !== input.reviewerId && conv.seller_id !== input.reviewerId)) return false;
  const targetId = conv.buyer_id === input.reviewerId ? conv.seller_id : conv.buyer_id;
  const tx = db.prepare("SELECT id FROM transactions WHERE conversation_id = ?").get(input.conversationId) as { id: string } | undefined;
  if (!tx) return false;
  try {
    db.prepare(`INSERT INTO reviews (id, transaction_id, reviewer_id, target_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(crypto.randomUUID(), tx.id, input.reviewerId, targetId, input.rating, input.comment ?? null, new Date().toISOString());
    return true;
  } catch { return false; }
}

export type ReviewSummary = {
  good: number; normal: number; bad: number; total: number;
  recent: Array<{ rating: "good" | "normal" | "bad"; comment?: string; createdAt: string }>;
};

export function getReviewSummary(userId: string): ReviewSummary {
  const db = getDb();
  const counts = db.prepare("SELECT rating, COUNT(*) AS n FROM reviews WHERE target_id = ? GROUP BY rating").all(userId) as Array<{ rating: "good" | "normal" | "bad"; n: number }>;
  const summary: ReviewSummary = { good: 0, normal: 0, bad: 0, total: 0, recent: [] };
  counts.forEach((c) => { summary[c.rating] = c.n; summary.total += c.n; });
  const recent = db.prepare("SELECT rating, comment, created_at FROM reviews WHERE target_id = ? ORDER BY created_at DESC LIMIT 10").all(userId) as Array<{ rating: "good" | "normal" | "bad"; comment: string | null; created_at: string }>;
  summary.recent = recent.map((r) => ({ rating: r.rating, comment: r.comment ?? undefined, createdAt: r.created_at }));
  return summary;
}

// ── 店舗 ────────────────────────────────────────────────────────────
type ShopRow = {
  id: string; name: string; location: string; phone: string;
  line_user_id: string | null; response_channel: "line" | "phone";
  items_description: string; opening_hours: string | null; address: string | null;
};

function toShop(r: ShopRow): Shop {
  return { id: r.id, name: r.name, location: r.location, phone: r.phone,
    lineUserId: r.line_user_id ?? undefined, responseChannel: r.response_channel,
    itemsDescription: r.items_description, openingHours: r.opening_hours ?? undefined, address: r.address ?? undefined };
}

export function listShops(): Shop[] {
  return (getDb().prepare("SELECT * FROM shops ORDER BY name").all() as ShopRow[]).map(toShop);
}

export function getShop(id: string): Shop | null {
  const row = getDb().prepare("SELECT * FROM shops WHERE id = ?").get(id) as ShopRow | undefined;
  return row ? toShop(row) : null;
}

export function createShopRequest(input: { userId: string; shopId: string; item: string; quantity: number; note?: string }): string {
  const id = crypto.randomUUID();
  getDb().prepare(`INSERT INTO shop_requests (id, user_id, shop_id, item, quantity, note, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`)
    .run(id, input.userId, input.shopId, input.item, input.quantity, input.note ?? null, new Date().toISOString());
  return id;
}

export function listShopRequestsForUser(userId: string): ShopRequest[] {
  const rows = getDb().prepare("SELECT * FROM shop_requests WHERE user_id = ? ORDER BY created_at DESC").all(userId) as Array<{
    id: string; user_id: string; shop_id: string; item: string; quantity: number;
    deadline: string | null; note: string | null; status: ShopRequest["status"]; shop_reply: string | null; created_at: string;
  }>;
  return rows.map((r) => ({ id: r.id, userId: r.user_id, shopId: r.shop_id, item: r.item,
    quantity: r.quantity, deadline: r.deadline ?? undefined, note: r.note ?? undefined,
    status: r.status, shopReply: r.shop_reply ?? undefined, createdAt: r.created_at }));
}

// ── 「これがない」掲示板 ────────────────────────────────────────────
export function listStockAlerts(): StockAlert[] {
  const rows = getDb()
    .prepare(`SELECT a.*, u.nickname AS user_nickname FROM stock_alerts a JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC`)
    .all() as Array<{ id: string; user_id: string; user_nickname: string; location: string; shop_name: string | null; item: string; status: StockStatus; comment: string | null; created_at: string }>;
  return rows.map((r) => ({ id: r.id, userId: r.user_id, userNickname: r.user_nickname,
    location: r.location, shopName: r.shop_name ?? undefined, item: r.item,
    status: r.status, comment: r.comment ?? undefined, createdAt: r.created_at }));
}

export function createStockAlert(input: { userId: string; location: string; shopName?: string; item: string; status: StockStatus; comment?: string }): string {
  const id = crypto.randomUUID();
  getDb().prepare(`INSERT INTO stock_alerts (id, user_id, location, shop_name, item, status, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, input.userId, input.location, input.shopName ?? null, input.item, input.status, input.comment ?? null, new Date().toISOString());
  return id;
}

// ── 緊急（台風）モード ──────────────────────────────────────────────
export function getEmergencyMode(): EmergencyMode {
  const row = getDb().prepare("SELECT * FROM emergency_modes ORDER BY created_at DESC LIMIT 1").get() as
    | { active: number; started_at: string | null; ended_at: string | null; trigger_source: "auto" | "manual"; warning_text: string | null } | undefined;
  if (!row) return { active: false, triggerSource: "manual" };
  return { active: !!row.active, startedAt: row.started_at ?? undefined, endedAt: row.ended_at ?? undefined,
    triggerSource: row.trigger_source, warningText: row.warning_text ?? undefined };
}

export function setEmergencyMode(active: boolean, warningText?: string): EmergencyMode {
  getDb().prepare(`INSERT INTO emergency_modes (id, active, started_at, ended_at, trigger_source, warning_text, created_at) VALUES (?, ?, ?, ?, 'manual', ?, ?)`)
    .run(crypto.randomUUID(), active ? 1 : 0,
      active ? new Date().toISOString() : null,
      active ? null : new Date().toISOString(),
      active ? (warningText ?? "暴風警報発令中") : null,
      new Date().toISOString());
  return getEmergencyMode();
}
