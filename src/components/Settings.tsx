import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import ChangePasswordForm from './ChangePasswordForm';

interface Setting {
  id: number;
  key: string;
  value: string;
  description: string;
}

interface DiscountCode {
  id: number;
  code: string;
  percentage: number;
  is_active: boolean;
}

const settingLabels: Record<string, string> = {
  store_name: 'اسم المتجر',
  wallet_number: 'رقم المحفظة',
  whatsapp_number: 'رقم الواتساب',
  free_shipping_threshold: 'الحد الأدنى للشحن المجاني (ج)',
  default_shipping_cost: 'تكلفة الشحن (ج)',
};

export default function Settings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [newCode, setNewCode] = useState({ code: '', percentage: '' });

  const fetchData = async () => {
    const [settingsRes, codesRes] = await Promise.all([
      supabase.from('settings').select('*'),
      supabase.from('discount_codes').select('*').order('id'),
    ]);
    setSettings(settingsRes.data || []);
    setCodes(codesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const saveSettings = async () => {
    for (const s of settings) {
      await supabase.from('settings').update({ value: s.value }).eq('key', s.key);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleCode = async (id: number, current: boolean) => {
    await supabase.from('discount_codes').update({ is_active: !current }).eq('id', id);
    fetchData();
  };

  const deleteCode = async (id: number) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    await supabase.from('discount_codes').delete().eq('id', id);
    fetchData();
  };

  const addCode = async () => {
    if (!newCode.code || !newCode.percentage) return;
    await supabase.from('discount_codes').insert({
      code: newCode.code.toUpperCase(),
      percentage: Number(newCode.percentage),
    });
    setNewCode({ code: '', percentage: '' });
    fetchData();
  };

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6">إعدادات المتجر</h2>
        <div className="space-y-4">
          {settings.map(s => (
            <div key={s.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {settingLabels[s.key] || s.key}
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                value={s.value}
                onChange={e => updateSetting(s.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <button
          onClick={saveSettings}
          className={`mt-6 px-6 py-2 rounded-lg text-white transition ${saved ? 'bg-green-500' : 'bg-purple-600 hover:bg-purple-700'}`}
        >
          {saved ? '✅ تم الحفظ!' : 'حفظ الإعدادات'}
        </button>
      </div>

      {/* Discount Codes */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6">أكواد الخصم</h2>

        {/* Add Code */}
        <div className="flex gap-3 mb-6">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
            placeholder="كود الخصم (مثال: SAVE10)"
            value={newCode.code}
            onChange={e => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
          />
          <input
            className="w-24 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
            placeholder="النسبة %"
            type="number"
            value={newCode.percentage}
            onChange={e => setNewCode({ ...newCode, percentage: e.target.value })}
          />
          <button
            onClick={addCode}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            إضافة
          </button>
        </div>

        {/* Codes List */}
        <div className="space-y-3">
          {codes.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-purple-600">{c.code}</span>
                <span className="text-sm text-gray-500">{c.percentage}% خصم</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleCode(c.id, c.is_active)}
                  className={`text-xs px-3 py-1 rounded-full ${c.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                >
                  {c.is_active ? 'مفعّل' : 'موقوف'}
                </button>
                <button onClick={() => deleteCode(c.id)} className="text-red-500 hover:text-red-700 text-sm">حذف</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Change Password */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6">تغيير الباسورد</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
