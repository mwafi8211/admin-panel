// src/lib/push.ts
import { supabase } from './supabase';

// نفس الـ Public Key اللي اتولد قبل كده
const VAPID_PUBLIC_KEY =
  'BJDER_nbOalNpomR3iHmC4jtoKWjZKhQg8Oc_qHeEJyzWhXf42rAS-pG8pVaYZJgnSzefG8OgMw8VoEanCcunrg';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  // المسار لازم يتطابق مع base: '/admin-panel/' في vite.config.ts
  return navigator.serviceWorker.register('/admin-panel/sw.js');
}

export async function subscribeToPush(): Promise<{ success: boolean; message: string }> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { success: false, message: 'المتصفح ده مش بيدعم الإشعارات' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'لازم توافق على إذن الإشعارات عشان تفعّلها' };
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, message: 'فشل تسجيل Service Worker' };
    }
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const adminRaw = localStorage.getItem('admin');
    if (!adminRaw) {
      return { success: false, message: 'مفيش أدمن مسجل دخول دلوقتي' };
    }
    const admin = JSON.parse(adminRaw);

    const subJson = subscription.toJSON() as any;

    // upsert عشان لو نفس الجهاز اشترك تاني ميتسجلش مرتين (محتاج unique constraint على endpoint)
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        admin_id: admin.id,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error(error);
      return { success: false, message: 'فشل حفظ الاشتراك في قاعدة البيانات' };
    }

    return { success: true, message: 'تم تفعيل الإشعارات بنجاح ✅' };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'حصل خطأ غير متوقع أثناء تفعيل الإشعارات' };
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration('/admin-panel/sw.js');
  if (!registration) return false;
  const sub = await registration.pushManager.getSubscription();
  return !!sub;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/admin-panel/sw.js');
  if (!registration) return;
  const sub = await registration.pushManager.getSubscription();
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  }
}
