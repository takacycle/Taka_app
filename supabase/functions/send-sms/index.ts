// Supabase Auth "Send SMS" hook — replaces the built-in SMS providers (Twilio,
// MessageBird, etc.) with mNotify, so the OTP for phone sign-in goes out through
// mNotify instead. Auth calls this function directly (not through a client app),
// signing the request with SEND_SMS_HOOK_SECRET, which we verify below.
//
// Docs: https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const MNOTIFY_API_KEY = Deno.env.get("MNOTIFY_API_KEY");
const SEND_SMS_HOOK_SECRET = Deno.env.get("SEND_SMS_HOOK_SECRET");
const SENDER_ID = "Takacycle";

interface SendSmsPayload {
  user: { phone: string };
  sms: { otp: string };
}

interface MnotifyResponse {
  status: string;
  code: string;
  message: string;
  summary?: {
    total_sent: number;
    total_rejected: number;
    numbers_sent: string[];
  };
}

// Supabase stores phone numbers in E.164 without the leading "+", e.g.
// "233241234567". mNotify's `recipient` field expects local Ghana MSISDN
// format, e.g. "0241234567".
function toMnotifyRecipient(e164Phone: string): string {
  const digits = e164Phone.replace(/^\+/, "");
  if (digits.startsWith("233") && digits.length === 12) {
    return "0" + digits.slice(3);
  }
  // Not a recognized Ghana number — pass through as-is and let mNotify reject
  // it, rather than silently mangling a number we don't understand.
  return digits;
}

function errorResponse(httpCode: number, message: string) {
  return new Response(JSON.stringify({ error: { http_code: httpCode, message } }), {
    status: httpCode,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (!MNOTIFY_API_KEY || !SEND_SMS_HOOK_SECRET) {
    return errorResponse(500, "Missing MNOTIFY_API_KEY or SEND_SMS_HOOK_SECRET function secret.");
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const base64Secret = SEND_SMS_HOOK_SECRET.replace("v1,whsec_", "");
  const wh = new Webhook(base64Secret);

  let verified: SendSmsPayload;
  try {
    verified = wh.verify(payload, headers) as SendSmsPayload;
  } catch (error) {
    return errorResponse(401, `Invalid webhook signature: ${error}`);
  }

  const recipient = toMnotifyRecipient(verified.user.phone);

  try {
    const mnotifyResponse = await fetch(`https://api.mnotify.com/api/sms/quick?key=${MNOTIFY_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: [recipient],
        sender: SENDER_ID,
        message: `Your Takacycle verification code is ${verified.sms.otp}`,
        is_schedule: false,
        schedule_date: "",
      }),
    });

    const bodyText = await mnotifyResponse.text();

    if (!mnotifyResponse.ok) {
      throw new Error(`mNotify HTTP ${mnotifyResponse.status}: ${bodyText}`);
    }

    // mNotify returns 200 with a body like:
    // { "status": "success", "code": "2000", "summary": { "total_sent": 1, "total_rejected": 0, ... } }
    // A 200 alone isn't enough — status can be non-"success", or the call can
    // report "success" overall while still rejecting our one recipient.
    const result: MnotifyResponse = JSON.parse(bodyText);

    if (result.status !== "success") {
      throw new Error(`mNotify reported failure (code ${result.code}): ${result.message}`);
    }
    if (!result.summary || result.summary.total_sent < 1 || result.summary.total_rejected > 0) {
      throw new Error(`mNotify rejected the recipient: ${bodyText}`);
    }

    return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return errorResponse(500, `Failed to send SMS via mNotify: ${error}`);
  }
});
