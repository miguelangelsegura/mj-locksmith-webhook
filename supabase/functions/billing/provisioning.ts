// Provisioning robot: turns a paid client into a prepared (staged) phone line.
//
// Called once from billing's checkout.session.completed handler (piggy-backing
// the stripe_events idempotency claim, so a webhook replay never double-runs it).
// It:
//   1. Buys a Twilio number (area code near the shop where possible).
//   2. Registers it with Vapi as a DYNAMIC/server-routed number — server.url points
//      at the vapi-webhook (+?token), fallbackDestination = the shop's real phone,
//      and crucially NO static assistantId (or {{vars}} render literally on live calls).
//   3. Writes inbound_number + the shared vapi_assistant_id + fallback_number to the
//      clients row and marks provision_status = 'staged' (NOT live).
//
// It NEVER touches clients.active (owned by recomputeActive) and NEVER throws into
// the caller — every failure is caught, recorded as provision_status='error' with a
// retryable message, and surfaced via the `notify` callback + admin retry button.
//
// Idempotency / partial-failure safety:
//   - Never buys a second number if inbound_number is already set. The bought number
//     is persisted to the row IMMEDIATELY, before the Vapi step, so a crash between
//     the two can't lose it — a retry resumes at the Vapi step.
//   - The Vapi step is find-or-create: re-running against an already-imported number
//     is a no-op, so retries converge instead of erroring on a duplicate.

// Vapi's edge rejects the default Deno/urllib User-Agent (Cloudflare error 1010),
// so every Vapi call sends a browser UA.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Base URLs are env-overridable purely so tests can point at a local mock; prod
// leaves them unset and hits the real APIs.
const TWILIO_API_BASE = (Deno.env.get("TWILIO_API_BASE") || "https://api.twilio.com/2010-04-01").replace(/\/$/, "");
const VAPI_API_BASE = (Deno.env.get("VAPI_API_BASE") || "https://api.vapi.ai").replace(/\/$/, "");

const PHONE_RE = /^\+\d{10,15}$/;

export type ProvisionResult =
  | { status: "staged"; inbound_number: string }
  | { status: "active" }
  | { status: "skipped"; reason: string }
  | { status: "error"; error: string; inbound_number?: string };

export type NotifyFn = (subject: string, text: string) => Promise<void> | void;

interface ProvisionConfig {
  twilioSid: string;
  twilioToken: string;
  vapiKey: string;
  vapiAssistantId: string;
  vapiSecret: string;
  webhookBase: string; // e.g. https://<ref>.supabase.co/functions/v1/vapi-webhook
  country: string;
}

// Reads + validates the provisioning config from the environment. Returns the
// list of MISSING keys so the caller can degrade gracefully (fall back to the
// manual "provision now" email) instead of half-running.
function loadConfig(): { cfg: ProvisionConfig | null; missing: string[] } {
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  const env = {
    twilioSid: Deno.env.get("TWILIO_ACCOUNT_SID") || "",
    twilioToken: Deno.env.get("TWILIO_AUTH_TOKEN") || "",
    vapiKey: Deno.env.get("VAPI_PRIVATE_KEY") || "",
    vapiAssistantId: Deno.env.get("VAPI_ASSISTANT_ID") || "",
    vapiSecret: Deno.env.get("VAPI_SECRET") || "",
  };
  const missing: string[] = [];
  for (const [k, v] of Object.entries(env)) if (!v) missing.push(k);
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (missing.length) return { cfg: null, missing };
  return {
    cfg: {
      ...env,
      webhookBase: `${supabaseUrl}/functions/v1/vapi-webhook`,
      country: (Deno.env.get("TWILIO_NUMBER_COUNTRY") || "CA").trim().toUpperCase(),
    },
    missing: [],
  };
}

