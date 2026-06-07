import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { SESSION_COOKIE, signSession, verifySession } from "./jwt";
import { getUserById } from "@/lib/repos";
import type { User } from "@/types";

export async function setSessionCookie(userId: string, email: string): Promise<void> {
  const token = await signSession({ sub: userId, email });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30日
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookie(): void {
  cookies().delete(SESSION_COOKIE);
}

// 1リクエスト内でのDB再取得を避けるため React.cache でメモ化
// JWTが有効でもDBにユーザーが存在しない場合（DBリセット等）はcookieを消してnullを返す
// Server Component から呼ばれるため cookies().delete() は使えない（Server Action 専用）
// 無効なトークン・存在しないユーザーは null を返すだけにし、
// 各ページの if (!user) redirect("/login") と middleware でガードする
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  return getUserById(payload.sub); // DB再作成等でユーザーが存在しない場合も null
});
