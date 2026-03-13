import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const NGOLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const update = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = await api.ngoLogin(form);
      localStorage.setItem('ngoAuthToken', result.token);
      toast.success('NGO login successful');
      navigate('/ngo/dashboard');
    } catch (error) {
      console.error('NGO login failed:', error);
      toast.error('Invalid NGO credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-white flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md bg-[#1E293B] border border-[#334155] rounded-xl p-6 space-y-4"
      >
        <h1 className="text-2xl font-bold">NGO Portal Login</h1>
        <p className="text-[#94A3B8] text-sm">
          Login with approved NGO email and password set during onboarding.
        </p>

        <label className="space-y-1 block">
          <span className="text-sm text-[#CBD5E1]">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2"
            required
          />
        </label>

        <label className="space-y-1 block">
          <span className="text-sm text-[#CBD5E1]">Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="w-full bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2"
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#059669] hover:bg-[#047857] disabled:opacity-60 rounded-md py-3 font-semibold"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};

export default NGOLogin;
