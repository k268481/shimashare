import "server-only";
import { ensureDbReady, getSql } from "@/lib/db";
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

async function db() {
  await ensureDbReady();
  return getSql();
}

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
  proxy_for_household: boolean;
  is_adult: boolean;
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
export async function getUserById(id: string): Promise<User | null> {
  const sql = await db();
  const rows = await sql<UserRow[]>`SELECT * FROM users WHERE id = ${id}`;
  return rows[0] ? toUser(rows[0]) : null;
}

export async function getUserRowByEmail(email: string): Promise<UserRow | null> {
  const sql = await db();
  const rows = await sql<UserRow[]>`SELECT * FROM users WHERE email = ${email.toLowerCase()}`;
  return rows[0] ?? null;
}

export async function getPublicProfile(id: string): Promise<PublicProfile | null> {
  const sql = await db();
  const rows = await sql<
    Array<{
      id: string;
      nickname: string;
      prefecture: string;
      city: string;
      island: string | null;
      picture_url: string | null;
      role: UserRole;
    }>
  >`SELECT id, nickname, prefecture, city, island, picture_url, role FROM users WHERE id = ${id}`;
  const row = rows[0];
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

export async function emailExists(email: string): Promise<boolean> {
  const sql = await db();
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM users WHERE email = ${email.toLowerCase()}) AS exists
  `;
  return !!rows[0]?.exists;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  nickname: string;
  prefecture: string;
  city: string;
  island?: string;
  realName?: string;
  phone?: string;
  proxyForHousehold?: boolean;
}): Promise<User> {
  const sql = await db();
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO users (id, email, password_hash, nickname, prefecture, city, island, real_name, phone, proxy_for_household, is_adult, created_at)
    VALUES (
      ${id},
      ${input.email.toLowerCase()},
      ${input.passwordHash},
      ${input.nickname},
      ${input.prefecture},
      ${input.city},
      ${input.island ?? null},
      ${input.realName ?? null},
      ${input.phone ?? null},
      ${!!input.proxyForHousehold},
      TRUE,
      ${new Date().toISOString()}
    )
  `;
  const user = await getUserById(id);
  return user!;
}

export async function updateUserProfile(
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
): Promise<void> {
  const sql = await db();
  await sql`
    UPDATE users SET
      nickname = ${input.nickname},
      prefecture = ${input.prefecture},
      city = ${input.city},
      island = ${input.island ?? null},
      real_name = ${input.realName ?? null},
      phone = ${input.phone ?? null},
      address = ${input.address ?? null}
    WHERE id = ${userId}
  `;
}

// ── 出品 ────────────────────────────────────────────────────────────
type ListingRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  category: Category;
  photos: string;
  handover: string;
  status: ListingStatus;
  is_emergency_offer: boolean;
  created_at: string;
  user_nickname?: string;
  user_prefecture?: string;
  user_city?: string;
  user_island?: string | null;
};

function toListing(r: ListingRow): Listing {
  let photos: string[] = [];
  try {
    photos = JSON.parse(r.photos);
  } catch {
    photos = [];
  }
  const userLocation = r.user_prefecture
    ? formatLocation({
        prefecture: r.user_prefecture,
        city: r.user_city ?? "",
        island: r.user_island ?? undefined,
      })
    : undefined;
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    description: r.description,
    price: r.price,
    category: r.category,
    photos,
    handover: r.handover,
    status: r.status,
    createdAt: r.created_at,
    userNickname: r.user_nickname,
    userLocation,
  };
}

