'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Settings, 
  Bell, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle2, 
  X,
  Smartphone,
  Mail,
  ArrowLeft,
  ChevronRight,
  LogOut,
  Zap,
  Globe,
  UserCheck
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  
  const [notifications, setNotificationPrefs] = useState({
    new_message: true,
    invite_accepted: true,
    submission_approved: true,
    new_status_post_created: true
  })

  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (data) {
        setProfile(data)
        if (data.notification_preferences) {
          setNotificationPrefs(data.notification_preferences)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleNotification = async (key: string, value: boolean) => {
    const updated = { ...notifications, [key]: value }
    setNotificationPrefs(updated)
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: updated })
        .eq('id', profile.id)
      
      if (error) throw error
      setToastMessage('Preferences saved!')
      setShowToast(true)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleSignOut = async () => {
    if (confirm('Sign out of your account?')) {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
         <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Settings className="text-brand" size={20} />
          <h1 className="text-lg font-semibold text-gray-800">Account Settings</h1>
        </div>
      </header>

      <main className="p-8 max-w-4xl mx-auto w-full space-y-8 pb-20">
        <div className="max-w-2xl">
           <h2 className="text-3xl font-black text-gray-900 tracking-tight">Preferences</h2>
           <p className="text-gray-500 font-medium">Manage how you receive alerts and secure your account.</p>
        </div>

        {/* Notifications Section */}
        <section className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-8">
           <div className="flex items-center gap-3 border-b border-gray-50 pb-6">
              <div className="h-10 w-10 bg-brand/10 text-brand rounded-xl flex items-center justify-center">
                 <Bell size={20} />
              </div>
              <div>
                 <h3 className="text-lg font-bold text-gray-900">Push Notifications</h3>
                 <p className="text-xs text-gray-400 font-medium">Control which alerts are sent to your connected devices.</p>
              </div>
           </div>

           <div className="space-y-4">
              <ToggleItem 
                label="Direct Messages" 
                desc="Receive alerts when brands or hub owners message you."
                enabled={notifications.new_message}
                onToggle={(val) => handleToggleNotification('new_message', val)}
              />
              <ToggleItem 
                label="Hub Invitations" 
                desc="Get notified when you are invited to join a specialized community."
                enabled={notifications.invite_accepted}
                onToggle={(val) => handleToggleNotification('invite_accepted', val)}
              />
              <ToggleItem 
                label="Submission Status" 
                desc="Updates on your challenge approvals and unboxing requests."
                enabled={notifications.submission_approved}
                onToggle={(val) => handleToggleNotification('submission_approved', val)}
              />
              <ToggleItem 
                label="New Campaigns" 
                desc="Be the first to know when brands launch new opportunities."
                enabled={notifications.new_status_post_created}
                onToggle={(val) => handleToggleNotification('new_status_post_created', val)}
              />
           </div>
        </section>

        {/* Security Section */}
        <section className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-8">
           <div className="flex items-center gap-3 border-b border-gray-50 pb-6">
              <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                 <ShieldCheck size={20} />
              </div>
              <div>
                 <h3 className="text-lg font-bold text-gray-900">Account Security</h3>
                 <p className="text-xs text-gray-400 font-medium">Manage your password and authentication methods.</p>
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all group cursor-pointer border border-transparent hover:border-gray-100">
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-blue-600">
                       <Lock size={18} />
                    </div>
                    <div>
                       <p className="text-sm font-bold text-gray-900">Change Password</p>
                       <p className="text-[10px] text-gray-400 font-black uppercase">Last updated 2 months ago</p>
                    </div>
                 </div>
                 <ChevronRight size={18} className="text-gray-300" />
              </div>

              <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all group border border-transparent hover:border-gray-100">
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-blue-600">
                       <Smartphone size={18} />
                    </div>
                    <div>
                       <p className="text-sm font-bold text-gray-900">Two-Factor Authentication</p>
                       <p className="text-[10px] text-red-400 font-black uppercase">Not Enabled</p>
                    </div>
                 </div>
                 <button className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Enable</button>
              </div>
           </div>
        </section>

        {/* Support Section */}
        <section className="bg-white rounded-[2.5rem] p-4 border border-gray-100 shadow-sm">
           <button 
             onClick={handleSignOut}
             className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-2xl transition-all group"
           >
              <div className="flex items-center gap-4">
                 <div className="h-10 w-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <LogOut size={20} />
                 </div>
                 <div className="text-left">
                    <p className="font-bold text-gray-900">Sign Out</p>
                    <p className="text-xs text-gray-400 font-medium">Log out of this account</p>
                 </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:text-red-600" />
           </button>
        </section>
      </main>
    </div>
  )
}

function ToggleItem({ label, desc, enabled, onToggle }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl border border-transparent">
       <div className="max-w-md">
          <p className="text-sm font-bold text-gray-900">{label}</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
       </div>
       <button 
         onClick={() => onToggle(!enabled)}
         className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-brand' : 'bg-gray-200'}`}
       >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
       </button>
    </div>
  )
}
