"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createListing,
  createShopRequest,
  createStockAlert,
  deleteListing,
  getOrCreateConversation,
  setEmergencyMode,
} from "@/lib/repos";
import type { Category, StockStatus } from "@/types";

const FORBIDDEN_KEYWORDS = ["薬", "医薬", "たばこ", "タバコ", "煙草"];

// ── 出品 ────────────────────────────────────────────────────────────
export async function createListingAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isFree = formData.get("isFree") === "on";
  const priceRaw = String(formData.get("price") ?? "0").replace(/[^0-9]/g, "");
  const price = isFree ? 0 : Math.max(0, parseInt(priceRaw || "0", 10) || 0);
  const category = String(formData.get("category") ?? "daily") as Category;
  const handover = String(formData.get("handover") ?? "").trim();
  let photos: string[] = [];
  try {
    photos = JSON.parse(String(formData.get("photos") ?? "[]"));
  } catch {
    photos = [];
  }

  if (!title || !handover) return;
  const text = `${title} ${description}`;
  if (FORBIDDEN_KEYWORDS.some((k) => text.includes(k))) return; // 禁止品目はサーバ側でも拒否

  const id = createListing({
    userId: user!.id,
    title,
    description,
    price,
    category,
    photos,
    handover,
  });
  revalidatePath("/listings");
  revalidatePath("/home");
  redirect(`/listings/${id}`);
}

export async function deleteListingAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("listingId") ?? "");
  if (id) {
    deleteListing(id, user!.id);
    revalidatePath("/listings");
    revalidatePath("/mypage");
  }
  redirect("/listings");
}

// ── チャット開始 ────────────────────────────────────────────────────
export async function startChatAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const listingId = String(formData.get("listingId") ?? "");
  const conversationId = getOrCreateConversation(listingId, user!.id);
  if (!conversationId) {
    redirect(`/listings/${listingId}`);
  }
  redirect(`/chat/${conversationId}`);
}

// ── 取り寄せリクエスト ──────────────────────────────────────────────
export async function createShopRequestAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const shopId = String(formData.get("shopId") ?? "");
  const item = String(formData.get("item") ?? "").trim();
  const quantity = Math.max(1, parseInt(String(formData.get("quantity") ?? "1"), 10) || 1);
  const note = String(formData.get("note") ?? "").trim();
  if (!shopId || !item) return;
  createShopRequest({ userId: user!.id, shopId, item, quantity, note: note || undefined });
  revalidatePath(`/shops/${shopId}`);
  redirect(`/shops/${shopId}?sent=1`);
}

// ── 「これがない」掲示板 ────────────────────────────────────────────
export async function createStockAlertAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const item = String(formData.get("item") ?? "").trim();
  const shopName = String(formData.get("shopName") ?? "").trim();
  const status = String(formData.get("status") ?? "out_of_stock") as StockStatus;
  const comment = String(formData.get("comment") ?? "").trim();
  // 投稿者の地域情報を使う（フォームで選べる場合はそちらを優先）
  const locationInput = String(formData.get("location") ?? "").trim();
  const { formatLocation } = await import("@/types");
  const location = locationInput || formatLocation(user!);
  if (!item) return;
  createStockAlert({
    userId: user!.id,
    item,
    location,
    shopName: shopName || undefined,
    status,
    comment: comment || undefined,
  });
  revalidatePath("/emergency");
  revalidatePath("/home");
  redirect("/emergency");
}

// ── 緊急モード切替（スーパー管理者のみ）─────────────────────────────
export async function setEmergencyAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user!.role !== "super_admin") return; // 権限チェック
  const active = formData.get("active") === "true";
  setEmergencyMode(active);
  revalidatePath("/", "layout");
  redirect("/mypage");
}