export async function listListings(filters?: {
  category?: Category;
  freeOnly?: boolean;
  query?: string;
}): Promise<Listing[]> {
  const sql = await db();
  const cat = filters?.category ?? null;
  const freeOnly = filters?.freeOnly ?? false;
  const q = filters?.query?.trim() ? `%${filters.query.trim()}%` : null;

  const rows = await sql<ListingRow[]>`
    SELECT l.*, u.nickname AS user_nickname, u.prefecture AS user_prefecture,
           u.city AS user_city, u.island AS user_island
    FROM listings l JOIN users u ON u.id = l.user_id
    WHERE l.status != 'hidden'
      AND (${cat}::text IS NULL OR l.category = ${cat})
      AND (${freeOnly} = FALSE OR l.price = 0)
      AND (${q}::text IS NULL OR l.title ILIKE ${q} OR l.description ILIKE ${q})
    ORDER BY (l.price = 0) DESC, l.created_at DESC
  `;
  return rows.map(toListing);
}

export async function listListingsByUser(userId: string): Promise<Listing[]> {
  const sql = await db();
  const rows = await sql<ListingRow[]>`
    SELECT l.*, u.nickname AS user_nickname, u.prefecture AS user_prefecture,
           u.city AS user_city, u.island AS user_island
    FROM listings l JOIN users u ON u.id = l.user_id
    WHERE l.user_id = ${userId}
    ORDER BY l.created_at DESC
  `;
  return rows.map(toListing);
}

export async function getListing(id: string): Promise<Listing | null> {
  const sql = await db();
  const rows = await sql<ListingRow[]>`
    SELECT l.*, u.nickname AS user_nickname, u.prefecture AS user_prefecture,
           u.city AS user_city, u.island AS user_island
    FROM listings l JOIN users u ON u.id = l.user_id
    WHERE l.id = ${id}
  `;
  return rows[0] ? toListing(rows[0]) : null;
}

export async function createListing(input: {
  userId: string;
  title: string;
  description: string;
  price: number;
  category: Category;
  photos: string[];
  handover: string;
}): Promise<string> {
  const sql = await db();
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO listings (id, user_id, title, description, price, category, photos, handover, is_emergency_offer, created_at)
    VALUES (
      ${id},
      ${input.userId},
      ${input.title},
      ${input.description},
      ${input.price},
      ${input.category},
      ${JSON.stringify(input.photos)},
      ${input.handover},
      ${input.price === 0},
      ${new Date().toISOString()}
    )
  `;
  return id;
}

export async function deleteListing(id: string, userId: string): Promise<void> {
  const sql = await db();
  await sql`DELETE FROM listings WHERE id = ${id} AND user_id = ${userId}`;
}

// ── チャット ────────────────────────────────────────────────────────
export async function getOrCreateConversation(
  listingId: string,
  buyerId: string,
): Promise<string | null> {
  const sql = await db();
  const listing = await sql<{ user_id: string }[]>`SELECT user_id FROM listings WHERE id = ${listingId}`;
  if (!listing[0]) return null;
  if (listing[0].user_id === buyerId) return null;
  const existing = await sql<{ id: string }[]>`
    SELECT id FROM conversations WHERE listing_id = ${listingId} AND buyer_id = ${buyerId}
  `;
  if (existing[0]) return existing[0].id;
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO conversations (id, listing_id, buyer_id, seller_id, created_at)
    VALUES (${id}, ${listingId}, ${buyerId}, ${listing[0].user_id}, ${new Date().toISOString()})
  `;
  return id;
}

