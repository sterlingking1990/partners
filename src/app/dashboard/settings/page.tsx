'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Settings,
  Bell,
  ShieldCheck,
  Lock,
  Loader2,
  CheckCircle2,
  X,
  Smartphone,
  ChevronRight,
  LogOut,
  Globe,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

interface NotificationPreferences {
  new_message: boolean
  invite_accepted: boolean
  submission_approved: boolean
  new_status_post_created: boolean
}

interface Profile {
  id: string
  notification_preferences?: NotificationPreferences
  // Add other profile fields as needed
}

interface ToggleItemProps {
  label: string
  desc: string
  enabled: boolean
  onToggle: (val: boolean) => void
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  
  const [notifications, setNotificationPrefs] = useState<NotificationPreferences>({
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

  const handleToggleNotification = async (key: keyof NotificationPreferences, value: boolean) => {
    const updated = { ...notifications, [key]: value }
    setNotificationPrefs(updated)
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: updated })
        .eq('id', profile!.id)
      
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

        {/* Browser Notifications Section */}
        <section className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-8">
           <div className="flex items-center gap-3 border-b border-gray-50 pb-6">
              <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                 <Globe size={20} />
              </div>
              <div>
                 <h3 className="text-lg font-bold text-gray-900">Browser Notifications</h3>
                 <p className="text-xs text-gray-400 font-medium">Get alerts in this browser, even when the tab is in the background.</p>
              </div>
           </div>
           <BrowserNotificationToggle supabase={supabase} />
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

function ToggleItem({ label, desc, enabled, onToggle }: ToggleItemProps) {
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

function BrowserNotificationToggle({ supabase }: { supabase: ReturnType<typeof import('@/utils/supabase/client').createClient> }) {
  const [permission,   setPermission]   = useState<NotificationPermission | 'unsupported'>('default')
  const [subscribing,  setSubscribing]  = useState(false)
  const [subscribed,   setSubscribed]   = useState(false)

  useEffect(() => {
    if (typeof Notification === 'undefined') { setPermission('unsupported'); return }
    setPermission(Notification.permission)
    checkExistingSubscription()
  }, [])

  const checkExistingSubscription = async () => {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready.catch(() => null)
    if (!reg) return
    const sub = await reg.pushManager.getSubscription().catch(() => null)
    setSubscribed(!!sub)
  }

  const handleEnable = async () => {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return
    setSubscribing(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        // Tier 1 only: permission granted, Realtime will show foreground notifications
        return
      }

      // Tier 2: register push subscription
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await supabase.from('web_push_subscriptions').upsert(
        { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        { onConflict: 'endpoint' }
      )
      setSubscribed(true)
    } catch (err) {
      console.error('Push subscription error:', err)
    } finally {
      setSubscribing(false)
    }
  }

  const handleDisable = async () => {
    if (!('serviceWorker' in navigator)) return
    setSubscribing(true)
    try {
      const reg = await navigator.serviceWorker.ready.catch(() => null)
      const sub = await reg?.pushManager.getSubscription().catch(() => null)
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        await supabase.from('web_push_subscriptions').delete().eq('endpoint', endpoint)
      }
      setSubscribed(false)
    } finally {
      setSubscribing(false)
    }
  }

  if (permission === 'unsupported') {
    return (
      <p className="text-sm text-gray-400 font-medium">
        Browser notifications are not supported in this browser.
      </p>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl">
        <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
          <X size={16} className="text-red-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-red-700">Notifications Blocked</p>
          <p className="text-xs text-red-500 mt-0.5 leading-relaxed">
            You have blocked notifications for this site. To re-enable, open your browser's site settings and allow notifications for this domain.
          </p>
        </div>
      </div>
    )
  }

  if (permission === 'granted' && subscribed) {
    return (
      <div className="flex items-center justify-between p-4 rounded-2xl border border-green-100 bg-green-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
            <CheckCircle2 size={16} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-green-800">Browser notifications enabled</p>
            <p className="text-xs text-green-600 mt-0.5">You'll receive alerts even when this tab is in the background.</p>
          </div>
        </div>
        <button
          onClick={handleDisable}
          disabled={subscribing}
          className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
        >
          Disable
        </button>
      </div>
    )
  }

  if (permission === 'granted' && !subscribed) {
    return (
      <div className="flex items-center justify-between p-4 rounded-2xl border border-brand/20 bg-brand/5">
        <div>
          <p className="text-sm font-bold text-gray-900">Permission granted</p>
          <p className="text-xs text-gray-500 mt-0.5">You'll see foreground alerts. Enable push to get background notifications too.</p>
        </div>
        <button
          onClick={handleEnable}
          disabled={subscribing}
          className="px-4 py-1.5 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand/90 transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          {subscribing && <Loader2 size={12} className="animate-spin" />}
          Enable Push
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100">
      <div>
        <p className="text-sm font-bold text-gray-900">Enable browser notifications</p>
        <p className="text-xs text-gray-500 mt-0.5">Get alerted for messages, approvals, and new campaigns.</p>
      </div>
      <button
        onClick={handleEnable}
        disabled={subscribing}
        className="px-4 py-1.5 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand/90 transition-all disabled:opacity-50 flex items-center gap-1.5"
      >
        {subscribing && <Loader2 size={12} className="animate-spin" />}
        Enable
      </button>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
