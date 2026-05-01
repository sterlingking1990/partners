'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Camera, 
  Edit3, 
  Check, 
  X, 
  LogOut, 
  ChevronRight, 
  Wallet, 
  History, 
  Bell, 
  ShieldCheck, 
  Globe, 
  Coins,
  Loader2,
  Trash2,
  MessageCircle,
  HelpCircle,
  Star,
  Users,
  Award,
  Hash
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

export default function InfluencerProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [editing, setEditing] = useState(false)
  
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    private_campaign_rate: '',
    state: '',
    lga: '',
    interests: [] as string[]
  })

  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)
      if (profileData) {
        setFormData({
          full_name: profileData.full_name || '',
          bio: profileData.bio || '',
          private_campaign_rate: profileData.private_campaign_rate?.toString() || '',
          state: profileData.state || '',
          lga: profileData.lga || '',
          interests: profileData.interests || []
        })
      }

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUpdating(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl })
      setToastMessage('Profile picture updated!')
      setShowToast(true)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          bio: formData.bio,
          private_campaign_rate: formData.private_campaign_rate ? parseFloat(formData.private_campaign_rate) : null,
          state: formData.state,
          lga: formData.lga,
          interests: formData.interests
        })
        .eq('id', profile.id)

      if (error) throw error

      setToastMessage('Profile updated successfully!')
      setShowToast(true)
      setEditing(false)
      fetchData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
         <Loader2 className="animate-spin text-brand" size={40} />
         <p className="text-gray-500 font-bold uppercase tracking-widest mt-4 text-[10px]">Loading Profile...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleUpdateAvatar}
      />

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <User className="text-brand" size={20} />
          <h1 className="text-lg font-semibold text-gray-800">My Profile</h1>
        </div>
      </header>

      <main className="p-8 max-w-5xl mx-auto w-full space-y-8 pb-20">
        {/* Profile Header Card */}
        <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 left-0 right-0 h-32 bg-brand/5 group-hover:bg-brand/10 transition-colors" />
           
           <div className="relative flex flex-col md:flex-row items-center gap-8">
              <div className="relative">
                 <div className="h-32 w-32 rounded-[2.5rem] border-4 border-white shadow-xl overflow-hidden bg-gray-100">
                    <img 
                      src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || profile?.username}&background=random`} 
                      className="h-full w-full object-cover"
                      alt=""
                    />
                    {updating && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                         <Loader2 className="animate-spin text-white" size={24} />
                      </div>
                    )}
                 </div>
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="absolute -bottom-2 -right-2 h-10 w-10 bg-brand text-white rounded-2xl border-4 border-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                 >
                    <Camera size={18} />
                 </button>
              </div>

              <div className="flex-1 text-center md:text-left space-y-2">
                 <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <h2 className="text-3xl font-black text-gray-900">{profile?.full_name || 'Your Name'}</h2>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 text-brand rounded-full text-[10px] font-black uppercase tracking-widest self-center md:self-auto">
                       <Award size={14} />
                       Influencer
                    </div>
                 </div>
                 <p className="text-gray-500 font-bold tracking-wide">@{profile?.username}</p>
                 
                 <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                       <Coins size={16} className="text-brand" />
                       <span className="text-sm font-black text-gray-900">{profile?.brandible_coins?.toLocaleString() || 0} BC</span>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Balance</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                       <MapPin size={16} className="text-blue-600" />
                       <span className="text-sm font-black text-gray-900">{profile?.state || 'Location not set'}</span>
                    </div>
                 </div>
              </div>

              <button 
                onClick={() => setEditing(!editing)}
                className={`h-14 px-6 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all ${
                  editing 
                  ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' 
                  : 'bg-gray-900 text-white shadow-lg shadow-black/10 hover:bg-gray-800'
                }`}
              >
                 {editing ? <X size={20} /> : <Edit3 size={20} />}
                 {editing ? 'Cancel' : 'Edit Profile'}
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Left: Form / Details */}
           <div className="lg:col-span-2 space-y-6">
              {editing ? (
                 <div className="bg-white rounded-[2.5rem] p-10 border border-brand/20 shadow-xl shadow-brand/5 space-y-8 animate-in slide-in-from-top-4">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest">Update Profile</h3>
                    
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                          <input 
                            value={formData.full_name}
                            onChange={e => setFormData({...formData, full_name: e.target.value})}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all font-bold"
                          />
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Bio / About You</label>
                          <textarea 
                            value={formData.bio}
                            onChange={e => setFormData({...formData, bio: e.target.value})}
                            rows={4}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all text-sm leading-relaxed"
                            placeholder="Tell brands about your content style and audience..."
                          />
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Location (State)</label>
                             <input 
                               value={formData.state}
                               onChange={e => setFormData({...formData, state: e.target.value})}
                               placeholder="e.g. Lagos"
                               className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all font-bold"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Private Campaign Rate (BC)</label>
                             <div className="relative">
                                <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-brand" size={18} />
                                <input 
                                  type="number"
                                  value={formData.private_campaign_rate}
                                  onChange={e => setFormData({...formData, private_campaign_rate: e.target.value})}
                                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all font-bold"
                                  placeholder="e.g. 500"
                                />
                             </div>
                          </div>
                       </div>
                    </div>

                    <button 
                      onClick={handleSaveProfile}
                      disabled={updating}
                      className="w-full py-4 bg-brand text-white font-black rounded-2xl shadow-xl shadow-brand/20 hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                       {updating ? <Loader2 className="animate-spin" size={24} /> : <><Check size={24} /> SAVE ALL CHANGES</>}
                    </button>
                 </div>
              ) : (
                <div className="space-y-6">
                   <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-6">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Bio & Interests</h3>
                      <p className="text-gray-700 leading-relaxed italic">
                         "{profile?.bio || "No bio added yet. Tell brands about your creative journey!"}"
                      </p>
                      
                      <div className="flex flex-wrap gap-2 pt-4">
                         {profile?.interests?.length > 0 ? profile.interests.map((int: string, i: number) => (
                           <span key={i} className="px-4 py-2 bg-brand/5 border border-brand/10 text-brand text-xs font-bold rounded-xl">
                              #{int}
                           </span>
                         )) : (
                           <p className="text-xs text-gray-400 font-medium">No interests selected.</p>
                         )}
                      </div>
                   </div>

                   <div className="bg-white rounded-[2.5rem] p-4 border border-gray-100 shadow-sm">
                      <div className="p-4 border-b border-gray-50 mb-2">
                         <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Earnings & Finance</h3>
                      </div>
                      <SettingItem icon={<Wallet className="text-emerald-600" />} label="Payout Wallet" sub="Withdraw your BC earnings" href="/dashboard/wallet" router={router} />
                      <SettingItem icon={<History className="text-blue-600" />} label="My Hubs" sub="Communities you've joined" href="/dashboard/hubs" router={router} />
                      <SettingItem icon={<ShieldCheck className="text-brand" />} label="Identity Verification" sub="Account security & status" />
                   </div>
                </div>
              )}
           </div>

           {/* Right: Insights & Danger Zone */}
           <div className="space-y-8">
              <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand/20 rounded-full blur-3xl -mr-10 -mt-10" />
                 
                 <div className="relative space-y-6">
                    <div className="h-12 w-12 bg-brand rounded-2xl flex items-center justify-center">
                       <Star className="fill-white" size={24} />
                    </div>
                    <div>
                       <h3 className="text-xl font-bold">Influencer Stats</h3>
                       <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Growth Metrics</p>
                    </div>
                    <div className="space-y-4 pt-4">
                       <StatRow label="Participations" value={profile?.followers_count || 0} />
                       <StatRow label="Success Rate" value="98%" />
                       <StatRow label="Profile Views" value={profile?.following_count || 0} />
                    </div>
                 </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-4 border border-red-50 shadow-sm">
                 <div className="p-4 border-b border-gray-50 mb-2">
                    <h3 className="text-xs font-black text-red-600 uppercase tracking-[0.2em]">Account Actions</h3>
                 </div>
                 <button 
                   onClick={handleSignOut}
                   className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-2xl transition-all group"
                 >
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <LogOut size={24} />
                       </div>
                       <div className="text-left">
                          <p className="font-bold text-gray-900">Sign Out</p>
                          <p className="text-xs text-gray-400 font-medium">Exit your session</p>
                       </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-red-600" />
                 </button>
              </div>
           </div>
        </div>
      </main>
    </div>
  )
}

function SettingItem({ icon, label, sub, href, router }: any) {
  return (
    <button 
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all group"
      onClick={() => href && router.push(href)}
    >
       <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-white border border-transparent group-hover:border-gray-100">
             {icon}
          </div>
          <div className="text-left">
             <p className="font-bold text-gray-900">{label}</p>
             <p className="text-xs text-gray-400 font-medium">{sub}</p>
          </div>
       </div>
       <ChevronRight size={20} className="text-gray-300 group-hover:text-brand" />
    </button>
  )
}

function StatRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5">
       <span className="text-xs text-white/50 font-bold uppercase tracking-wider">{label}</span>
       <span className="text-sm font-black">{value}</span>
    </div>
  )
}
