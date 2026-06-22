import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { setTransactionCompleted } from "@/lib/repos";

// 「取引しました」トグル
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const completed = body.completed === true;
  const tx = await setTransactionCompleted(params.id, user.id, completed);
  if (!tx) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ transaction: tx });
}
