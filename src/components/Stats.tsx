import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onNewOrdersClick?: () => void;
  onPaymentReviewClick?: () => void;
}

export default function Stats({ onNewOrdersClick, onPaymentReviewClick }: Props) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    pendingOrders: 0,
    paymentReviewOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [ordersRes, productsRes, pendingRes, paymentReviewRes] = await Promise.all([
        supabase.from('orders').select('total, status'),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('orders').select('id', { count: 'exact' }).eq('status', 'ordered'),
        supabase.from('orders').select('id', { count: 'exact' }).eq('status', 'pending_review'),
      ]);

      // الإيرادات بتتحسب بس من الطلبات اللي اتأكدت فعليًا (مش لسه جديدة أو بانتظار مراجعة دفع أو مرفوضة)
      const confirmedStatuses = ['confirmed', 'shipped', 'delivered'];
      const totalRevenue = ordersRes.data
        ?.filter(o => confirmedStatuses.includes(o.status))
        .reduce((sum, o) => sum + Number(o.total), 0) || 0;

      setStats({
        totalOrders: ordersRes.data?.length || 0,
        totalRevenue,
        totalProducts: productsRes.count || 0,
        pendingOrders: pendingRes.count || 0,
        paymentReviewOrders: paymentReviewRes.count || 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;

  const cards = [
    { label: 'إجمالي الطلبات', value: stats.totalOrders, icon: '🛍️', color: 'bg-blue-50 text-blue-600' },
    { label: 'إجمالي الإيرادات', value: `${stats.totalRevenue.toLocaleString()} ج`, icon: '💰', color: 'bg-green-50 text-green-600' },
    { label: 'عدد المنتجات', value: stats.totalProducts, icon: '📦', color: 'bg-purple-50 text-purple-600' },
    { label: 'طلبات جديدة', value: stats.pendingOrders, icon: '⏳', color: 'bg-orange-50 text-orange-600', onClick: onNewOrdersClick },
    { label: 'دفع إلكتروني', value: stats.paymentReviewOrders, icon: '💳', color: 'bg-yellow-50 text-yellow-700', onClick: onPaymentReviewClick },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">الإحصائيات</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <div
            key={card.label}
            onClick={card.onClick}
            className={`bg-white rounded-2xl p-6 shadow-sm ${card.onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition' : ''}`}
          >
            <div className={`text-3xl mb-3 w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}>
              {card.icon}
            </div>
            <div className="text-2xl font-bold text-gray-800">{card.value}</div>
            <div className="text-sm text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}