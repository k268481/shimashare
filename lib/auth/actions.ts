"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUser, emailExists, getUserRowByEmail, updateUserProfile } from "@/lib/repos";
import { hashPassword, verifyPassword } from "./password";
import { clearSessionCookie, getCurrentUser, setSessionCookie } from "./session";

export interface AuthState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const nickname = String(formData.get("nickname") ?? "").trim();
  const prefecture = String(formData.get("prefecture") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const island = String(formData.get("island") ?? "").trim();
  const realName = String(formData.get("realName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const agreeTerms = formData.get("agreeTerms") === "on";
  const isAdult = formData.get("isAdult") === "on";
  const proxyForHousehold = formData.get("proxyForHousehold") === "on";

  if (!EMAIL_RE.test(email)) return { error: "メールアドレスの形式が正しくありません。" };
  if (password.length < 8) return { error: "パスワードは8文字以上にしてください。" };
  if (password !== passwordConfirm) return { error: "確認用パスワードが一致しません。" };
  if (!nickname) return { error: "ニックネームを入力してください。" };
  if (!prefecture) return { error: "都道府県を入力してください。" };
  if (!city) return { error: "市区町村を入力してください。" };
  if (!agreeTerms) return { error: "利用規約・プライバシーポリシーへの同意が必要です。" };
  if (!isAdult) return { error: "18歳以上であることの確認が必要です。" };
  if (emailExists(email)) return { error: "このメールアドレスは既に登録されています。" };

  const user = createUser({
    email,
    passwordHash: hashPassword(password),
    nickname,
    prefecture,
    city,
    island: island || undefined,
    realName: realName || undefined,
    phone: phone || undefined,
    proxyForHousehold,
  });

  await setSessionCookie(user.id, user.email);
  redirect("/home");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "メールアドレスとパスワードを入力してください。" };
  const row = getUserRowByEmail(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return { error: "メールアドレスまたはパスワードが正しくありません。" };
  }
  await setSessionCookie(row.id, row.email);
  redirect("/home");
}

export async function logoutAction(): Promise<void> {
  clearSessionCookie();
  redirect("/login");
}

export async function updateProfileAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "ログインが必要です。" };
  const nickname = String(formData.get("nickname") ?? "").trim();
  const prefecture = String(formData.get("prefecture") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const island = String(formData.get("island") ?? "").trim();
  const realName = String(formData.get("realName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!nickname) return { error: "ニックネームを入力してください。" };
  if (!prefecture) return { error: "都道府県を入力してください。" };
  if (!city) return { error: "市区町村を入力してください。" };

  updateUserProfile(user.id, {
    nickname, prefecture, city,
    island: island || undefined,
    realName: realName || undefined,
    phone: phone || undefined,
    address: address || undefined,
  });
  revalidatePath("/mypage");
  return {};
}
