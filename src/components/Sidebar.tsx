'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Megaphone,
  Wallet,
  Globe,
  MessageSquare,
  User,
  Settings,
  LogOut,
  ShoppingBag,
  Zap,
  Store,
  Menu,
  X,
  Bell,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { icon: <LayoutDashboard size={20} />, label: "Dashboard",  href: "/dashboard" },
  { icon: <Megaphone size={20} />,       label: "Campaigns",  href: "/dashboard/campaigns" },
  { icon: <Store size={20} />,           label: "Activations",href: "/dashboard/activations" },
  { icon: <Zap size={20} />,             label: "Affiliate",  href: "/dashboard/affiliate" },
  { icon: <Globe size={20} />,           label: "Hubs",       href: "/dashboard/hubs" },
  { icon: <MessageSquare size={20} />,   label: "Messages",   href: "/dashboard/chats" },
  { icon: <ShoppingBag size={20} />,     label: "Shop",       href: "/dashboard/shop" },
  { icon: <Wallet size={20} />,          label: "Wallet",     href: "/dashboard/wallet" },
  { icon: <User size={20} />,            label: "Profile",    href: "/dashboard/profile" },
]

const bottomNavItems = [
  { icon: <LayoutDashboard size={22} />, label: "Home",      href: "/dashboard" },
  { icon: <Megaphone size={22} />,       label: "Campaigns", href: "/dashboard/campaigns" },
  { icon: <Wallet size={22} />,          label: "Wallet",    href: "/dashboard/wallet" },
  { icon: <MessageSquare size={22} />,   label: "Messages",  href: "/dashboard/chats" },
  { icon: <User size={22} />,            label: "Profile",   href: "/dashboard/profile" },
]

function NotificationBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [unreadCount,   setUnreadCount]   = useState(0)

  // ── Fetch unread count + subscribe to new notifications ──
  useEffect(() => {
    let mounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!mounted || !user) return

      // Initial unread count
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (!mounted) return
      setUnreadCount(count ?? 0)

      // Unique channel name per mount — prevents StrictMode double-subscribe error
      channel = supabase
        .channel(`sidebar_notifs_${user.id}_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (!mounted) return
            setUnreadCount((prev) => prev + 1)
            // Browser notification when tab is in foreground (Tier 1)
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(payload.new.title as string, {
                body: payload.new.message as string,
                icon: '/logo.png',
                tag:  payload.new.type as string,
              })
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => {
            if (!mounted) return
            supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('is_read', false)
              .then(({ count: c }) => { if (mounted) setUnreadCount(c ?? 0) })
          }
        )
        .subscribe()
    }

    init()
    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed h-full z-30">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-xl">
              <img src="/logo.png" alt="brandible" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">brandible</span>
          </div>
          {/* Notification bell — desktop */}
          <Link href="/dashboard/notifications" className="relative p-2 rounded-xl text-gray-400 hover:text-brand hover:bg-brand/5 transition-all">
            <Bell size={20} />
            <NotificationBadge count={unreadCount} />
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 w-full rounded-xl transition-all
                ${pathname === item.href
                  ? 'bg-brand text-white shadow-lg shadow-brand/20 font-semibold'
                  : 'text-gray-500 hover:text-brand hover:bg-brand/5 font-medium'}`}
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
          <div className="pt-4 mt-4 border-t border-gray-100 space-y-1">
            {/* Notifications nav item */}
            <Link
              href="/dashboard/notifications"
              className={`flex items-center gap-3 px-4 py-2.5 w-full rounded-xl transition-all
                ${pathname === '/dashboard/notifications'
                  ? 'bg-brand text-white shadow-lg shadow-brand/20 font-semibold'
                  : 'text-gray-500 hover:text-brand hover:bg-brand/5 font-medium'}`}
            >
              <div className="relative">
                <Bell size={20} />
                {unreadCount > 0 && pathname !== '/dashboard/notifications' && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </div>
              <span className="text-sm flex-1">Notifications</span>
              {unreadCount > 0 && pathname !== '/dashboard/notifications' && (
                <span className="h-5 min-w-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/dashboard/settings"
              className={`flex items-center gap-3 px-4 py-2.5 w-full rounded-xl transition-all
                ${pathname === '/dashboard/settings'
                  ? 'bg-brand text-white shadow-lg shadow-brand/20 font-semibold'
                  : 'text-gray-500 hover:text-brand hover:bg-brand/5 font-medium'}`}
            >
              <Settings size={20} />
              <span className="text-sm">Settings</span>
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-2 w-full text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Header ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-lg">
            <img src="/logo.png" alt="brandible" className="h-full w-full object-contain" />
          </div>
          <span className="text-base font-bold text-gray-900">brandible</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Notification bell — mobile header */}
          <Link href="/dashboard/notifications" className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <Bell size={20} />
            <NotificationBadge count={unreadCount} />
          </Link>
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer Overlay ── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div className={`md:hidden fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <span className="font-bold text-gray-900">Menu</span>
          <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all
                ${pathname === item.href
                  ? 'bg-brand text-white font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 font-medium'}`}
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
          <div className="pt-3 mt-3 border-t border-gray-100 space-y-1">
            <Link
              href="/dashboard/notifications"
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all
                ${pathname === '/dashboard/notifications'
                  ? 'bg-brand text-white font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 font-medium'}`}
            >
              <div className="relative">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </div>
              <span className="text-sm flex-1">Notifications</span>
              {unreadCount > 0 && (
                <span className="h-5 min-w-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/dashboard/settings"
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all
                ${pathname === '/dashboard/settings'
                  ? 'bg-brand text-white font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 font-medium'}`}
            >
              <Settings size={20} />
              <span className="text-sm">Settings</span>
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex items-center justify-around px-2 h-16 safe-area-pb">
        {bottomNavItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${active ? 'text-brand' : 'text-gray-400'}`}
            >
              {item.icon}
              <span className={`text-[10px] font-bold ${active ? 'text-brand' : 'text-gray-400'}`}>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
