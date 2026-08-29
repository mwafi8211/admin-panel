import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Entry {
  id: string;
  name: string;
  phone: string;
  order_total: number;
  order_id: string;
  created_at: string;
}

export default function LuckyDraw() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [winner, setWinner] = useState<Entry | null>(null);

  const fetchEntries = async () => {
    const { data } = await supabase
      .from('lucky_draw_entries')
      .select('*')
      .order('created_at', { ascending: false });
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const pickWinner = () => {
    if (entries.length === 0) return;
    const random = entries[Math.floor(Math.random() * entries.length)];
    setWinner(random);
  };

  const resetDraw = async () => {
    if (!confirm('هل أنت متأكد؟ هيتم مسح كل المسجلين وتصفير الدورة.')) return;
    await supabase.from('lucky_draw_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('settings').update({ value: new Date().toISOString() }).eq('key', 'lucky_draw_last_reset');
    setWinner(null);
    fetchEntries();
  };

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800">🎰 السحب الشهري ({entries.length} مسجل)</h2>
          <div className="flex gap-3">
            <button
              onClick={pickWinner}
              disabled={entries.length === 0}
              className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              🎲 اختيار فائز عشوائي
            </button>
            <button
              onClick={resetDraw}
              disabled={entries.length === 0}
              className="bg-red-50 text-red-600 px-5 py-2 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
            >
              🔄 تصفير الدورة
            </button>
          </div>
        </div>

        {winner && (
          <div className="bg-green-50 border border-green-300 rounded-xl p-5 mb-6 text-center">
            <p className="text-green-700 font-bold text-lg">🎉 الفائز: {winner.name}</p>
            <p className="text-green-600 text-sm mt-1" dir="ltr">{winner.phone}</p>
            <p className="text-green-600 text-xs mt-1">رقم الطلب: {winner.order_id}</p>
          </div>
        )}

        <div className="space-y-3">
          {entries.map(e => (
            <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-bold text-gray-800">{e.name}</span>
                <span className="text-sm text-gray-500 mr-3" dir="ltr">{e.phone}</span>
              </div>
              <div className="text-sm text-gray-500">
                {e.order_total} ج.م — {e.order_id}
              </div>
            </div>
          ))}
          {entries.length === 0 && <p className="text-center text-gray-400 py-6">لا يوجد مسجلين حاليًا</p>}
        </div>
      </div>
    </div>
  );
}