// Whether the robot is allowed to run at all. Off when explicitly disabled, or when
// any required secret is unset (so an under-configured deploy quietly falls back to
// the manual email path rather than erroring on every payment).
export function provisioningEnabled(): { ok: boolean; reason?: string } {
  if ((Deno.env.get("PROVISIONING_ENABLED") || "").trim().toLowerCase() === "false") {
    return { ok: false, reason: "PROVISIONING_ENABLED=false" };
  }
  const { missing } = loadConfig();
  if (missing.length) return { ok: false, reason: `missing secrets: ${missing.join(", ")}` };
  return { ok: true };
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return PHONE_RE.test(s) ? s : null;
}

// +1 NANP area code from an E.164 number: +1AAANXXXXXX → AAA. Returns null for
// non-NANP / malformed numbers (search then falls back to any number in-country).
function areaCodeFromPhone(phone: unknown): string | null {
  const p = normalizePhone(phone);
  if (!p || !p.startsWith("+1") || p.length !== 12) return null;
  return p.slice(2, 5);
}

function twilioAuthHeader(cfg: ProvisionConfig): string {
  return "Basic " + btoa(`${cfg.twilioSid}:${cfg.twilioToken}`);
}

// Find one purchasable local number, preferring the given area code. Returns the
// E.164 string or null if none available.
async function twilioSearch(cfg: ProvisionConfig, areaCode: string | null): Promise<string | null> {
  const params = new URLSearchParams({ SmsEnabled: "true", VoiceEnabled: "true", PageSize: "1" });
  if (areaCode) params.set("AreaCode", areaCode);
  const url =
    `${TWILIO_API_BASE}/Accounts/${cfg.twilioSid}/AvailablePhoneNumbers/${cfg.country}/Local.json?${params}`;
  const resp = await fetch(url, { headers: { Authorization: twilioAuthHeader(cfg) } });
  if (!resp.ok) throw new Error(`twilio search ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const n = data?.available_phone_numbers?.[0]?.phone_number;
  return typeof n === "string" ? n : null;
}

async function twilioPurchase(cfg: ProvisionConfig, number: string, friendlyName: string): Promise<string> {
  const params = new URLSearchParams({ PhoneNumber: number });
  if (friendlyName) params.set("FriendlyName", friendlyName.slice(0, 64));
  const resp = await fetch(`${TWILIO_API_BASE}/Accounts/${cfg.twilioSid}/IncomingPhoneNumbers.json`, {
    method: "POST",
    headers: { Authorization: twilioAuthHeader(cfg), "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!resp.ok) throw new Error(`twilio purchase ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const bought = data?.phone_number;
  if (typeof bought !== "string") throw new Error("twilio purchase: no phone_number in response");
  return bought;
}

// True if Vapi already has this number imported (so a retry doesn't try to
// re-create it and hit a duplicate error).
async function vapiHasNumber(cfg: ProvisionConfig, number: string): Promise<boolean> {
  const resp = await fetch(`${VAPI_API_BASE}/phone-number?limit=1000`, {
    headers: { Authorization: `Bearer ${cfg.vapiKey}`, "User-Agent": BROWSER_UA },
  });
  if (!resp.ok) throw new Error(`vapi list ${resp.status}: ${await resp.text()}`);
  const list = await resp.json();
  return Array.isArray(list) && list.some((n) => n?.number === number);
}

async function vapiCreateNumber(
  cfg: ProvisionConfig,
  number: string,
  name: string,
  fallback: string | null,
): Promise<void> {
  const body: Record<string, unknown> = {
    provider: "twilio",
    number,
    twilioAccountSid: cfg.twilioSid,
    twilioAuthToken: cfg.twilioToken,
    // Dynamic/server routing: server.url resolves the assistant per call. NO
    // static assistantId — that would make {{business_name}}/{{agent_name}} render
    // literally on live calls.
    server: { url: `${cfg.webhookBase}?token=${encodeURIComponent(cfg.vapiSecret)}` },
  };
  if (name) body.name = name.slice(0, 40);
  // Safety net: if our server hiccups (or the number isn't activated yet), Vapi
  // forwards the call to the shop's real phone instead of dropping it.
  if (fallback) body.fallbackDestination = { type: "number", number: fallback };

  const resp = await fetch(`${VAPI_API_BASE}/phone-number`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.vapiKey}`,
      "Content-Type": "application/json",
      "User-Agent": BROWSER_UA,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`vapi create ${resp.status}: ${await resp.text()}`);
}

async function ensureVapiNumber(
  cfg: ProvisionConfig,
  number: string,
  name: string,
  fallback: string | null,
): Promise<void> {
  if (await vapiHasNumber(cfg, number)) return; // idempotent: already imported
  await vapiCreateNumber(cfg, number, name, fallback);
}

// Orchestrates buy → wire → stage for one client. Safe to call multiple times
// (idempotent + resumes after partial failure). `opts.numberOverride` skips the
// Twilio search/purchase and is used only by tests to make the flow deterministic.
export async function provisionForClient(
  supabase: any,
  client: any,
  opts: { notify?: NotifyFn; numberOverride?: string } = {},
): Promise<ProvisionResult> {
  const notify = opts.notify ?? (() => {});
  const gate = provisioningEnabled();
  if (!gate.ok) return { status: "skipped", reason: gate.reason ?? "disabled" };
  const { cfg } = loadConfig();
  if (!cfg) return { status: "skipped", reason: "config unavailable" };

  const clientId = client.id;
  const businessName = String(client.business_name ?? "").trim();
  if (client.provision_status === "active") return { status: "active" };

  // Reuse an already-bought number (retry / replay); only buy when there's none.
  let number = normalizePhone(client.inbound_number) ?? (opts.numberOverride ?? null);
  const fallback = normalizePhone(client.owner_phone) ?? normalizePhone(client.dispatch_phone);

  try {
    if (!number) {
      const areaCode = areaCodeFromPhone(client.owner_phone ?? client.dispatch_phone);
      number = (areaCode ? await twilioSearch(cfg, areaCode) : null) ?? await twilioSearch(cfg, null);
      if (!number) throw new Error(`no ${cfg.country} Twilio numbers available`);
      number = await twilioPurchase(cfg, number, businessName);
      // Persist immediately so a failure past this point never re-buys.
      const { error } = await supabase.from("clients").update({ inbound_number: number }).eq("id", clientId);
      if (error) throw new Error(`persist inbound_number failed: ${error.message}`);
    }

    await ensureVapiNumber(cfg, number, businessName, fallback);

    const { error } = await supabase.from("clients").update({
      inbound_number: number,
      vapi_assistant_id: cfg.vapiAssistantId,
      fallback_number: fallback,
      provision_status: "staged",
      provision_error: null,
    }).eq("id", clientId);
    if (error) throw new Error(`stage update failed: ${error.message}`);

    console.log(`[provision] staged client=${clientId} number=${number}`);
    await notify(
      "Number ready to activate",
      `${businessName || clientId} paid. A number is prepared and wired:\n${number}\n\n` +
        `Open the admin page and tap "Activate number" to take it live.`,
    );
    return { status: "staged", inbound_number: number };
  } catch (e) {
    const msg = String(e);
    console.log(`[provision] error client=${clientId} number=${number ?? "-"}: ${msg}`);
    // Record a clear retryable state. Crucially, re-persist inbound_number if a
    // number was bought — so that even if the persist at line ~222 was itself what
    // failed (transient DB blip right after the Twilio purchase), the retry sees
    // the number and resumes at the Vapi step instead of buying a SECOND one.
    await supabase.from("clients").update({
      ...(number ? { inbound_number: number } : {}),
      provision_status: "error",
      provision_error: msg.slice(0, 500),
    }).eq("id", clientId);
    await notify(
      "Provisioning FAILED — needs retry",
      `${businessName || clientId}: provisioning failed and is retryable.\n` +
        `Number bought: ${number ?? "none yet"}\nError: ${msg}\n\n` +
        `Open the admin page and tap "Retry provisioning".`,
    );
    return { status: "error", error: msg, ...(number ? { inbound_number: number } : {}) };
  }
}
