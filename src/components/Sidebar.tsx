'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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
  Menu,
  X
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { icon: <LayoutDashboard size={20} />, label: "Dashboard", href: "/dashboard" },
  { icon: <Megaphone size={20} />, label: "Campaigns", href: "/dashboard/campaigns" },
  { icon: <Zap size={20} />, label: "Affiliate", href: "/dashboard/affiliate" },
  { icon: <Globe size={20} />, label: "Hubs", href: "/dashboard/hubs" },
  { icon: <MessageSquare size={20} />, label: "Messages", href: "/dashboard/chats" },
  { icon: <ShoppingBag size={20} />, label: "Shop", href: "/dashboard/shop" },
  { icon: <Wallet size={20} />, label: "Wallet", href: "/dashboard/wallet" },
  { icon: <User size={20} />, label: "Profile", href: "/dashboard/profile" },
]

// Bottom nav shows only the most important 5 items
const bottomNavItems = [
  { icon: <LayoutDashboard size={22} />, label: "Home", href: "/dashboard" },
  { icon: <Megaphone size={22} />, label: "Campaigns", href: "/dashboard/campaigns" },
  { icon: <Wallet size={22} />, label: "Wallet", href: "/dashboard/wallet" },
  { icon: <MessageSquare size={22} />, label: "Messages", href: "/dashboard/chats" },
  { icon: <User size={22} />, label: "Profile", href: "/dashboard/profile" },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed h-full z-30">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-xl">
              <img src="/logo.png" alt="brandible" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">brandible</span>
          </div>
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
          <div className="pt-4 mt-4 border-t border-gray-100">
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
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Menu size={22} />
        </button>
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
          <div className="pt-3 mt-3 border-t border-gray-100">
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
