import { useState } from 'react';
import Products from '../components/Products';
import Categories from '../components/Categories';
import Orders from '../components/Orders';
import Settings from '../components/Settings';
import Stats from '../components/Stats';

interface Props {
  onLogout: () => void;
}

const tabs = [
  { id: 'stats', label: '📊 الإحصائيات' },
  { id: 'products', label: '📦 المنتجات' },
  { id: 'categories', label: '🗂️ الأقسام' },
  { id: 'orders', label: '🛍️ الطلبات' },
  { id: 'settings', label: '⚙️ الإعدادات' },
];

export default function Dashboard({ onLogout }: Props) {
  const [activeTab, setActiveTab] = useState('stats');
  // 'new' = الطلبات الجديدة بس (بييجي من كارت الإحصائيات)
  // 'payment_review' = طلبات المحفظة بانتظار مراجعة الدفع (بييجي من كارت الإحصائيات)
  // 'others' = كل الطلبات ماعدا الجديدة (الوضع الافتراضي لتاب الطلبات)
  const [ordersFilter, setOrdersFilter] = useState<'new' | 'others' | 'payment_review'>('others');

  const admin = JSON.parse(localStorage.getItem('admin') || '{}');

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
        {activeTab === 'settings' && <Settings />}
      </div>
    </div>
  );
}