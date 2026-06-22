import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createReview } from "@/lib/repos";

// 相手ユーザーへの3段階評価（◎○△）
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const rating = body.rating;
  if (!["good", "normal", "bad"].includes(rating)) {
    return NextResponse.json({ error: "invalid_rating" }, { status: 400 });
  }
  const comment = typeof body.comment === "string" ? body.comment.trim() : undefined;
  const ok = await createReview({
    conversationId: params.id,
    reviewerId: user.id,
    rating,
    comment: comment || undefined,
  });
  if (!ok) return NextResponse.json({ error: "already_reviewed" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
