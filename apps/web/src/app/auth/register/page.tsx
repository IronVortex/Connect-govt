'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AtSign, Eye, EyeOff, Lock, User, UserPlus } from 'lucide-react';
import { useAuth } from '../../../lib/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12 antialiased selection:bg-blue-500/10 transition-colors duration-300">
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-12 lg:items-center">
        
        {/* Left Informational Content Panel */}
        <section className="lg:col-span-7 space-y-6 p-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/30 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 w-fit">
            <UserPlus className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>Start your secure document journey</span>
          </div>
          
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Account Registration</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl max-w-md leading-tight">
              Build your trusted government dossier.
            </h1>
            <p className="text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400 max-w-lg">
              Complete your simple onboarding steps to get immediate, unified access to verified file uploads, public service request logs, and an immutable personal document wallet.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-2 max-w-xl">
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Fully Verified</p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 leading-normal">
                Securely store official parameters for lightning-fast public applications.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Token Protection</p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 leading-normal">
                State-of-the-art session storage backed by encrypted cryptographic tokens.
              </p>
            </div>
          </div>
        </section>

        {/* Right Core Interactive Form Card */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <div className="mb-6 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Onboarding Portal</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Get started</h2>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Create your citizen account to continue.</p>
          </div>

          {error && (
            <Alert variant="error" title="Registration issue" className="mb-5">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="register-name"
              label="Full name"
              type="text"
              value={name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
              placeholder="John Doe"
              icon={<User className="h-4 w-4" />}
              required
            />

            <Input
              id="register-email"
              label="Email address"
              type="email"
              value={email}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
              placeholder="you@example.com"
              icon={<AtSign className="h-4 w-4" />}
              required
            />
            
            <Input
              id="register-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
              placeholder="Create a strong password"
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
              Create your account
            </Button>
          </form>

          <p className="mt-5 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-slate-900 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-150">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}