import "server-only";

// Best-effort, mirrors verify-pickup's notifyConsumer — a missing/invalid push
// token or a down push service shouldn't fail an assignment that already succeeded
// in the database.
export async function sendPushNotification(token: string | null, title: string, body: string): Promise<void> {
  if (!token) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: token, title, body }),
    });
  } catch (err) {
    console.error("Failed to send push notification:", err);
  }
}
