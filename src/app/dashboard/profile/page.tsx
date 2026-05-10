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
  Megaphone,
  Hash,
  Plus,
  Copy,
  Share2
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
  const [hub, setHub] = useState<any>(null)
  const [showPromoRequests, setShowPromoRequests] = useState(false)
  const [hubApplication, setHubApplication] = useState<any>(null)
  const [stats, setStats] = useState({ participations: 0, hubMembers: null as number | null, successRate: null as number | null, affiliateEarned: 0 })
  const [isCreatingHub, setIsCreatingHub] = useState(false)
  const [isApplyingHub, setIsApplyingHub] = useState(false)
  const [isEditingHub, setIsEditingHub] = useState(false)
  const [hubEditData, setHubEditData] = useState({ name: '', description: '', wall_posting_fee: '' })
  const [hubFormData, setHubFormData] = useState({ name: '', description: '' })
  const [applyFormData, setApplyFormData] = useState({ community_name: '', platform: 'WhatsApp', group_link: '', member_count: '', niche: '' })
  
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
      // Fetch hub data
      if (profileData) {
        const [hubRes, appRes, challengeRes, surveyRes, statusRes, unboxRes] = await Promise.all([
          supabase.from('hubs').select('id, name, description, invite_code, wall_posting_fee').eq('owner_id', user.id).maybeSingle(),
          supabase.from('hub_applications').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('challenge_submissions').select('id', { count: 'exact', head: true }).eq('participant_id', user.id),
          supabase.from('survey_responses').select('id', { count: 'exact', head: true }).eq('respondent_id', user.id),
          supabase.from('status_views').select('id', { count: 'exact', head: true }).eq('viewer_id', user.id),
          supabase.from('unboxed_submissions').select('total_earned_by_influencer').eq('influencer_id', user.id),
        ])
        setHub(hubRes.data || null)
        setHubApplication(appRes.data || null)

        const participations = (challengeRes.count || 0) + (surveyRes.count || 0) + (statusRes.count || 0)
        const affiliateEarned = (unboxRes.data || []).reduce((sum: number, s: any) => sum + (Number(s.total_earned_by_influencer) || 0), 0)

        let hubMembers: number | null = null
        let successRate: number | null = null
        if (hubRes.data?.id) {
          const [membersRes, leaderboardRes] = await Promise.all([
            supabase.from('hub_members').select('id', { count: 'exact', head: true }).eq('hub_id', hubRes.data.id),
            supabase.rpc('get_hubs_leaderboard')
          ])
          hubMembers = membersRes.count ?? null
          const myHubStats = (leaderboardRes.data || []).find((h: any) => h.id === hubRes.data?.id)
          successRate = myHubStats ? Number(myHubStats.member_success_rate) : null
        }

        setStats({ participations, hubMembers, successRate, affiliateEarned })
      }
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

  const handleCreateHub = async () => {
    if (!hubFormData.name || !hubFormData.description) {
      alert('Please fill in the hub name and description.')
      return
    }
    setUpdating(true)
    try {
      const { data, error } = await supabase.rpc('create_influencer_hub', {
        p_name: hubFormData.name,
        p_description: hubFormData.description,
        p_industry: 'General',
      })
      if (error) throw error
      if (data.success) {
        setHub({ id: data.hub_id, name: hubFormData.name, description: hubFormData.description, invite_code: data.invite_code })
        setIsCreatingHub(false)
        setToastMessage(`Hub created! Invite code: ${data.invite_code}`)
        setShowToast(true)
        if (hubFormData.description) {
          supabase.functions.invoke('generate-hub-keywords', { body: { hub_id: data.hub_id, description: hubFormData.description } }).catch(() => {})
        }
      } else {
        alert(data.message || 'Failed to create hub.')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleApplyHub = async () => {
    if (!applyFormData.community_name || !applyFormData.group_link) {
      alert('Please provide your community name and group link.')
      return
    }
    setUpdating(true)
    try {
      const { error } = await supabase.from('hub_applications').insert({
        profile_id: profile.id,
        community_name: applyFormData.community_name,
        platform: applyFormData.platform,
        group_link: applyFormData.group_link,
        member_count: parseInt(applyFormData.member_count) || 0,
        niche: applyFormData.niche,
      })
      if (error) throw error
      setIsApplyingHub(false)
      setToastMessage('Application submitted! We will review and notify you.')
      setShowToast(true)
      const { data } = await supabase.from('hub_applications').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      setHubApplication(data)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUpdating(false)
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

                   {/* My Community Hub */}
                   <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                         <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">My Community Hub</h3>
                         {profile?.can_create_hub && !hub && !isCreatingHub && !isApplyingHub && (
                           <button onClick={() => setIsCreatingHub(true)} className="h-8 w-8 bg-brand/10 text-brand rounded-xl flex items-center justify-center hover:bg-brand/20 transition-colors">
                             <Plus size={16} />
                           </button>
                         )}
                      </div>

                      {isCreatingHub ? (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-500">Create a hub to invite your followers and earn 10% from their rewards!</p>
                          <input value={hubFormData.name} onChange={e => setHubFormData({...hubFormData, name: e.target.value})} placeholder="Hub Name (e.g. Lagos Techies)" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand" />
                          <textarea value={hubFormData.description} onChange={e => setHubFormData({...hubFormData, description: e.target.value})} placeholder="What interests and values define your community?" rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand" />
                          <div className="flex gap-2">
                            <button onClick={() => setIsCreatingHub(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
                            <button onClick={handleCreateHub} disabled={updating} className="flex-[2] py-3 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
                              {updating ? <Loader2 size={14} className="animate-spin" /> : 'Create My Hub'}
                            </button>
                          </div>
                        </div>
                      ) : hub ? (
                        <div className="space-y-3">
                          {isEditingHub ? (
                            <div className="space-y-3">
                              <input value={hubEditData.name} onChange={e => setHubEditData({...hubEditData, name: e.target.value})} placeholder="Hub Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand" />
                              <textarea value={hubEditData.description} onChange={e => setHubEditData({...hubEditData, description: e.target.value})} placeholder="Description" rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand" />
                              <div className="space-y-1">
                                <input value={hubEditData.wall_posting_fee} onChange={e => setHubEditData({...hubEditData, wall_posting_fee: e.target.value})} placeholder="Wall posting fee (coins)" type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand" />
                                <p className="text-[10px] text-gray-400 px-1">You earn 80% each time a brand targets your hub on their wall post.</p>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => setIsEditingHub(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
                                <button disabled={updating} onClick={async () => {
                                  if (!hubEditData.name.trim()) { alert('Hub name is required'); return }
                                  setUpdating(true)
                                  try {
                                    const { error } = await supabase.from('hubs').update({
                                      name: hubEditData.name.trim(),
                                      description: hubEditData.description.trim(),
                                      wall_posting_fee: parseFloat(hubEditData.wall_posting_fee) || 0,
                                    }).eq('id', hub.id)
                                    if (error) throw error
                                    setHub({ ...hub, name: hubEditData.name.trim(), description: hubEditData.description.trim(), wall_posting_fee: parseFloat(hubEditData.wall_posting_fee) || 0 })
                                    setIsEditingHub(false)
                                    setToastMessage('Hub updated!'); setShowToast(true)
                                  } catch (e: any) { alert(e.message) }
                                  finally { setUpdating(false) }
                                }} className="flex-[2] py-3 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
                                  {updating ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-bold text-gray-900">{hub.name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{hub.description}</p>
                                  {hub.wall_posting_fee > 0 && (
                                    <p className="text-[10px] text-brand font-bold mt-1">{hub.wall_posting_fee} coins wall posting fee · you earn 80%</p>
                                  )}
                                </div>
                                <button onClick={() => { setHubEditData({ name: hub.name, description: hub.description || '', wall_posting_fee: String(hub.wall_posting_fee || '') }); setIsEditingHub(true) }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-brand">
                                  <Edit3 size={16} />
                                </button>
                              </div>
                              <div className="flex items-center gap-2 p-3 bg-brand/5 border border-brand/10 rounded-xl">
                                <span className="font-black text-brand text-lg tracking-widest flex-1">{hub.invite_code}</span>
                                <button onClick={() => { navigator.clipboard.writeText(hub.invite_code); setToastMessage('Code copied!'); setShowToast(true) }} className="p-2 hover:bg-brand/10 rounded-lg transition-colors">
                                  <Copy size={16} className="text-brand" />
                                </button>
                                <button onClick={() => navigator.share?.({ text: `Join my "${hub.name}" community on Brandible with code ${hub.invite_code}!` })} className="p-2 hover:bg-brand/10 rounded-lg transition-colors">
                                  <Share2 size={16} className="text-brand" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : profile?.can_create_hub ? (
                        <div className="text-center py-4 space-y-3">
                          <Users size={40} className="mx-auto text-gray-300" />
                          <p className="text-sm font-bold text-gray-600">You are verified to lead a community!</p>
                          <button onClick={() => setIsCreatingHub(true)} className="px-6 py-3 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-widest">Create Your Hub Now</button>
                        </div>
                      ) : hubApplication ? (
                        <div className={`p-4 rounded-2xl text-center space-y-1 ${hubApplication.status === 'approved' ? 'bg-emerald-50 border border-emerald-100' : hubApplication.status === 'rejected' ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'}`}>
                          <p className="font-black text-sm">{hubApplication.status === 'pending' ? '⏳ Application Pending' : hubApplication.status === 'approved' ? '✅ Application Approved!' : '❌ Application Rejected'}</p>
                          <p className="text-xs text-gray-500">We will notify you once reviewed.</p>
                        </div>
                      ) : isApplyingHub ? (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-500">Tell us about your community to get verified as a hub owner.</p>
                          <input value={applyFormData.community_name} onChange={e => setApplyFormData({...applyFormData, community_name: e.target.value})} placeholder="Community Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand" />
                          <select value={applyFormData.platform} onChange={e => setApplyFormData({...applyFormData, platform: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none">
                            <option>WhatsApp</option><option>Telegram</option><option>Facebook</option><option>Other</option>
                          </select>
                          <input value={applyFormData.group_link} onChange={e => setApplyFormData({...applyFormData, group_link: e.target.value})} placeholder="Group Link (for verification)" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand" />
                          <input value={applyFormData.member_count} onChange={e => setApplyFormData({...applyFormData, member_count: e.target.value})} placeholder="Approx. Member Count" type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand" />
                          <input value={applyFormData.niche} onChange={e => setApplyFormData({...applyFormData, niche: e.target.value})} placeholder="Community Niche (e.g. Tech, Fashion)" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand" />
                          <div className="flex gap-2">
                            <button onClick={() => setIsApplyingHub(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
                            <button onClick={handleApplyHub} disabled={updating} className="flex-[2] py-3 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
                              {updating ? <Loader2 size={14} className="animate-spin" /> : 'Submit Application'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 space-y-3">
                          <Users size={40} className="mx-auto text-gray-300" />
                          <p className="text-xs text-gray-500">Apply to become a verified hub owner and earn from your community.</p>
                          <button onClick={() => setIsApplyingHub(true)} className="px-6 py-3 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest">Apply to Create a Hub</button>
                        </div>
                      )}
                   </div>

                   <div className="bg-white rounded-[2.5rem] p-4 border border-gray-100 shadow-sm">
                      <div className="p-4 border-b border-gray-50 mb-2">
                         <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Earnings & Finance</h3>
                      </div>
                      <SettingItem icon={<Wallet className="text-emerald-600" />} label="Payout Wallet" sub="Withdraw your BC earnings" href="/dashboard/wallet" />
                      <SettingItem icon={<History className="text-blue-600" />} label="My Hubs" sub="Communities you've joined" href="/dashboard/hubs" />
                      {hub && <SettingItem icon={<Megaphone className="text-indigo-600" />} label="Promotion Requests" sub="Review brand requests for your hub" onClick={() => setShowPromoRequests(true)} />}
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
                       <StatRow label="Participations" value={stats.participations.toLocaleString()} />
                       <StatRow label="Hub Members" value={stats.hubMembers !== null ? stats.hubMembers.toLocaleString() : '\u2014'} />
                       <StatRow label="Hub Success Rate" value={stats.successRate !== null ? `${stats.successRate.toFixed(1)}%` : '\u2014'} />
                       <StatRow label="Affiliate Earned" value={`${stats.affiliateEarned.toLocaleString()} BC`} />
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
      {showPromoRequests && hub && <PromoRequestsDrawer hubId={hub.id} onClose={() => setShowPromoRequests(false)} />}
    </div>
  )
}

function PromoRequestsDrawer({ hubId, onClose }: { hubId: string; onClose: () => void }) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('promotion_requests')
        .select('*, brands:brand_id(company_name, profiles!brands_profile_id_fkey(avatar_url))')
        .eq('hub_id', hubId)
        .order('created_at', { ascending: false })
      setRequests(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    await supabase.from('promotion_requests').update({ status }).eq('id', id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setUpdating(null)
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-emerald-100 text-emerald-700',
    declined: 'bg-red-100 text-red-700',
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Megaphone size={20} className="text-brand" />
            <h2 className="text-lg font-black text-gray-900">Promotion Requests</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand" size={32} /></div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-center">
              <Megaphone size={48} className="text-gray-200 mb-4" />
              <p className="font-bold text-gray-500">No Promotion Requests Yet</p>
              <p className="text-sm text-gray-400 mt-1">Brands will send requests here when they want to promote in your hub.</p>
            </div>
          ) : requests.map((req) => (
            <div key={req.id} className="bg-gray-50 rounded-2xl overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <img src={req.brands?.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${req.brands?.company_name}&background=random`}
                    className="h-10 w-10 rounded-xl object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{req.brands?.company_name}</p>
                    <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${statusColor[req.status]}`}>{req.status}</span>
                </div>

                <div>
                  <p className="font-bold text-gray-800">{req.title}</p>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{req.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Coins size={14} className="text-emerald-600" />
                  <span className="text-sm font-black text-emerald-600">{req.reward_amount} BC reward</span>
                </div>

                {req.media_url && (
                  <a href={req.media_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-semibold text-brand bg-brand/5 px-3 py-2 rounded-xl hover:bg-brand/10 transition-colors w-fit">
                    <Star size={14} /> View Product Media
                  </a>
                )}
              </div>

              {req.status === 'pending' && (
                <div className="flex border-t border-gray-200">
                  <button onClick={() => updateStatus(req.id, 'declined')} disabled={updating === req.id}
                    className="flex-1 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors border-r border-gray-200 disabled:opacity-50">
                    Decline
                  </button>
                  <button onClick={() => updateStatus(req.id, 'accepted')} disabled={updating === req.id}
                    className="flex-1 py-3 text-sm font-bold text-white bg-brand hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {updating === req.id ? <Loader2 size={14} className="animate-spin" /> : 'Accept'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SettingItem({ icon, label, sub, href, onClick }: any) {
  const router = useRouter()
  return (
    <button 
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all group"
      onClick={() => { if (onClick) onClick(); else if (href) router.push(href) }}
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
