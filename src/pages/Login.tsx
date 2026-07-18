import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onLogin: () => void;
}

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      setError('البريد الإلكتروني أو كلمة المرور غلط');
      setLoading(false);
      return;
    }

    // التحقق من الباسورد
    const { data: verified } = await supabase.rpc('verify_admin_password', {
      input_email: email,
      input_password: password,
    });

    if (!verified) {
      setError('البريد الإلكتروني أو كلمة المرور غلط');
      setLoading(false);
      return;
    }

    localStorage.setItem('admin', JSON.stringify(data));
    onLogin();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">لوحة التحكم</h1>
        <p className="text-center text-gray-500 mb-8">متجر السعادة الزوجية</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 mb-2 text-sm font-medium">البريد الإلكتروني</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
            placeholder="admin@marital-store.com"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2 text-sm font-medium">كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
            placeholder="••••••••"
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
        >
          {loading ? 'جاري التحقق...' : 'دخول'}
        </button>
      </div>
    </div>
  );
}
