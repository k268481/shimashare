import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/jwt";
import { LoginForm } from "./LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { clearSession?: string };
}) {
  // 古いcookie（JWTは有効だがDBにユーザーが存在しない）を削除する
  if (searchParams.clearSession === "1") {
    cookies().delete(SESSION_COOKIE);
  }
  return <LoginForm />;
}