export async function listConversationsForUser(userId: string): Promise<Conversation[]> {
  const sql = await db();
  const rows = await sql<
    Array<{
      id: string;
      listing_id: string;
      buyer_id: string;
      seller_id: string;
      status: "open" | "completed";
      buyer_last_read_at: string | null;
      seller_last_read_at: string | null;
      created_at: string;
      listing_title: string;
      listing_photos: string;
    }>
  >`
    SELECT c.*, l.title AS listing_title, l.photos AS listing_photos
    FROM conversations c JOIN listings l ON l.id = c.listing_id
    WHERE c.buyer_id = ${userId} OR c.seller_id = ${userId}
  `;

  const result: Conversation[] = [];
  for (const r of rows) {
    const isBuyer = r.buyer_id === userId;
    const partnerId = isBuyer ? r.seller_id : r.buyer_id;
    const partner = await getPublicProfile(partnerId);
    const lastMsgRows = await sql<
      Array<{ text: string | null; image_url: string | null; created_at: string }>
    >`SELECT text, image_url, created_at FROM messages WHERE conversation_id = ${r.id} ORDER BY created_at DESC LIMIT 1`;
    const lastMsg = lastMsgRows[0];
    const lastReadAt = isBuyer ? r.buyer_last_read_at : r.seller_last_read_at;
    const unreadRows = await sql<{ n: string }[]>`
      SELECT COUNT(*)::text AS n FROM messages
      WHERE conversation_id = ${r.id}
        AND sender_id != ${userId}
        AND (${lastReadAt}::text IS NULL OR created_at > ${lastReadAt})
    `;
    let listingPhoto: string | undefined;
    try {
      listingPhoto = JSON.parse(r.listing_photos)[0];
    } catch {
      /* noop */
    }
    result.push({
      id: r.id,
      listingId: r.listing_id,
      buyerId: r.buyer_id,
      sellerId: r.seller_id,
      status: r.status,
      createdAt: r.created_at,
      lastMessage:
        lastMsg?.text ?? (lastMsg?.image_url ? "画像を送信しました" : undefined),
      lastMessageAt: lastMsg?.created_at,
      unreadCount: Number(unreadRows[0]?.n ?? 0),
      partnerNickname: partner?.nickname,
      partnerLocation: partner ? formatLocation(partner) : undefined,
      listingTitle: r.listing_title,
      listingPhoto,
    });
  }
  result.sort(
    (a, b) =>
      new Date(b.lastMessageAt ?? b.createdAt).getTime() -
      new Date(a.lastMessageAt ?? a.createdAt).getTime(),
  );
  return result;
}

export async function getConversation(id: string, userId: string): Promise<Conversation | null> {
  const sql = await db();
  const rows = await sql<
    Array<{
      id: string;
      listing_id: string;
      buyer_id: string;
      seller_id: string;
      status: "open" | "completed";
      created_at: string;
      listing_title: string;
      listing_photos: string;
    }>
  >`
    SELECT c.*, l.title AS listing_title, l.photos AS listing_photos
    FROM conversations c JOIN listings l ON l.id = c.listing_id
    WHERE c.id = ${id}
  `;
  const r = rows[0];
  if (!r) return null;
  if (r.buyer_id !== userId && r.seller_id !== userId) return null;
  const partnerId = r.buyer_id === userId ? r.seller_id : r.buyer_id;
  const partner = await getPublicProfile(partnerId);
  let listingPhoto: string | undefined;
  try {
    listingPhoto = JSON.parse(r.listing_photos)[0];
  } catch {
    /* noop */
  }
  return {
    id: r.id,
    listingId: r.listing_id,
    buyerId: r.buyer_id,
    sellerId: r.seller_id,
    status: r.status,
    createdAt: r.created_at,
    partnerNickname: partner?.nickname,
    partnerLocation: partner ? formatLocation(partner) : undefined,
    listingTitle: r.listing_title,
    listingPhoto,
  };
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const sql = await db();
  const rows = await sql<
    Array<{
      id: string;
      conversation_id: string;
      sender_id: string;
      text: string | null;
      image_url: string | null;
      created_at: string;
    }>
  >`
    SELECT id, conversation_id, sender_id, text, image_url, created_at
    FROM messages WHERE conversation_id = ${conversationId} ORDER BY created_at
  `;
  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversation_id,
    senderId: r.sender_id,
    text: r.text ?? undefined,
    imageUrl: r.image_url ?? undefined,
    createdAt: r.created_at,
  }));
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
}): Promise<Message> {
  const sql = await db();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await sql`
    INSERT INTO messages (id, conversation_id, sender_id, text, image_url, created_at)
    VALUES (${id}, ${input.conversationId}, ${input.senderId}, ${input.text ?? null}, ${input.imageUrl ?? null}, ${createdAt})
  `;
  return {
    id,
    conversationId: input.conversationId,
    senderId: input.senderId,
    text: input.text,
    imageUrl: input.imageUrl,
    createdAt,
  };
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  const sql = await db();
  const convRows = await sql<{ buyer_id: string; seller_id: string }[]>`
    SELECT buyer_id, seller_id FROM conversations WHERE id = ${conversationId}
  `;
  const conv = convRows[0];
  if (!conv) return;
  const now = new Date().toISOString();
  if (conv.buyer_id === userId) {
    await sql`UPDATE conversations SET buyer_last_read_at = ${now} WHERE id = ${conversationId}`;
  } else if (conv.seller_id === userId) {
    await sql`UPDATE conversations SET seller_last_read_at = ${now} WHERE id = ${conversationId}`;
  }
}

