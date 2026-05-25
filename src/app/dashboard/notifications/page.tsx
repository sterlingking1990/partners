'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Bell,
  CheckCheck,
  Loader2,
  MessageSquare,
  Megaphone,
  Wallet,
  Trophy,
  Info,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AppNotification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  payload: Record<string, unknown> | null
}

const typeIcon = (type: string) => {
  if (type === 'new_message')        return <MessageSquare size={18} className="text-blue-500" />
  if (type === 'submission_approved') return <Trophy size={18} className="text-green-500" />
  if (type.startsWith('cashout'))     return <Wallet size={18} className="text-brand" />
  if (type === 'invite_accepted')     return <CheckCheck size={18} className="text-purple-500" />
  if (type.includes('campaign') || type.includes('status') || type.includes('game'))
    return <Megaphone size={18} className="text-orange-500" />
  return <Info size={18} className="text-gray-400" />
}

const routeFor = (n: AppNotification) => {
  const p = n.payload || {}
  if (n.type === 'new_message' && p.chat_id)           return '/dashboard/chats'
  if (n.type === 'submission_approved')                 return '/dashboard/wallet'
  if (n.type.startsWith('cashout'))                     return '/dashboard/wallet'
  if (n.type.includes('campaign') || n.type.includes('status') || n.type.includes('game'))
    return '/dashboard/campaigns'
  return null
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    setNotifications(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setMarkingAll(false)
  }

  const handleClick = async (n: AppNotification) => {
    if (!n.is_read) await markRead(n.id)
    const route = routeFor(n)
    if (route) router.push(route)
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-brand" size={36} />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 md:px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Bell className="text-brand" size={20} />
          <h1 className="text-lg font-semibold text-gray-800">Notifications</h1>
          {unreadCount > 0 && (
            <span className="h-5 min-w-5 px-1.5 bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand/80 transition-colors disabled:opacity-50"
          >
            {markingAll ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
            Mark all read
          </button>
        )}
      </header>

      <main className="p-4 md:p-8 max-w-2xl mx-auto w-full space-y-3 pb-24 md:pb-10">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-16 w-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Bell size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-400 font-medium text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border transition-all hover:shadow-sm
                ${n.is_read
                  ? 'bg-white border-gray-100'
                  : 'bg-brand/5 border-brand/20 shadow-sm'}`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0
                ${n.is_read ? 'bg-gray-100' : 'bg-white shadow-sm'}`}>
                {typeIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-bold truncate ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                    {n.title}
                  </p>
                  <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap flex-shrink-0">
                    {timeAgo(n.created_at)}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 leading-relaxed line-clamp-2 ${n.is_read ? 'text-gray-400' : 'text-gray-600'}`}>
                  {n.message}
                </p>
              </div>
              {!n.is_read && (
                <div className="h-2 w-2 rounded-full bg-brand flex-shrink-0 mt-2" />
              )}
            </button>
          ))
        )}
      </main>
    </div>
  )
}
