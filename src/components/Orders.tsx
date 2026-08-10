import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Order {
  id: string;
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
  discount_code?: string;
  discount_amount?: number;
  payment_proof_url?: string;
  users?: { name: string; phone: string };
}

const statusLabels: Record<string, string> = {
  pending_review: '💳 بانتظار مراجعة الدفع',
  ordered: '⏳ جديد',
  confirmed: '✅ مؤكد',
  shipped: '🚚 في الطريق',
  delivered: '📦 تم التسليم',
  cancelled: '❌ مرفوض',
};

const statusColors: Record<string, string> = {
  pending_review: 'bg-orange-100 text-orange-700',
  ordered: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusOrder = ['ordered', 'confirmed', 'shipped', 'delivered'];
// الحالات اللي بتظهر في شبكة "تغيير الحالة" اليدوية جوه تفاصيل الطلب العادي
const manualStatuses = ['ordered', 'confirmed', 'shipped', 'delivered'];

interface Props {
  // 'new' = طلبات ordered بس (جاي من كارت الإحصائيات)
  // 'payment_review' = طلبات pending_review بس (تاب "دفع إلكتروني")
  // 'others' = باقي الطلبات (الوضع الافتراضي لما تفتح التاب)
  filter: 'new' | 'others' | 'payment_review';
  onShowNew?: () => void;
}

export default function Orders({ filter, onShowNew }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  // الطلب المحدد للحذف - بيتعرض له تأكيد قبل ما يتنفذ فعليًا
  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null);
  // فلتر إضافي داخلي - يستخدم لتضييق العرض على حالة معينة داخل وضع "others"
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // رابط صورة الإثبات المكبرة حاليًا (null = مفيش صورة مفتوحة)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // كل مرة نغير مصدر الدخول (كارت أو تاب) نصفّر التضييق الداخلي
  useEffect(() => {
    setStatusFilter(null);
  }, [filter]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, users(name, phone)')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchOrders();
    setSelected(null);
  };

  const deleteOrder = async (id: string) => {
    await supabase.from('orders').delete().eq('id', id);
    fetchOrders();
    setSelected(null);
    setConfirmDelete(null);
  };

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;

  // عدد الطلبات في كل حالة (من كل الطلبات، مش المفلترة)
  const statusCounts = statusOrder.reduce((acc, key) => {
    acc[key] = orders.filter(o => o.status === key).length;
    return acc;
  }, {} as Record<string, number>);

const displayedOrders = (filter === 'new'
  ? orders.filter(o => o.status === 'ordered')
  : filter === 'payment_review'
  ? orders.filter(o => o.status === 'pending_review')
  : orders.filter(o => o.status !== 'ordered' && o.status !== 'pending_review' && (!statusFilter || o.status === statusFilter))
).filter(o => o.id.toLowerCase().includes(searchQuery.toLowerCase()));
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        {filter === 'new' ? 'الطلبات الجديدة' : filter === 'payment_review' ? 'طلبات بانتظار مراجعة الدفع' : 'الطلبات'} ({displayedOrders.length})
      </h2>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="ابحث بكود الطلب..."
        className="w-full mb-4 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
      />

      {/* شريط الإحصائيات السريع لكل حالة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statusOrder.map(key => {
          const isNewStatus = key === 'ordered';
          const isActive = filter === 'others' && statusFilter === key;
          const handleClick = () => {
            if (isNewStatus) {
              onShowNew?.();
            } else {
              setStatusFilter(prev => (prev === key ? null : key));
            }
          };
          return (
            <button
              key={key}
              onClick={handleClick}
              className={`text-right rounded-xl p-3 border transition ${
                isActive
                  ? 'border-purple-500 bg-purple-50'
                  : isNewStatus
                  ? 'border-orange-200 bg-orange-50 hover:border-orange-300'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-lg font-bold text-gray-800">{statusCounts[key]}</div>
              <div className="text-xs text-gray-500">
                {statusLabels[key]}
                {isNewStatus && <span className="text-orange-500"> ↗</span>}
              </div>
            </button>
          );
        })}
      </div>

      {filter === 'others' && statusFilter && (
        <button
          onClick={() => setStatusFilter(null)}
          className="text-sm text-purple-600 hover:text-purple-800 mb-4"
        >
          ✕ إلغاء التصفية وعرض الكل
        </button>
      )}

      {/* Order Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">تفاصيل الطلب #{selected.id}</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between"><span className="text-gray-500">العميل</span><span className="font-medium">{selected.users?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">التليفون</span><span className="font-medium">{selected.users?.phone}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">الإجمالي</span><span className="font-medium">{selected.total} ج</span></div>
              <div className="flex justify-between"><span className="text-gray-500">الدفع</span><span className="font-medium">{selected.payment_method}</span></div>
              {selected.discount_code && (
                <div className="flex justify-between"><span className="text-gray-500">كود الخصم</span><span className="font-medium">{selected.discount_code} (-{selected.discount_amount} ج)</span></div>
              )}
              <div className="flex justify-between"><span className="text-gray-500">الحالة</span>
                <span className={`text-xs px-3 py-1 rounded-full ${statusColors[selected.status]}`}>{statusLabels[selected.status]}</span>
              </div>
            </div>

            {selected.status === 'pending_review' ? (
              <>
                <p className="text-sm font-medium text-gray-700 mb-2">صورة إثبات التحويل:</p>
                {selected.payment_proof_url ? (
                  <button type="button" onClick={() => setZoomedImage(selected.payment_proof_url!)} className="block w-full">
                    <img
                      src={selected.payment_proof_url}
                      alt="إثبات التحويل"
                      className="w-full max-h-80 object-contain rounded-xl border border-gray-200 mb-4 bg-gray-50 cursor-zoom-in hover:opacity-90 transition"
                    />
                  </button>
                ) : (
                  <p className="text-sm text-red-500 mb-4">لا توجد صورة مرفوعة لهذا الطلب</p>
                )}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => updateStatus(selected.id, 'confirmed')}
                    className="py-2 px-3 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition"
                  >
                    ✅ تأكيد
                  </button>
                  <button
                    onClick={() => updateStatus(selected.id, 'cancelled')}
                    className="py-2 px-3 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition"
                  >
                    ❌ مرفوض
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700 mb-3">تغيير الحالة:</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {manualStatuses.map((key) => (
                    <button key={key} onClick={() => updateStatus(selected.id, key)}
                      className={`py-2 px-3 rounded-lg text-sm transition ${selected.status === key ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {statusLabels[key]}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button onClick={() => setSelected(null)} className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition mb-2">إغلاق</button>
            <button
              onClick={() => { setConfirmDelete(selected); setSelected(null); }}
              className="w-full bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition"
            >
              🗑️ حذف الطلب نهائيًا
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">تأكيد حذف الطلب</h3>
            <p className="text-sm text-gray-500 mb-6">
              هيتم حذف الطلب <span className="font-mono font-medium">#{confirmDelete.id}</span> نهائيًا
              ({confirmDelete.total} ج) ولن يظهر في الإحصائيات أو الإيرادات بعد كده.
              <br />
              <span className="text-red-500 font-medium">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteOrder(confirmDelete.id)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
              >
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
        {displayedOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {filter === 'new' ? 'لا يوجد طلبات جديدة حاليًا' : filter === 'payment_review' ? 'لا يوجد طلبات بانتظار مراجعة الدفع حاليًا' : 'لا يوجد طلبات تطابق الفلتر الحالي'}
          </div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-4 py-3 text-sm text-gray-600">رقم الطلب</th>
                <th className="text-right px-4 py-3 text-sm text-gray-600">العميل</th>
                <th className="text-right px-4 py-3 text-sm text-gray-600">الإجمالي</th>
                <th className="text-right px-4 py-3 text-sm text-gray-600">الحالة</th>
                <th className="text-right px-4 py-3 text-sm text-gray-600">التاريخ</th>
                <th className="text-right px-4 py-3 text-sm text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedOrders.map(order => (
                <tr key={order.id} className={order.status === 'cancelled' ? 'bg-red-50' : ''}>
                  <td className={`px-4 py-3 text-sm font-mono ${order.status === 'cancelled' ? 'text-red-700' : 'text-gray-700'}`}>#{order.id}</td>
                  <td className={`px-4 py-3 text-sm ${order.status === 'cancelled' ? 'text-red-700' : 'text-gray-700'}`}>{order.users?.name || '—'}</td>
                  <td className={`px-4 py-3 text-sm ${order.status === 'cancelled' ? 'text-red-700' : 'text-gray-700'}`}>{order.total} ج</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-3 py-1 rounded-full ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
                  </td>
                  <td className={`px-4 py-3 text-sm ${order.status === 'cancelled' ? 'text-red-500' : 'text-gray-500'}`}>{new Date(order.created_at).toLocaleDateString('ar-EG')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelected(order)} className="text-purple-600 hover:text-purple-800 text-sm">تفاصيل</button>
                      <button onClick={() => setConfirmDelete(order)} className="text-red-500 hover:text-red-700 text-sm">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Zoomed Payment Proof Image */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="إثبات التحويل مكبر"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 left-4 bg-white/90 text-gray-800 w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-white transition"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}