// ── 取引完了・評価 ──────────────────────────────────────────────────
export type TransactionState = {
  id: string;
  conversationId: string;
  sellerCompleted: boolean;
  buyerCompleted: boolean;
  completedAt?: string;
  myReviewDone: boolean;
};

export async function getOrCreateTransaction(
  conversationId: string,
  userId: string,
): Promise<TransactionState | null> {
  const sql = await db();
  const convRows = await sql<{ buyer_id: string; seller_id: string }[]>`
    SELECT buyer_id, seller_id FROM conversations WHERE id = ${conversationId}
  `;
  const conv = convRows[0];
  if (!conv || (conv.buyer_id !== userId && conv.seller_id !== userId)) return null;
  let txRows = await sql<
    Array<{
      id: string;
      seller_completed: boolean;
      buyer_completed: boolean;
      completed_at: string | null;
    }>
  >`SELECT id, seller_completed, buyer_completed, completed_at FROM transactions WHERE conversation_id = ${conversationId}`;
  let tx = txRows[0];
  if (!tx) {
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO transactions (id, conversation_id, created_at)
      VALUES (${id}, ${conversationId}, ${new Date().toISOString()})
    `;
    tx = { id, seller_completed: false, buyer_completed: false, completed_at: null };
  }
  const reviewRows = await sql<{ x: number }[]>`
    SELECT 1 AS x FROM reviews WHERE transaction_id = ${tx.id} AND reviewer_id = ${userId}
  `;
  return {
    id: tx.id,
    conversationId,
    sellerCompleted: !!tx.seller_completed,
    buyerCompleted: !!tx.buyer_completed,
    completedAt: tx.completed_at ?? undefined,
    myReviewDone: reviewRows.length > 0,
  };
}

export async function setTransactionCompleted(
  conversationId: string,
  userId: string,
  completed: boolean,
): Promise<TransactionState | null> {
  const sql = await db();
  const convRows = await sql<{ buyer_id: string; seller_id: string }[]>`
    SELECT buyer_id, seller_id FROM conversations WHERE id = ${conversationId}
  `;
  const conv = convRows[0];
  if (!conv) return null;
  const isSeller = conv.seller_id === userId;
  const isBuyer = conv.buyer_id === userId;
  if (!isSeller && !isBuyer) return null;
  await getOrCreateTransaction(conversationId, userId);
  if (isSeller) {
    await sql`UPDATE transactions SET seller_completed = ${completed} WHERE conversation_id = ${conversationId}`;
  } else {
    await sql`UPDATE transactions SET buyer_completed = ${completed} WHERE conversation_id = ${conversationId}`;
  }
  const txRows = await sql<
    Array<{ seller_completed: boolean; buyer_completed: boolean }>
  >`SELECT seller_completed, buyer_completed FROM transactions WHERE conversation_id = ${conversationId}`;
  const tx = txRows[0];
  if (tx?.seller_completed && tx.buyer_completed) {
    await sql`
      UPDATE transactions SET completed_at = ${new Date().toISOString()}
      WHERE conversation_id = ${conversationId} AND completed_at IS NULL
    `;
    await sql`UPDATE conversations SET status = 'completed' WHERE id = ${conversationId}`;
  } else {
    await sql`UPDATE conversations SET status = 'open' WHERE id = ${conversationId}`;
  }
  return getOrCreateTransaction(conversationId, userId);
}

export async function createReview(input: {
  conversationId: string;
  reviewerId: string;
  rating: "good" | "normal" | "bad";
  comment?: string;
}): Promise<boolean> {
  const sql = await db();
  const convRows = await sql<{ buyer_id: string; seller_id: string }[]>`
    SELECT buyer_id, seller_id FROM conversations WHERE id = ${input.conversationId}
  `;
  const conv = convRows[0];
  if (!conv || (conv.buyer_id !== input.reviewerId && conv.seller_id !== input.reviewerId)) return false;
  const targetId = conv.buyer_id === input.reviewerId ? conv.seller_id : conv.buyer_id;
  const txRows = await sql<{ id: string }[]>`SELECT id FROM transactions WHERE conversation_id = ${input.conversationId}`;
  const tx = txRows[0];
  if (!tx) return false;
  try {
    await sql`
      INSERT INTO reviews (id, transaction_id, reviewer_id, target_id, rating, comment, created_at)
      VALUES (${crypto.randomUUID()}, ${tx.id}, ${input.reviewerId}, ${targetId}, ${input.rating}, ${input.comment ?? null}, ${new Date().toISOString()})
    `;
    return true;
  } catch {
    return false;
  }
}

export type ReviewSummary = {
  good: number;
  normal: number;
  bad: number;
  total: number;
  recent: Array<{ rating: "good" | "normal" | "bad"; comment?: string; createdAt: string }>;
};

export async function getReviewSummary(userId: string): Promise<ReviewSummary> {
  const sql = await db();
  const counts = await sql<Array<{ rating: "good" | "normal" | "bad"; n: string }>>`
    SELECT rating, COUNT(*)::text AS n FROM reviews WHERE target_id = ${userId} GROUP BY rating
  `;
  const summary: ReviewSummary = { good: 0, normal: 0, bad: 0, total: 0, recent: [] };
  counts.forEach((c) => {
    const n = Number(c.n);
    summary[c.rating] = n;
    summary.total += n;
  });
  const recent = await sql<
    Array<{ rating: "good" | "normal" | "bad"; comment: string | null; created_at: string }>
  >`SELECT rating, comment, created_at FROM reviews WHERE target_id = ${userId} ORDER BY created_at DESC LIMIT 10`;
  summary.recent = recent.map((r) => ({
    rating: r.rating,
    comment: r.comment ?? undefined,
    createdAt: r.created_at,
  }));
  return summary;
}

// ── 店舗 ────────────────────────────────────────────────────────────
type ShopRow = {
  id: string;
  name: string;
  location: string;
  phone: string;
  line_user_id: string | null;
  response_channel: "line" | "phone";
  items_description: string;
  opening_hours: string | null;
  address: string | null;
};

function toShop(r: ShopRow): Shop {
  return {
    id: r.id,
    name: r.name,
    location: r.location,
    phone: r.phone,
    lineUserId: r.line_user_id ?? undefined,
    responseChannel: r.response_channel,
    itemsDescription: r.items_description,
    openingHours: r.opening_hours ?? undefined,
    address: r.address ?? undefined,
  };
}

export async function listShops(): Promise<Shop[]> {
  const sql = await db();
  const rows = await sql<ShopRow[]>`SELECT * FROM shops ORDER BY name`;
  return rows.map(toShop);
}

export async function getShop(id: string): Promise<Shop | null> {
  const sql = await db();
  const rows = await sql<ShopRow[]>`SELECT * FROM shops WHERE id = ${id}`;
  return rows[0] ? toShop(rows[0]) : null;
}

export async function createShopRequest(input: {
  userId: string;
  shopId: string;
  item: string;
  quantity: number;
  note?: string;
}): Promise<string> {
  const sql = await db();
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO shop_requests (id, user_id, shop_id, item, quantity, note, status, created_at)
    VALUES (${id}, ${input.userId}, ${input.shopId}, ${input.item}, ${input.quantity}, ${input.note ?? null}, 'pending', ${new Date().toISOString()})
  `;
  return id;
}

export async function listShopRequestsForUser(userId: string): Promise<ShopRequest[]> {
  const sql = await db();
  const rows = await sql<
    Array<{
      id: string;
      user_id: string;
      shop_id: string;
      item: string;
      quantity: number;
      deadline: string | null;
      note: string | null;
      status: ShopRequest["status"];
      shop_reply: string | null;
      created_at: string;
    }>
  >`SELECT * FROM shop_requests WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    shopId: r.shop_id,
    item: r.item,
    quantity: r.quantity,
    deadline: r.deadline ?? undefined,
    note: r.note ?? undefined,
    status: r.status,
    shopReply: r.shop_reply ?? undefined,
    createdAt: r.created_at,
  }));
}

// ── 「これがない」掲示板 ────────────────────────────────────────────
export async function listStockAlerts(): Promise<StockAlert[]> {
  const sql = await db();
  const rows = await sql<
    Array<{
      id: string;
      user_id: string;
      user_nickname: string;
      location: string;
      shop_name: string | null;
      item: string;
      status: StockStatus;
      comment: string | null;
      created_at: string;
    }>
  >`
    SELECT a.*, u.nickname AS user_nickname
    FROM stock_alerts a JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at DESC
  `;
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    userNickname: r.user_nickname,
    location: r.location,
    shopName: r.shop_name ?? undefined,
    item: r.item,
    status: r.status,
    comment: r.comment ?? undefined,
    createdAt: r.created_at,
  }));
}

export async function createStockAlert(input: {
  userId: string;
  location: string;
  shopName?: string;
  item: string;
  status: StockStatus;
  comment?: string;
}): Promise<string> {
  const sql = await db();
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO stock_alerts (id, user_id, location, shop_name, item, status, comment, created_at)
    VALUES (${id}, ${input.userId}, ${input.location}, ${input.shopName ?? null}, ${input.item}, ${input.status}, ${input.comment ?? null}, ${new Date().toISOString()})
  `;
  return id;
}

// ── 緊急（台風）モード ──────────────────────────────────────────────
export async function getEmergencyMode(): Promise<EmergencyMode> {
  const sql = await db();
  const rows = await sql<
    Array<{
      active: boolean;
      started_at: string | null;
      ended_at: string | null;
      trigger_source: "auto" | "manual";
      warning_text: string | null;
    }>
  >`SELECT active, started_at, ended_at, trigger_source, warning_text FROM emergency_modes ORDER BY created_at DESC LIMIT 1`;
  const row = rows[0];
  if (!row) return { active: false, triggerSource: "manual" };
  return {
    active: !!row.active,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    triggerSource: row.trigger_source,
    warningText: row.warning_text ?? undefined,
  };
}

export async function setEmergencyMode(active: boolean, warningText?: string): Promise<EmergencyMode> {
  const sql = await db();
  const now = new Date().toISOString();
  await sql`
    INSERT INTO emergency_modes (id, active, started_at, ended_at, trigger_source, warning_text, created_at)
    VALUES (
      ${crypto.randomUUID()},
      ${active},
      ${active ? now : null},
      ${active ? null : now},
      'manual',
      ${active ? (warningText ?? "暴風警報発令中") : null},
      ${now}
    )
  `;
  return getEmergencyMode();
}
