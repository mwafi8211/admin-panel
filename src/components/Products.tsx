import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Product {
  id: number;
  name: string;
  price: number;
  old_price?: number;
  image: string;
  images?: string[];
  category_id: number;
  is_active: boolean;
  is_offer: boolean;
  is_new: boolean;
  discount: number;
  stock: number;
  rating: number;
  description?: string;
  free_shipping: boolean;
  is_single_product: boolean;
}

interface Category {
  id: number;
  name: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [form, setForm] = useState({
    name: '', price: '', old_price: '', image: '', images: [] as string[], category_id: '',
    description: '', stock: '', discount: '0', is_new: false, is_offer: false, is_active: true, free_shipping: false, is_single_product: false,
  });

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name');
    setCategories(data || []);
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const resetForm = () => {
    setForm({ name: '', price: '', old_price: '', image: '', images: [], category_id: '', description: '', stock: '', discount: '0', is_new: false, is_offer: false, is_active: true, free_shipping: false, is_single_product: false });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, price: String(p.price), old_price: String(p.old_price || ''),
      image: p.image, images: p.images || [], category_id: String(p.category_id), description: p.description || '',
      stock: String(p.stock), discount: String(p.discount), is_new: p.is_new,
      is_offer: p.is_offer, is_active: p.is_active, free_shipping: p.free_shipping, is_single_product: p.is_single_product,
    });
    setShowForm(true);
  };

  // بترفع أي صورة لـ Supabase Storage وترجع الرابط المباشر بتاعها
  const uploadToStorage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error } = await supabase.storage.from('product-images').upload(fileName, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  // رفع الصورة الرئيسية
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToStorage(file);
      setForm(f => ({ ...f, image: url }));
    } catch (err: any) {
      alert('حصل خطأ أثناء رفع الصورة: ' + err.message);
    }
    setUploading(false);
    e.target.value = '';
  };

  // رفع صور إضافية (اختيارية) - ممكن تختار أكتر من صورة مرة واحدة
  const handleExtraImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingExtra(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadToStorage(file);
        urls.push(url);
      }
      setForm(f => ({ ...f, images: [...f.images, ...urls] }));
    } catch (err: any) {
      alert('حصل خطأ أثناء رفع الصور: ' + err.message);
    }
    setUploadingExtra(false);
    e.target.value = '';
  };

  const removeExtraImage = (url: string) => {
    setForm(f => ({ ...f, images: f.images.filter(img => img !== url) }));
  };

  const handleSave = async () => {
    const payload = {
      name: form.name, price: Number(form.price),
      old_price: form.old_price ? Number(form.old_price) : null,
      image: form.image, images: form.images, category_id: Number(form.category_id),
      description: form.description, stock: Number(form.stock),
      discount: Number(form.discount), is_new: form.is_new,
      is_offer: form.is_offer, is_active: form.is_active, free_shipping: form.free_shipping,
      is_single_product: form.is_single_product,
    };

    if (form.is_single_product) {
      await supabase.from('products').update({ is_single_product: false }).eq('is_single_product', true);
    }

    if (editing) {
      await supabase.from('products').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('products').insert(payload);
    }
    resetForm();
    fetchProducts();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  const toggleActive = async (id: number, current: boolean) => {
    await supabase.from('products').update({ is_active: !current }).eq('id', id);
    fetchProducts();
  };

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">المنتجات ({products.length})</h2>
        <button onClick={() => setShowForm(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">
          + إضافة منتج
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
            <div className="space-y-3">
              <input className="w-full border rounded-lg px-3 py-2" placeholder="اسم المنتج" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className="border rounded-lg px-3 py-2" placeholder="السعر" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                <input className="border rounded-lg px-3 py-2" placeholder="السعر القديم" type="number" value={form.old_price} onChange={e => setForm({ ...form, old_price: e.target.value })} />
              </div>

              {/* الصورة الرئيسية */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">الصورة الرئيسية</label>
                {form.image && (
                  <img src={form.image} alt="معاينة" className="w-24 h-24 object-cover rounded-lg mb-2 border" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                {uploading && <p className="text-xs text-purple-600 mt-1">جاري رفع الصورة...</p>}
              </div>

              {/* صور إضافية (اختياري) */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">صور إضافية (اختياري)</label>
                {form.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.images.map((img, i) => (
                      <div key={i} className="relative">
                        <img src={img} alt={`صورة ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border" />
                        <button
                          type="button"
                          onClick={() => removeExtraImage(img)}
                          className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleExtraImagesUpload}
                  disabled={uploadingExtra}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                {uploadingExtra && <p className="text-xs text-purple-600 mt-1">جاري رفع الصور...</p>}
                <p className="text-xs text-gray-400 mt-1">تقدر تختار أكتر من صورة مرة واحدة</p>
              </div>

              <select className="w-full border rounded-lg px-3 py-2" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">اختر القسم</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <textarea className="w-full border rounded-lg px-3 py-2" placeholder="الوصف" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className="border rounded-lg px-3 py-2" placeholder="المخزون" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                <input className="border rounded-lg px-3 py-2" placeholder="نسبة الخصم %" type="number" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_new} onChange={e => setForm({ ...form, is_new: e.target.checked })} />
                  <span className="text-sm">جديد</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_offer} onChange={e => setForm({ ...form, is_offer: e.target.checked })} />
                  <span className="text-sm">عرض</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                  <span className="text-sm">مفعّل</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.free_shipping} onChange={e => setForm({ ...form, free_shipping: e.target.checked })} />
                  <span className="text-sm">الشحن مجاني</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_single_product} onChange={e => setForm({ ...form, is_single_product: e.target.checked })} />
                  <span className="text-sm">صفحة المنتج المستقل</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={uploading || uploadingExtra} className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50">حفظ</button>
              <button onClick={resetForm} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right px-4 py-3 text-sm text-gray-600">المنتج</th>
              <th className="text-right px-4 py-3 text-sm text-gray-600">السعر</th>
              <th className="text-right px-4 py-3 text-sm text-gray-600">المخزون</th>
              <th className="text-right px-4 py-3 text-sm text-gray-600">الحالة</th>
              <th className="text-right px-4 py-3 text-sm text-gray-600">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(p => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                    <span className="text-sm font-medium text-gray-800">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.price} ج</td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.stock}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(p.id, p.is_active)} className={`text-xs px-3 py-1 rounded-full ${p.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {p.is_active ? 'مفعّل' : 'موقوف'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(p)} className="text-blue-600 hover:text-blue-800 text-sm">تعديل</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 text-sm">حذف</button>
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