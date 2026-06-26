'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AtSign, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../lib/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-10 shadow-[0_40px_120px_rgba(8,15,42,0.38)] backdrop-blur-xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200">
            <ShieldCheck className="h-4 w-4 text-cyan-300" />
            Government-grade identity and document verification.
          </div>
          <div className="mt-10 space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">Connect</p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Secure access for every citizen workflow.
              </h1>
            </div>
            <div className="grid gap-4 text-slate-300 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/80 px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Trusted</p>
                <p className="mt-2 text-sm leading-6">Encrypted session handling and role-aware service access.</p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/80 px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Fast</p>
                <p className="mt-2 text-sm leading-6">Jump straight into uploads, verification, and tracking.</p>
              </div>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-300">
              Sign in to manage your government services, keep trusted documents ready, and see every verification step clearly.
            </p>
          </div>
        </section>

        <div className="rounded-[2rem] bg-white p-10 shadow-[0_40px_120px_rgba(15,23,42,0.18)] text-slate-950">
          <div className="mb-8 space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Sign in</p>
            <h2 className="text-3xl font-black tracking-tight">Welcome back</h2>
            <p className="text-sm text-slate-500">Enter your email and secure password to continue.</p>
          </div>

          {error && <Alert variant="error" title="Unable to sign in">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="login-email"
              label="Email address"
              type="email"
              value={email}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
              placeholder="you@example.com"
              icon={<AtSign className="h-4 w-4 text-slate-400" />}
              required
            />
            <Input
              id="login-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
              placeholder="Enter your password"
              icon={<Lock className="h-4 w-4 text-slate-400" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-slate-400 transition hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              required
            />

            <Button type="submit" fullWidth loading={loading}>
              {loading ? 'Signing in...' : 'Sign in securely'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New to Connect?{' '}
            <Link href="/auth/register" className="font-semibold text-slate-950 hover:text-blue-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
