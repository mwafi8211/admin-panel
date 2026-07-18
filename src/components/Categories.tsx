import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Category {
  id: number;
  name: string;
  name_en: string;
  icon: string;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', name_en: '', icon: '🎀' });

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('id', { ascending: true });
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setForm({ name: '', name_en: '', icon: '🎀' });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, name_en: c.name_en || '', icon: c.icon || '🎀' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('اكتب اسم القسم');
      return;
    }

    const payload = { name: form.name, name_en: form.name_en, icon: form.icon };

    if (editing) {
      await supabase.from('categories').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('categories').insert(payload);
    }
    resetForm();
    fetchCategories();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من الحذف؟ لو فيه منتجات مرتبطة بالقسم ده هيحصل خطأ.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      alert('مينفعش تحذف القسم ده لأنه مرتبط بمنتجات موجودة. عدّل المنتجات الأول أو خليه بس.');
      return;
    }
    fetchCategories();
  };

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">الأقسام ({categories.length})</h2>
        <button onClick={() => setShowForm(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">
          + إضافة قسم
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editing ? 'تعديل القسم' : 'إضافة قسم جديد'}</h3>
            <div className="space-y-3">
              <input className="w-full border rounded-lg px-3 py-2" placeholder="اسم القسم (عربي)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input className="w-full border rounded-lg px-3 py-2" placeholder="اسم القسم (إنجليزي)" value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} />
              <input className="w-full border rounded-lg px-3 py-2" placeholder="الأيقونة (إيموجي)" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} />
              <p className="text-xs text-gray-400">مثال: 🃏 🎲 👙 💍 🎁 🕯️ 💝</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition">حفظ</button>
              <button onClick={resetForm} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right px-4 py-3 text-sm text-gray-600">الأيقونة</th>
              <th className="text-right px-4 py-3 text-sm text-gray-600">الاسم (عربي)</th>
              <th className="text-right px-4 py-3 text-sm text-gray-600">الاسم (إنجليزي)</th>
              <th className="text-right px-4 py-3 text-sm text-gray-600">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map(c => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-xl">{c.icon || '🎀'}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{c.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.name_en}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(c)} className="text-blue-600 hover:text-blue-800 text-sm">تعديل</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-sm">حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
