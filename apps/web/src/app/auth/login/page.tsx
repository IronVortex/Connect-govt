'use client';

import { useState } from 'react';
import { useAuth } from '../../../lib/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-xl border border-slate-200 p-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Sign in to Connect</h1>
        <p className="mt-2 text-sm text-slate-500">Access your dashboard, upload documents, and track status.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#1D61FF] text-white font-bold py-3 text-sm hover:bg-[#1553DB] transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          New to Connect? <a href="/auth/register" className="text-[#1D61FF] font-semibold hover:underline">Create an account</a>
        </p>
      </div>
    </div>
  );
}
