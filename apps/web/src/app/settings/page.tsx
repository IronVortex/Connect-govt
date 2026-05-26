'use client';

import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { useAuth } from '../../lib/AuthContext';
import apiClient from '../../services/apiClient';
import { 
  User as UserIcon, 
  Lock, 
  Mail, 
  Camera, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  BadgeCheck,
  Trash2
} from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshProfile } = useAuth();

  // Profile Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Visibility States
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setProfileImage(user.profileImage || '');
    }
  }, [user]);

  // Handle Photo Upload & Base64 conversion
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileMessage({ type: 'error', text: 'Only image files are allowed.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage({ type: 'error', text: 'Image size should be less than 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setProfileImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = () => {
    setProfileImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsSavingProfile(true);

    try {
      await apiClient.put('/users/profile', {
        name,
        email,
        profileImage
      });
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      await refreshProfile();
    } catch (err: any) {
      setProfileMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile.'
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Submit Password Change
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMessage(null);

    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 8) {
      setSecurityMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await apiClient.put('/users/password', {
        currentPassword,
        newPassword
      });
      setSecurityMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update password.'
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[280px]">
        <Topbar />
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
          {/* Header */}
          <div className="mb-10">
            <h2 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">Profile Settings</h2>
            <p className="text-slate-500 text-[15px] font-medium mt-1">Manage your account details, security credentials, and profile image.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Profile Card & General Info */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm shadow-slate-200/40">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-5">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  <h3 className="text-xl font-bold text-[#0F172A]">Personal Information</h3>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Profile Photo Section */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-50">
                    <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                      <div className="w-28 h-28 rounded-full border-4 border-slate-50 overflow-hidden shadow-sm relative bg-slate-100 flex items-center justify-center">
                        {profileImage ? (
                          <img 
                            src={profileImage} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img 
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || user?.email || 'guest'}`} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className="absolute bottom-0 right-0 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 active:scale-90 transition-all duration-150"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="text-center sm:text-left">
                      <h4 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-1.5 justify-center sm:justify-start">
                        {user?.name || 'User Account'}
                        <BadgeCheck className="w-5 h-5 text-blue-600 fill-blue-600/10" />
                      </h4>
                      <p className="text-sm text-slate-400 mt-1 uppercase tracking-wider font-semibold text-[11px] bg-slate-50 px-2.5 py-1 rounded-full inline-block">
                        {user?.role || 'Citizen'}
                      </p>
                      <p className="text-xs text-slate-400 mt-2.5">
                        Allowed JPG, PNG or GIF. Max size 2MB.
                      </p>
                      {profileImage && (
                        <button
                          type="button"
                          onClick={handleDeletePhoto}
                          className="mt-3 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition-all duration-150 flex items-center gap-1.5 mx-auto sm:mx-0 active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Photo
                        </button>
                      )}
                    </div>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*"
                    />
                  </div>

                  {/* Profile Form Messages */}
                  {profileMessage && (
                    <div className={`p-4 rounded-xl flex items-start gap-3 text-sm ${
                      profileMessage.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                        : 'bg-rose-50 text-rose-800 border border-rose-100'
                    }`}>
                      {profileMessage.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                      )}
                      <p className="font-medium">{profileMessage.text}</p>
                    </div>
                  )}

                  {/* Form Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="name">
                        Full Name
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          required
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[14px] font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="email">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="email" 
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@government.in"
                          required
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[14px] font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={isSavingProfile}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {isSavingProfile ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Security (Password Change) */}
            <div className="space-y-8">
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm shadow-slate-200/40">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-5">
                  <Lock className="w-5 h-5 text-blue-600" />
                  <h3 className="text-xl font-bold text-[#0F172A]">Security Settings</h3>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-6">
                  {/* Security Form Messages */}
                  {securityMessage && (
                    <div className={`p-4 rounded-xl flex items-start gap-3 text-sm ${
                      securityMessage.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                        : 'bg-rose-50 text-rose-800 border border-rose-100'
                    }`}>
                      {securityMessage.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                      )}
                      <p className="font-medium">{securityMessage.text}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Current Password */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="currentPassword">
                        Current Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type={showCurrent ? "text" : "password"} 
                          id="currentPassword"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[14px] font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowCurrent(!showCurrent)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="newPassword">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type={showNew ? "text" : "password"} 
                          id="newPassword"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[14px] font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="confirmPassword">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type={showConfirm ? "text" : "password"} 
                          id="confirmPassword"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[14px] font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={isUpdatingPassword}
                      className="w-full px-6 py-3 border-2 border-slate-200 text-[#0F172A] hover:bg-slate-50 disabled:bg-slate-100 font-bold text-sm rounded-xl transition-all active:scale-[0.98]"
                    >
                      {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
