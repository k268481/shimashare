import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getConversation,
  getOrCreateTransaction,
  listMessages,
  markConversationRead,
  sendMessage,
} from "@/lib/repos";

// 新着メッセージ取得（クライアントからポーリング）。閲覧時に既読化。
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const conv = getConversation(params.id, user.id);
  if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  markConversationRead(params.id, user.id);
  return NextResponse.json({
    messages: listMessages(params.id),
    transaction: getOrCreateTransaction(params.id, user.id),
  });
}

// メッセージ送信
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const conv = getConversation(params.id, user.id);
  if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : undefined;
  if (!text && !imageUrl) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }
  const message = sendMessage({
    conversationId: params.id,
    senderId: user.id,
    text: text || undefined,
    imageUrl,
  });
  return NextResponse.json({ message });
}
