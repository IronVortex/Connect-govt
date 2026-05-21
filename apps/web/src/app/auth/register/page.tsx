'use client';

import { useState } from 'react';
import { useAuth } from '../../../lib/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Register failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-xl border border-slate-200 p-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Create an account</h1>
        <p className="mt-2 text-sm text-slate-500">Get started with Connect to manage your document workflows.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-[#1D61FF] focus:ring-[#1D61FF]/20 outline-none"
              placeholder="Your full name"
              required
            />
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-[#1D61FF] focus:ring-[#1D61FF]/20 outline-none"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-[#1D61FF] focus:ring-[#1D61FF]/20 outline-none"
              placeholder="Create a strong password"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#1D61FF] text-white font-bold py-3 text-sm hover:bg-[#1553DB] transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          Already have an account? <a href="/auth/login" className="text-[#1D61FF] font-semibold hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
