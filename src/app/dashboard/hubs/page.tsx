'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Users, 
  Search, 
  Filter, 
  Globe, 
  ChevronRight, 
  Loader2,
  TrendingUp,
  Tag,
  ShieldCheck,
  Megaphone,
  BarChart3,
  MapPin,
  PlayCircle,
  X,
  Send,
  ClipboardList,
  Gamepad2,
  Trophy,
  ArrowRight,
  UserCheck,
  LogOut,
  Plus
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'
import MediaCarouselModal from '@/components/MediaCarouselModal'

export default function HubsPage() {
  const [hubs, setHubs] = useState<any[]>([])
  const [unboxedByHub, setUnboxedByHub] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('All')
  const [user, setUser] = useState<any>(null)
  
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Preview Modal State
  const [showPreview, setShowPreview] = useState(false)
  const [previewMedia, setPreviewMedia] = useState<any[]>([])

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

      const { data, error } = await supabase.rpc('get_hubs_leaderboard')
      if (error) throw error
      setHubs(data || [])

      if (data && data.length > 0) {
        fetchUnboxedSubmissions(data.map((h: any) => h.id))
      }
    } catch (err) {
      console.error('Error fetching hubs:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnboxedSubmissions = async (hubIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('unboxed_submissions')
        .select(`
          *,
          profiles:influencer_id (full_name, username, avatar_url),
          brands:brand_id (profile_id, company_name)
        `)
        .in('hub_id', hubIds)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (error) throw error

      const grouped: Record<string, any[]> = {}
      data?.forEach(item => {
        if (!grouped[item.hub_id]) grouped[item.hub_id] = []
        grouped[item.hub_id].push(item)
      })
      setUnboxedByHub(grouped)
    } catch (error) {
      console.error('Error fetching unboxed for hubs:', error)
    }
  }

  const handleOpenPreview = (item: any) => {
    setPreviewMedia([{
      ...item,
      brand_name: item.brands?.company_name
    }])
    setShowPreview(true)
  }

  const handleJoinHub = async (hub: any) => {
    if (!user) return
    setProcessingId(hub.id)
    try {
      if (hub.state === 'private') {
        const { error } = await supabase
          .from('hub_applications')
          .insert({ hub_id: hub.id, profile_id: user.id, status: 'pending' })
        if (error) throw error
        setToastMessage('Application sent to hub owner!')
      } else {
        const { error } = await supabase
          .from('hub_members')
          .insert({ hub_id: hub.id, profile_id: user.id })
        if (error) throw error
        setToastMessage(`Welcome to ${hub.name}!`)
      }
      setShowToast(true)
      fetchData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleLeaveHub = async (hubId: string) => {
    if (!user || !confirm('Are you sure you want to leave this community?')) return
    setProcessingId(hubId)
    try {
      const { error } = await supabase
        .from('hub_members')
        .delete()
        .eq('hub_id', hubId)
        .eq('profile_id', user.id)
      
      if (error) throw error
      setToastMessage('You have left the hub.')
      setShowToast(true)
      fetchData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const industries = ['All', ...Array.from(new Set(hubs.map(h => h.category || h.industry).filter(Boolean)))]

  const filteredHubs = hubs.filter(hub => {
    const matchesSearch = hub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hub.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hub.owner_username?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesIndustry = selectedIndustry === 'All' || (hub.category || hub.industry) === selectedIndustry
    return matchesSearch && matchesIndustry
  })

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
      
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Globe className="text-brand" size={24} />
          <h1 className="text-lg font-semibold text-gray-800">Community Hubs</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-brand/5 px-3 py-1.5 rounded-full border border-brand/10">
              <Users size={16} className="text-brand" />
              <span className="text-xs font-bold text-brand">{hubs.filter(h => h.is_joined).length} Joined</span>
           </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto w-full space-y-8 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Hub Directory</h2>
            <p className="text-gray-500 mt-1 text-sm font-medium">Join specialized communities to unlock exclusive brand deals and rewards.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-[2rem] p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Search by name, owner or description..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
             {industries.map(industry => (
               <button
                 key={industry}
                 onClick={() => setSelectedIndustry(industry)}
                 className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                   selectedIndustry === industry 
                   ? 'bg-brand text-white shadow-lg shadow-brand/20' 
                   : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'
                 }`}
               >
                 {industry}
               </button>
             ))}
          </div>
        </div>

        {/* Hub Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
             <Loader2 className="animate-spin text-brand" size={40} />
             <p className="text-gray-500 font-medium animate-pulse uppercase tracking-widest text-[10px]">Scanning Communities...</p>
          </div>
        ) : filteredHubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {filteredHubs.map(hub => (
               <HubCard 
                key={hub.id} 
                hub={hub} 
                unboxedItems={unboxedByHub[hub.id] || []}
                isProcessing={processingId === hub.id}
                onJoin={() => handleJoinHub(hub)}
                onLeave={() => handleLeaveHub(hub.id)}
                onPreview={handleOpenPreview}
               />
             ))}
          </div>
        ) : (
          <div className="py-32 text-center space-y-4">
             <div className="h-20 w-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto text-gray-400">
                <Search size={32} />
             </div>
             <h3 className="text-xl font-bold text-gray-900">No hubs found</h3>
             <p className="text-gray-500 max-w-xs mx-auto">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </main>

      {/* Media Preview Modal */}
      <MediaCarouselModal 
        isVisible={showPreview}
        onClose={() => setShowPreview(false)}
        mediaItems={previewMedia}
        initialIndex={0}
      />
    </div>
  )
}

function HubCard({ hub, onJoin, onLeave, isProcessing, unboxedItems, onPreview }: { hub: any, onJoin: () => void, onLeave: () => void, isProcessing: boolean, unboxedItems: any[], onPreview: (item: any) => void }) {
  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand/30 transition-all group flex flex-col h-full relative overflow-hidden">
       <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand/10 transition-colors" />
       
       <div className="flex items-start justify-between mb-6 relative z-10">
          <div className="flex gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gray-50 text-brand flex items-center justify-center font-black text-xl border border-gray-100 group-hover:scale-110 transition-transform">
              {hub.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-brand transition-colors">
                {hub.name}
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">@{hub.owner_username}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
            hub.state === 'public' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
          }`}>
            {hub.state}
          </span>
       </div>

       <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-6 relative z-10">
         {hub.description || "A vibrant community of creative influencers collaborating and growing together."}
       </p>

       {/* Hub Metrics */}
       <div className="grid grid-cols-2 gap-4 bg-gray-50/50 rounded-2xl p-4 mb-8 border border-gray-100/50 relative z-10">
          <div>
            <p className="text-lg font-black text-gray-900">{hub.member_count?.toLocaleString()}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Members</p>
          </div>
          <div className="border-l border-gray-200 pl-4">
            <p className="text-lg font-black text-brand">{hub.total_earned?.toLocaleString()}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">BC Earned</p>
          </div>
       </div>

       {/* Hub Store Carousel */}
       {unboxedItems && unboxedItems.length > 0 && (
         <div className="mb-8 relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hub Store</h4>
              <span className="text-[10px] font-bold text-brand hover:underline cursor-pointer">See All</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
               {unboxedItems.map((item) => (
                 <div 
                   key={item.id} 
                   onClick={() => onPreview(item)}
                   className="min-w-[100px] h-24 rounded-xl bg-gray-100 relative overflow-hidden group/item cursor-pointer border border-gray-200"
                 >
                    {item.media_type === 'video' ? (
                      <video src={item.media_url} poster={item.thumbnail_url} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" />
                    ) : (
                      <img src={item.media_url} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" />
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover/item:bg-black/40 transition-colors flex items-center justify-center">
                       {item.media_type === 'video' ? <PlayCircle size={16} className="text-white opacity-80" /> : <Tag size={16} className="text-white opacity-80" />}
                    </div>
                    <div className="absolute bottom-1 left-2 right-2">
                       <p className="text-[7px] font-black text-white truncate uppercase tracking-widest">{item.brands?.company_name}</p>
                    </div>
                 </div>
               ))}
            </div>
         </div>
       )}

       <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between relative z-10">
          {hub.is_joined ? (
             <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <UserCheck size={14} /> Joined
             </div>
          ) : (
             <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <Tag size={12} /> {hub.category || hub.industry || 'General'}
             </div>
          )}
          
          <button 
            onClick={hub.is_joined ? onLeave : onJoin}
            disabled={isProcessing}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
              hub.is_joined 
              ? 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600' 
              : 'bg-brand text-white hover:bg-brand/90 shadow-brand/20'
            }`}
          >
             {isProcessing ? <Loader2 className="animate-spin" size={14} /> : (
               hub.is_joined ? <><LogOut size={14} /> LEAVE</> : <><Plus size={14} /> JOIN HUB</>
             )}
          </button>
       </div>
    </div>
  )
}
