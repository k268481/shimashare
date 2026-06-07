import { SignJWT, jwtVerify } from "jose";

// middleware（Edge）からも import するため、ここには DB/sqlite を持ち込まない
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me",
);

export const SESSION_COOKIE = "shimashare_session";

export interface SessionPayload {
  sub: string; // user id
  email: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return { sub: payload.sub, email: (payload.email as string) ?? "" };
  } catch {
    return null;
  }
}
