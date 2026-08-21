// Operator authentication for the admin console (`admin` + `billing` functions).
//
// Identity comes from Supabase Auth: the console signs in with email+password,
// gets an access token, and sends it as `Authorization: Bearer <jwt>`. We verify
// it by asking GoTrue who the token belongs to, then require that email to be on
// the ADMIN_EMAILS allowlist — a valid Supabase account is NOT enough, so a
// stray self-signup can never reach the admin API.
//
// This replaced a single shared ADMIN_API_TOKEN so each operator has their own
// login and can be removed individually.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

export interface AdminIdentity {
  email: string;
  userId: string;
}

/** False when the allowlist or auth env is missing — callers must fail closed. */
export function adminAuthConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY && ADMIN_EMAILS.length > 0);
}

export function adminEmails(): string[] {
  return [...ADMIN_EMAILS];
}

export function isAdminEmail(email: unknown): boolean {
  return typeof email === "string" &&
    ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/** Returns the caller's identity, or null if the request must be rejected. */
export async function authenticateAdmin(req: Request): Promise<AdminIdentity | null> {
  if (!adminAuthConfigured()) return null;

  const header = req.headers.get("authorization") ?? "";
  const token = header.slice(0, 7).toLowerCase() === "bearer "
    ? header.slice(7).trim()
    : "";
  if (!token) return null;

  let resp: Response;
  try {
    resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY!, Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.log("[admin-auth] token check failed:", err instanceof Error ? err.message : err);
    return null;
  }
  if (!resp.ok) return null;

  const user = await resp.json().catch(() => null);
  const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  if (!email || !ADMIN_EMAILS.includes(email)) return null;

  return { email, userId: String(user.id) };
}
