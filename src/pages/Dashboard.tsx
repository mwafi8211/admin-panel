import { useEffect, useState } from 'react';
import Products from '../components/Products';
import Categories from '../components/Categories';
import Orders from '../components/Orders';
import Settings from '../components/Settings';
import Stats from '../components/Stats';
import LuckyDraw from '../components/LuckyDraw';
import { subscribeToPush, isPushSubscribed, unsubscribeFromPush } from '../lib/push';

interface Props {
  onLogout: () => void;
}

const tabs = [
  { id: 'stats', label: '📊 الإحصائيات' },
  { id: 'products', label: '📦 المنتجات' },
  { id: 'categories', label: '🗂️ الأقسام' },
  { id: 'orders', label: '🛍️ الطلبات' },
  { id: 'draw', label: '🎰 السحب الشهري' },
  { id: 'settings', label: '⚙️ الإعدادات' },
];

export default function Dashboard({ onLogout }: Props) {
  // لو الصفحة اتفتحت من ضغطة على إشعار (رابط فيه ?tab=orders) نفتح تاب الطلبات على طول
  const cameFromNotification = new URLSearchParams(window.location.search).get('tab') === 'orders';

  const [activeTab, setActiveTab] = useState(cameFromNotification ? 'orders' : 'stats');
  // 'new' = الطلبات الجديدة بس (بييجي من كارت الإحصائيات أو من إشعار Push)
  // 'payment_review' = طلبات المحفظة بانتظار مراجعة الدفع (بييجي من كارت الإحصائيات)
  // 'others' = كل الطلبات ماعدا الجديدة (الوضع الافتراضي لتاب الطلبات)
  const [ordersFilter, setOrdersFilter] = useState<'new' | 'others' | 'payment_review'>(
    cameFromNotification ? 'new' : 'others'
  );

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const admin = JSON.parse(localStorage.getItem('admin') || '{}');

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);

    // ننضف الرابط من ?tab=orders بعد ما نستخدمه، عشان لو الأدمن عمل refresh
    // ميرجعش يفتح على تاب الطلبات كل مرة
    if (cameFromNotification) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnablePush = async () => {
    setPushLoading(true);
    const result = await subscribeToPush();
    setPushLoading(false);
    setPushEnabled(result.success);
    if (!result.success) {
      alert(result.message);
    }
  };

  const handleDisablePush = async () => {
    if (!confirm('هل تريد إيقاف الإشعارات على هذا الجهاز؟')) return;
    setPushLoading(true);
    try {
      await unsubscribeFromPush();
      setPushEnabled(false);
    } catch (err) {
      console.error(err);
      alert('حصل خطأ أثناء إيقاف الإشعارات');
    } finally {
      setPushLoading(false);
    }
  };

  // فتح تاب الطلبات مفلتر على "جديدة" بس - بيتنادى من كارت الإحصائيات
  const goToNewOrders = () => {
    setOrdersFilter('new');
    setActiveTab('orders');
  };

  // فتح تاب الطلبات مفلتر على "بانتظار مراجعة الدفع" بس - بيتنادى من كارت الإحصائيات
  const goToPaymentReview = () => {
    setOrdersFilter('payment_review');
    setActiveTab('orders');
  };

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">لوحة التحكم</h1>
            <p className="text-sm text-gray-500">متجر السعادة الزوجية</p>
          </div>
          <div className="flex items-center gap-4">
            {!pushEnabled && (
              <button
                onClick={handleEnablePush}
                disabled={pushLoading}
                className="bg-purple-50 text-purple-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-100 transition disabled:opacity-50"
              >
                {pushLoading ? 'جاري التفعيل...' : '🔔 فعّل الإشعارات'}
              </button>
            )}
            {pushEnabled && (
              <button
                onClick={handleDisablePush}
                disabled={pushLoading}
                title="اضغط لإيقاف الإشعارات على هذا الجهاز"
                className="text-green-600 text-sm flex items-center gap-1 hover:text-red-600 transition disabled:opacity-50"
              >
                {pushLoading ? 'جاري الإيقاف...' : '✅ الإشعارات مفعّلة (اضغط للإيقاف)'}
              </button>
            )}
            <span className="text-sm text-gray-600">👋 {admin.name}</span>
            <button
              onClick={() => {
                localStorage.removeItem('admin');
                onLogout();
              }}
              className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-100 transition"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-2 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'orders') setOrdersFilter('others');
                setActiveTab(tab.id);
              }}
              className={`py-4 px-6 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'stats' && <Stats onNewOrdersClick={goToNewOrders} onPaymentReviewClick={goToPaymentReview} />}
        {activeTab === 'products' && <Products />}
        {activeTab === 'categories' && <Categories />}
        {activeTab === 'orders' && <Orders filter={ordersFilter} onShowNew={goToNewOrders} />}
        {activeTab === 'draw' && <LuckyDraw />}
        {activeTab === 'settings' && <Settings />}

      </div>
    </div>
  );
}