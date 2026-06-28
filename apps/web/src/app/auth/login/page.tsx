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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12 antialiased selection:bg-blue-500/10 transition-colors duration-300">
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-12 lg:items-center">
        
        {/* Hero / Promo Section */}
        <section className="lg:col-span-7 space-y-6 p-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/30 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 w-fit">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>Government-grade identity &amp; document security</span>
          </div>
          
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">ConnectGov Platform</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl max-w-md leading-tight">
              Secure digital access for every citizen workflow.
            </h1>
            <p className="text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400 max-w-lg">
              Sign in to manage your government services portal, keep your verified identity records ready, and audit every automated compliance step transparently.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-2 max-w-xl">
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Encrypted Security</p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 leading-normal">
                Isolated sessions backed by granular role-aware service controls.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Automated OCR</p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 leading-normal">
                Instantly parse uploads, run validations, and view instant status logs.
              </p>
            </div>
          </div>
        </section>

        {/* Login Form Panel */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm dark:shadow-slate-950/50">
          <div className="mb-6 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Portal Authentication</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Welcome back</h2>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Enter your credentials to access your console.</p>
          </div>

          {error && (
            <Alert variant="error" title="Unable to sign in" className="mb-5">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="login-email"
              label="Email address"
              type="email"
              value={email}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
              placeholder="you@example.com"
              icon={<AtSign className="h-4 w-4" />}
              required
            />
            
            <Input
              id="login-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
              placeholder="Enter your account password"
              icon={<Lock className="h-4 w-4" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-slate-400 dark:text-slate-500 transition-colors duration-150 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              required
            />

            <Button type="submit" fullWidth loading={loading} className="mt-2">
              Sign in securely
            </Button>
          </form>

          <p className="mt-5 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
            New to ConnectGov?{' '}
            <Link href="/auth/register" className="font-semibold text-slate-900 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-150">
              Create an account
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}