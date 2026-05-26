'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import apiClient from '../services/apiClient';
import { getAccessToken, setAccessToken, clearAccessToken } from '../services/auth';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = pathname === '/' || pathname.startsWith('/auth');

  const fetchProfile = useCallback(async (token: string) => {
    try {
      const response = await apiClient.get('/users/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUser({
        id: response.data._id || response.data.id || response.data.sub,
        email: response.data.email,
        name: response.data.name,
        role: response.data.role,
        profileImage: response.data.profileImage,
      });
    } catch {
      clearAccessToken();
      setUser(null);
      if (!isPublicRoute) {
        router.push('/auth/login');
      }
    } finally {
      setLoading(false);
    }
  }, [isPublicRoute, router]);

  const refreshProfile = async () => {
    const token = getAccessToken();
    if (token) {
      await fetchProfile(token);
      return;
    }

    try {
      const response = await apiClient.post('/auth/refresh');
      const accessToken = response.data?.access_token;
      if (accessToken) {
        setAccessToken(accessToken);
        await fetchProfile(accessToken);
        return;
      }
    } catch {
      clearAccessToken();
      setUser(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      fetchProfile(token);
    } else {
      void refreshProfile();
    }
  }, [fetchProfile]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setLoading(false);
      if (!isPublicRoute) {
        router.push('/auth/login');
      }
    };

    window.addEventListener('connect:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('connect:unauthorized', handleUnauthorized);
  }, [isPublicRoute, router]);

  // Protected route redirects
  useEffect(() => {
    if (loading) return;

    const isAuthRoute = pathname.startsWith('/auth');
    if (!user && !isPublicRoute) {
      router.push('/auth/login');
    } else if (user && isAuthRoute) {
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router, isPublicRoute]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { access_token } = response.data;
      setAccessToken(access_token);
      await fetchProfile(access_token);
      router.push('/dashboard');
    } catch (err: any) {
      clearAccessToken();
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/register', { name, email, password });
      const { access_token } = response.data;
      setAccessToken(access_token);
      await fetchProfile(access_token);
      router.push('/dashboard');
    } catch (err: any) {
      clearAccessToken();
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      clearAccessToken();
      setUser(null);
      router.push('/auth/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes loading-progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}} />
        
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>
        
        {/* Glowing blue backdrop light */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#1D61FF]/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 max-w-sm w-full text-center flex flex-col items-center">
          {/* Logo container with pulse ring */}
          <div className="relative mb-8 w-20 h-20">
            <div className="absolute inset-0 bg-[#1D61FF]/30 rounded-[24px] blur-xl animate-pulse"></div>
            <div className="absolute inset-0 border border-[#1D61FF]/50 rounded-[24px] animate-ping opacity-40"></div>
            <div className="relative bg-slate-900 border border-slate-800 rounded-[24px] w-full h-full flex items-center justify-center shadow-2xl">
              <svg className="w-10 h-10 text-[#1D61FF] animate-pulse" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-extrabold text-white tracking-tight">Securing Connection...</h2>
          <p className="text-slate-400 mt-2.5 text-sm font-medium leading-relaxed max-w-[280px]">
            Establishing a verified credentials channel with government services.
          </p>

          {/* Loading status/bar */}
          <div className="w-full bg-slate-900 border border-slate-800/80 rounded-2xl h-1.5 mt-8 overflow-hidden relative">
            <div 
              className="absolute bg-gradient-to-r from-[#1D61FF] to-[#00C6FF] h-full w-2/3 rounded-full"
              style={{ animation: 'loading-progress 1.5s ease-in-out infinite' }}
            ></div>
          </div>

          <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#1D61FF] mt-4 animate-pulse">
            Simple. Secure. Verified.
          </span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
