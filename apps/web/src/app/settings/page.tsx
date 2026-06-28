'use client';

import { useState, useEffect, useRef } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
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
  BadgeCheck,
  Trash2,
  Briefcase,
  ShieldAlert,
  Calendar,
  Phone,
  GraduationCap,
  Building,
  FileText
} from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshProfile } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('indian');
  const [address, setAddress] = useState('');
  
  // Custom mock fields stored in localStorage for Phase 1 persistence
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [bio, setBio] = useState('');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeApplications, setActiveApplications] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarSrc = (() => {
    if (gender === 'male') {
      return 'https://api.dicebear.com/7.x/avataaars/svg?seed=Male&style=circle';
    }
    if (gender === 'female') {
      return 'https://api.dicebear.com/7.x/avataaars/svg?seed=Female&style=circle';
    }
    if (gender === 'other' || gender === 'prefer_not') {
      return 'https://api.dicebear.com/7.x/avataaars/svg?seed=Neutral&style=circle';
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || user?.email || 'guest'}`;
  })();

  const age = dob 
    ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) 
    : null;

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setProfileImage(user.profileImage || '');
      setGender(user.gender || '');
      setDob(user.dob || '');
      setNationality(user.nationality || 'indian');
      setAddress(user.address || '');

      // Load client-persisted custom fields
      setPhone(localStorage.getItem(`connect_phone_${user.id}`) || '');
      setCollege(localStorage.getItem(`connect_college_${user.id}`) || '');
      setDepartment(localStorage.getItem(`connect_department_${user.id}`) || '');
      setBio(localStorage.getItem(`connect_bio_${user.id}`) || '');

      apiClient.get('/applications').then((res) => {
        const apps = res.data || [];
        const active = apps.filter((a: any) => !['APPROVED', 'REJECTED'].includes(a.status));
        setActiveApplications(active.length);
      }).catch(() => {});
    }
  }, [user]);

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsSavingProfile(true);

    try {
      await apiClient.put('/users/profile', {
        name,
        email,
        profileImage,
        gender,
        dob,
        nationality,
        address
      });

      // Save custom fields locally
      if (user?.id) {
        localStorage.setItem(`connect_phone_${user.id}`, phone);
        localStorage.setItem(`connect_college_${user.id}`, college);
        localStorage.setItem(`connect_department_${user.id}`, department);
        localStorage.setItem(`connect_bio_${user.id}`, bio);
      }

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
    <PageLayout>
      <div className="space-y-8 py-4">
        
        {/* Header Title Section */}
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Profile Settings</h2>
          <p className="text-sm text-gray-500 mt-1 dark:text-slate-400">Manage your account details, security credentials, and profile image.</p>
        </div>

        {/* Form Layout Split Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Personal Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-slate-800 shadow-sm shadow-slate-200/40 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-8 border-b border-gray-100 dark:border-slate-850 pb-5">
                <UserIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Personal Information</h3>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100 dark:border-slate-850">
                  <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                    <div className="w-24 h-24 rounded-full border-4 border-slate-50 dark:border-slate-800 overflow-hidden shadow-sm relative bg-slate-100 dark:bg-slate-850 flex items-center justify-center">
                      <img 
                        src={profileImage || avatarSrc} 
                        alt="Profile Avatar" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="absolute bottom-0 right-0 bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 active:scale-90 transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="text-center sm:text-left">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 justify-center sm:justify-start">
                      {user?.name || 'User Account'}
                      <BadgeCheck className="w-4 h-4 text-blue-600 fill-blue-650/10" />
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider font-bold bg-slate-50 dark:bg-slate-850 px-2.5 py-1 rounded-full inline-block">
                      {user?.role || 'Citizen'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                      Allowed JPG, PNG or GIF. Max size 2MB.
                    </p>
                    {profileImage && (
                      <button
                        type="button"
                        onClick={handleDeletePhoto}
                        className="mt-3 text-xs font-bold text-red-650 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-950/30 transition-all duration-150 flex items-center gap-1.5 mx-auto sm:mx-0 active:scale-95"
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

                {profileMessage && (
                  <div className={`p-4 rounded-xl flex items-start gap-3 text-sm ${
                    profileMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                      : 'bg-red-50 text-red-800 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
                  }`}>
                    {profileMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-500" />
                    )}
                    <p className="font-medium">{profileMessage.text}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500" htmlFor="name">
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
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium placeholder:text-slate-450 dark:placeholder:text-slate-650 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500" htmlFor="email">
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
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium placeholder:text-slate-450 dark:placeholder:text-slate-650 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500" htmlFor="phone">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="tel" 
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium placeholder:text-slate-450 dark:placeholder:text-slate-650 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* College/University */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500" htmlFor="college">
                      College / University
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        id="college"
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        placeholder="Name of Educational Institute"
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium placeholder:text-slate-450 dark:placeholder:text-slate-650 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Department */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500" htmlFor="department">
                      Department
                    </label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        id="department"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Academic or Administrative Department"
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium placeholder:text-slate-450 dark:placeholder:text-slate-650 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500" htmlFor="dob">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        id="dob"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                      />
                    </div>
                    {dob && age !== null && age >= 0 && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold">
                        Age: {age} years
                      </p>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500" htmlFor="gender">
                      Gender
                    </label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not">Prefer not to say</option>
                    </select>
                  </div>

                  {/* Nationality */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500" htmlFor="nationality">
                      Nationality
                    </label>
                    <select
                      id="nationality"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                    >
                      <option value="indian">Indian</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Bio */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500" htmlFor="bio">
                      Bio (Optional)
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                      <textarea
                        id="bio"
                        rows={2}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us a little about yourself"
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium placeholder:text-slate-450 dark:placeholder:text-slate-650 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 dark:focus:border-blue-500 transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500" htmlFor="address">
                      Address
                    </label>
                    <textarea
                      id="address"
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your residential address"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium placeholder:text-slate-450 dark:placeholder:text-slate-650 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 dark:focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isSavingProfile}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isSavingProfile ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Security */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-slate-800 shadow-sm shadow-slate-200/40 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-8 border-b border-gray-100 dark:border-slate-850 pb-5">
                <Lock className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Security Settings</h3>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-6">
                {securityMessage && (
                  <div className={`p-4 rounded-xl flex items-start gap-3 text-sm ${
                    securityMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                      : 'bg-red-50 text-red-800 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
                  }`}>
                    {securityMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-500" />
                    )}
                    <p className="font-medium">{securityMessage.text}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500" htmlFor="currentPassword">
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
                        className="w-full pl-11 pr-12 py-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium placeholder:text-slate-450 dark:placeholder:text-slate-650 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350"
                      >
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500" htmlFor="newPassword">
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
                        className="w-full pl-11 pr-12 py-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium placeholder:text-slate-450 dark:placeholder:text-slate-650 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500" htmlFor="confirmPassword">
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
                        className="w-full pl-11 pr-12 py-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-medium placeholder:text-slate-450 dark:placeholder:text-slate-650 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350"
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
                    className="w-full px-6 py-2.5 border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:bg-slate-100 dark:disabled:bg-slate-900 font-bold text-xs rounded-xl transition-all active:scale-[0.98]"
                  >
                    {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Overview Metrics Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-slate-800 shadow-sm shadow-slate-200/40 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-8 border-b border-gray-100 dark:border-slate-850 pb-5">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Your Applications</h3>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50/55 dark:bg-slate-950/50 rounded-2xl p-6 border border-gray-100 dark:border-slate-850 flex flex-col justify-between gap-6">
                  <div>
                    <div className="text-3xl font-extrabold text-[#1D61FF] dark:text-blue-500 leading-none">{activeApplications}</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-2">Active Applications</div>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Last updated: today</p>
                  </div>
                  <a
                    href="/applications"
                    className="px-4 py-2.5 bg-[#1D61FF] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm text-center transition-all duration-150 active:scale-[0.98] inline-block shrink-0"
                  >
                    View All Applications
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone Block */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-slate-800 shadow-sm shadow-slate-200/40 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-slate-850 pb-5">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h3 className="text-xl font-semibold text-red-650">Danger Zone</h3>
          </div>

          <div className="border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-red-950 dark:text-red-400">Delete Account</h4>
              <p className="text-red-700/80 dark:text-red-500/80 text-xs font-semibold">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>

            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2.5 border border-red-500 text-red-600 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold text-xs rounded-xl shadow-sm transition-all duration-150 active:scale-[0.98] text-center"
              >
                Delete Account
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/80 dark:bg-slate-950 border border-red-150 dark:border-red-900 rounded-xl p-3 shadow-sm shrink-0">
                <span className="text-xs font-bold text-red-850 dark:text-red-400 px-1">
                  Are you sure? This will delete all your data.
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsDeleting(true);
                      try {
                        await apiClient.delete('/users/profile');
                        window.location.href = '/auth/login';
                      } catch (err: any) {
                        setIsDeleting(false);
                        setShowDeleteConfirm(false);
                        alert('Failed to delete account. Please try again.');
                      }
                    }}
                    disabled={isDeleting}
                    className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors text-center disabled:opacity-60"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg transition-colors text-center disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}