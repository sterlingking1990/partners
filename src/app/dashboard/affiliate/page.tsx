'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Zap, 
  Search, 
  Filter, 
  ShoppingBag, 
  TrendingUp, 
  Coins, 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  Loader2,
  Clock,
  ChevronRight,
  ShieldCheck,
  MessageSquare
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

export default function AffiliateDealsPage() {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
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
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      setUser(authUser)

      // Fetch approved unboxed submissions where influencer_id = user.id
      const { data, error } = await supabase
        .from('unboxed_submissions')
        .select(`
          *,
          brand:brand_id (
            company_name,
            profiles (avatar_url, username)
          ),
          hubs:hub_id (name)
        `)
        .eq('influencer_id', authUser.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDeals(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = (deal: any) => {
    // Standard affiliate link format
    const link = `https://shop.brandiblebms.com/${deal.brand?.profiles?.username}/wall?ref=${user?.username}`
    navigator.clipboard.writeText(link)
    setToastMessage('Affiliate link copied to clipboard!')
    setShowToast(true)
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Zap className="text-brand fill-current" size={20} />
          <h1 className="text-lg font-semibold text-gray-800">Affiliate Deals</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <TrendingUp size={16} className="text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{deals.length} Active Deals</span>
           </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto w-full space-y-12 pb-20">
        <div className="max-w-2xl">
           <h2 className="text-4xl font-black text-gray-900 tracking-tight">Your Partner Shop</h2>
           <p className="text-gray-500 mt-2 text-lg font-medium">Manage your referral links and track commissions from brands you represent.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
             <Loader2 className="animate-spin text-brand" size={40} />
             <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Loading Partnerships...</p>
          </div>
        ) : deals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {deals.map((deal) => (
               <DealCard 
                 key={deal.id} 
                 deal={deal} 
                 onCopy={() => handleCopyLink(deal)}
                 onChat={() => router.push(`/dashboard/chats?id=${deal.id}`)}
               />
             ))}
          </div>
        ) : (
          <div className="py-40 text-center space-y-6 bg-white rounded-[3rem] border border-dashed border-gray-200">
             <div className="h-24 w-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto text-gray-300">
                <ShoppingBag size={40} />
             </div>
             <div>
                <h3 className="text-xl font-bold text-gray-900">No Affiliate Deals Yet</h3>
                <p className="text-gray-500 max-w-xs mx-auto mt-2">Apply for promotions in Community Hubs to start earning sales commissions.</p>
             </div>
             <button 
               onClick={() => router.push('/dashboard/hubs')}
               className="bg-brand text-white px-8 py-3 rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-brand/20"
             >
                Browse Hubs
             </button>
          </div>
        )}
      </main>
    </div>
  )
}

function DealCard({ deal, onCopy, onChat }: any) {
  return (
    <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand/30 transition-all flex flex-col group">
       <div className="aspect-video relative overflow-hidden bg-gray-900">
          {deal.media_type === 'video' ? (
            <video 
              src={deal.media_url} 
              poster={deal.thumbnail_url} 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
            />
          ) : (
            <img 
              src={deal.media_url} 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          <div className="absolute top-6 left-6 flex items-center gap-2">
             <div className="h-10 w-10 rounded-xl overflow-hidden border-2 border-white shadow-lg">
                <img src={deal.brand?.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${deal.brand?.company_name}`} className="h-full w-full object-cover" />
             </div>
             <div>
                <p className="text-white font-black text-sm drop-shadow-md">{deal.brand?.company_name}</p>
                <div className="flex items-center gap-1">
                   <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{deal.hubs?.name}</p>
                </div>
             </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
             <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl text-white">
                <p className="text-[10px] font-black uppercase tracking-tighter opacity-60">Commission</p>
                <p className="text-lg font-black">{deal.reward_per_sale} BC <span className="text-[10px] font-normal">/ sale</span></p>
             </div>
             <div className="bg-emerald-500 px-4 py-2 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                <p className="text-[10px] font-black uppercase tracking-tighter opacity-60">Total Earned</p>
                <p className="text-lg font-black">{deal.total_earned_by_influencer} BC</p>
             </div>
          </div>
       </div>

       <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
             <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Performance</p>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1.5">
                      <ShoppingBag size={16} className="text-brand" />
                      <span className="text-lg font-black text-gray-900">{deal.total_sales_count}</span>
                      <span className="text-xs text-gray-400 font-bold uppercase">Sales</span>
                   </div>
                   <div className="h-4 w-px bg-gray-200" />
                   <div className="flex items-center gap-1.5">
                      <Clock size={16} className="text-gray-400" />
                      <span className="text-sm font-bold text-gray-600">Active</span>
                   </div>
                </div>
             </div>
             <button 
               onClick={onChat}
               className="h-12 w-12 rounded-2xl bg-gray-50 text-gray-400 hover:text-brand hover:bg-brand/10 transition-all flex items-center justify-center border border-gray-100"
             >
                <MessageSquare size={20} />
             </button>
          </div>

          <div className="pt-6 border-t border-gray-50 flex gap-4">
             <button 
               onClick={onCopy}
               className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl"
             >
                <Copy size={16} /> Copy Referral Link
             </button>
          </div>
       </div>
    </div>
  )
}
