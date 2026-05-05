'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Megaphone, 
  Wallet, 
  Globe, 
  MessageSquare, 
  User, 
  Settings, 
  LogOut,
  Trophy,
  ShoppingBag,
  Zap
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", href: "/dashboard" },
    { icon: <Megaphone size={20} />, label: "Campaigns", href: "/dashboard/campaigns" },
    { icon: <Zap size={20} />, label: "Affiliate Deals", href: "/dashboard/affiliate" },
    { icon: <Globe size={20} />, label: "Community Hubs", href: "/dashboard/hubs" },
    { icon: <MessageSquare size={20} />, label: "Messages", href: "/dashboard/chats" },
    { icon: <ShoppingBag size={20} />, label: "Shop", href: "/dashboard/shop" },
    { icon: <Wallet size={20} />, label: "My Wallet", href: "/dashboard/wallet" },
    { icon: <User size={20} />, label: "Profile", href: "/dashboard/profile" },
  ]

  return (
    <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed h-full">
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
            className={`
              flex items-center gap-3 px-4 py-2.5 w-full rounded-xl transition-all
              ${pathname === item.href 
                ? 'bg-brand text-white shadow-lg shadow-brand/20 font-semibold' 
                : 'text-gray-500 hover:text-brand hover:bg-brand/5 font-medium'}
            `}
          >
            {item.icon}
            <span className="text-sm">{item.label}</span>
          </Link>
        ))}
        
        <div className="pt-4 mt-4 border-t border-gray-100">
          <Link 
            href="/dashboard/settings"
            className={`
              flex items-center gap-3 px-4 py-2.5 w-full rounded-xl transition-all
              ${pathname === "/dashboard/settings"
                ? 'bg-brand text-white shadow-lg shadow-brand/20 font-semibold' 
                : 'text-gray-500 hover:text-brand hover:bg-brand/5 font-medium'}
            `}
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
  )
}
