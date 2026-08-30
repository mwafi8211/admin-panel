import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@marital-store.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const order = payload.record ?? payload.new ?? payload;

    const subsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!subsRes.ok) {
      throw new Error(`فشل جلب الاشتراكات: ${subsRes.status}`);
    }

    const subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }> =
      await subsRes.json();

    const notificationPayload = JSON.stringify({
      title: "طلب جديد 🛍️",
      body: `وصل طلب جديد رقم #${order.id ?? ""} — اضغط لعرض التفاصيل`,
      url: "/admin-panel/?tab=orders",
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            notificationPayload
          );
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await fetch(
              `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
              {
                method: "DELETE",
                headers: {
                  apikey: SUPABASE_SERVICE_ROLE_KEY,
                  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
              }
            );
          }
          throw err;
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(JSON.stringify({ ok: true, sent, failed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});