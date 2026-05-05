'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Megaphone, 
  Search, 
  Filter, 
  Video, 
  ClipboardList, 
  Zap, 
  Coins, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Loader2,
  Users,
  ShieldCheck,
  PlayCircle,
  X,
  ArrowRight,
  Share2,
  Ticket,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

export default function CampaignCenterPage() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState<any>(null)
  const [rewardedMediaIds, setRewardedMediaIds] = useState<Set<string>>(new Set())
  const [sharingCampaignId, setSharingCampaignId] = useState<string | null>(null)
  
  // Status Viewer State
  const [showStatusViewer, setShowStatusViewer] = useState(false)
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0)

  // Redemption State
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemMessage, setRedeemMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

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

      const { data: rawCampaigns, error } = await supabase.rpc('get_visible_status_posts', {
        p_user_id: authUser.id
      })

      if (error) throw error

      const enriched = await Promise.all(
        (rawCampaigns || []).map(async (camp: any) => {
          const [brandRes, mediaRes, surveyRes, challengeRes] = await Promise.all([
            supabase
              .from('brands')
              .select('company_name, verification_status, profiles(id, avatar_url, username)')
              .eq('profile_id', camp.brand_id)
              .single(),
            supabase
              .from('status_media')
              .select('*')
              .eq('status_post_id', camp.id)
              .order('order_index', { ascending: true }),
            supabase
              .from('surveys')
              .select('id')
              .eq('status_post_id', camp.id)
              .maybeSingle(),
            supabase
              .from('challenges')
              .select('id')
              .eq('status_post_id', camp.id)
              .maybeSingle()
          ])
          
          let mediaItems = mediaRes.data || []
          
          if (mediaItems.length === 0 && camp.media_url) {
            mediaItems = [{
              id: camp.id,
              status_post_id: camp.id,
              media_url: camp.media_url,
              media_type: camp.media_type || 'image',
              reward_per_view: camp.reward_amount,
              order_index: 0
            }]
          }
          
          return {
            ...camp,
            media_items: mediaItems,
            survey_id: surveyRes.data?.id,
            challenge_id: challengeRes.data?.id,
            brand: {
              id: (brandRes.data?.profiles as any)?.id,
              name: brandRes.data?.company_name || (brandRes.data?.profiles as any)?.username || 'Brand',
              avatar: (brandRes.data?.profiles as any)?.avatar_url,
              verified: brandRes.data?.verification_status === 'verified'
            }
          }
        })
      )

      setCampaigns(enriched)
      await fetchRewardedMedia()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRewardedMedia = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data, error } = await supabase
        .from('status_views')
        .select('media_id')
        .eq('viewer_id', authUser.id)
        .eq('reward_given', true)
        .not('media_id', 'is', null)

      if (error) throw error
      setRewardedMediaIds(new Set((data || []).map((view: any) => view.media_id)))
    } catch (err) {
      console.error('Error fetching rewarded media:', err)
    }
  }

  const handleShare = async (campaign: any) => {
    if (!user) {
      alert('Please sign in to share and earn rewards.')
      return
    }

    const mediaId = campaign?.media_items?.[0]?.id
    if (!mediaId) {
      alert('Unable to generate a share link for this campaign.')
      return
    }

    setSharingCampaignId(campaign.id)

    try {
      const { data: generatedLink, error: generateError } = await supabase.rpc('generate_status_share_link', {
        p_media_id: mediaId,
        p_referrer_id: user.id,
      })

      if (generateError || !generatedLink) {
        throw generateError || new Error('Failed to generate share link')
      }

      // Extract redeem code from link if present
      const url = new URL(generatedLink)
      const code = url.searchParams.get('redeem_code')

      const shareText = `🔥 Check this out on Brandible! Use my code [${code}] in your Influencer App to earn ${Math.round((campaign.reward_amount || 0) * 0.9)} BC instantly. Link: ${generatedLink}`

      if (navigator.share) {
        await navigator.share({
          title: campaign.title,
          text: shareText,
          url: generatedLink,
        })
      } else {
        await navigator.clipboard.writeText(shareText)
        setToastMessage('Link & Code copied to clipboard!')
        setShowToast(true)
      }

      await supabase.rpc('log_activity', {
        p_action_type: 'content_shared',
        p_resource_type: 'status_media',
        p_resource_id: mediaId,
        p_metadata: {
          status_post_id: campaign.id,
          brand_id: campaign.brand.id,
          share_link: generatedLink,
          redeem_code: code,
          campaign_type: campaign.type,
        },
        p_user_id: user.id,
      })

      if (campaign.type === 'status_view') {
        await supabase.rpc('increment_status_participation', {
          p_status_id: campaign.id,
        })
      }
    } catch (err) {
      console.error('Share error:', err)
      alert('Could not share content at this time.')
    } finally {
      setSharingCampaignId(null)
    }
  }

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!redeemCode || redeemCode.length !== 6) return

    setRedeeming(true)
    setRedeemMessage(null)

    try {
      const { data, error } = await supabase.rpc('redeem_share_code', {
        p_redeem_code: redeemCode.toUpperCase(),
        p_redeemer_id: user.id
      })

      if (error) throw error

      if (data.success) {
        setRedeemMessage({ 
          text: `Success! You earned ${data.redeemer_reward_amount} BC.`, 
          type: 'success' 
        })
        setRedeemCode('')
        fetchData() // Refresh to show updated rewards/participation
      } else {
        setRedeemMessage({ text: data.message, type: 'error' })
      }
    } catch (err: any) {
      setRedeemMessage({ text: err.message || 'Redemption failed', type: 'error' })
    } finally {
      setRedeeming(false)
    }
  }

  const filteredCampaigns = campaigns.filter(c => {
    const matchesTab = filter === 'all' || c.type === filter
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         c.brand.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  const isStatusCompleted = (campaign: any) => {
    if (campaign.type !== 'status_view') return false
    return campaign.media_items?.every((media: any) => rewardedMediaIds.has(media.id))
  }

  const handleOpenStatus = async (campaign: any) => {
    if (!campaign.media_items || campaign.media_items.length === 0) {
      alert('This story has no media content.')
      return
    }

    const indexInFiltered = filteredCampaigns.findIndex(c => c.id === campaign.id)
    setCurrentStatusIndex(indexInFiltered)
    setShowStatusViewer(true)
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Megaphone className="text-brand" size={20} />
          <h1 className="text-lg font-semibold text-gray-800">Campaign Center</h1>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setShowRedeemModal(true)}
             className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all"
           >
              <Ticket size={16} /> Redeem Code
           </button>
           <div className="w-px h-6 bg-gray-200 mx-2" />
           <div className="flex items-center gap-2 bg-brand/5 px-3 py-1.5 rounded-full border border-brand/10">
              <span className="text-[10px] font-black text-brand uppercase tracking-widest">{campaigns.length} Opportunities</span>
           </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Active Opportunities</h2>
              <p className="text-gray-500 font-medium">Browse and participate in campaigns tailored for your audience.</p>
           </div>
           
           <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-fit">
              {[
                { id: 'all', label: 'All Tasks', icon: <Megaphone size={14} /> },
                { id: 'status_view', label: 'Stories', icon: <Zap size={14} /> },
                { id: 'challenge', label: 'Challenges', icon: <Video size={14} /> },
                { id: 'survey', label: 'Surveys', icon: <ClipboardList size={14} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    filter === tab.id ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
           </div>
        </div>

        {/* Search & Stats */}
        <div className="relative group">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand transition-colors" size={20} />
           <input 
             type="text"
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             placeholder="Search by brand or campaign title..."
             className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm focus:ring-2 focus:ring-brand outline-none transition-all"
           />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
             <Loader2 className="animate-spin text-brand" size={40} />
             <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">Syncing Marketplace...</p>
          </div>
        ) : filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {filteredCampaigns.map((camp) => (
               <CampaignCard
                 key={camp.id}
                 campaign={camp}
                 completed={isStatusCompleted(camp)}
                 isSharing={sharingCampaignId === camp.id}
                 onClick={() => {
                   if (camp.type === 'status_view') handleOpenStatus(camp)
                   else router.push(`/dashboard/campaigns/${camp.id}`)
                 }}
                 onShare={handleShare}
               />
             ))}
          </div>
        ) : (
          <div className="py-40 text-center space-y-6 bg-white rounded-[3rem] border border-dashed border-gray-200">
             <div className="h-24 w-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto text-gray-300">
                <Megaphone size={40} />
             </div>
             <div>
                <h3 className="text-xl font-bold text-gray-900">No campaigns found</h3>
                <p className="text-gray-500 max-w-xs mx-auto mt-2">Try adjusting your filters or check back later for new brand opportunities.</p>
             </div>
          </div>
        )}
      </main>

      {/* Redemption Modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-32 bg-emerald-500/10" />
              <div className="p-8 pt-12 relative">
                 <div className="flex justify-between items-start mb-6">
                    <div className="h-14 w-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                       <Ticket size={28} />
                    </div>
                    <button onClick={() => { setShowRedeemModal(false); setRedeemMessage(null); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                       <X size={24} className="text-gray-400" />
                    </button>
                 </div>
                 
                 <div className="space-y-2 mb-8">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Redeem Code</h3>
                    <p className="text-gray-500 font-medium">Enter the 6-digit code from a shared link to claim your coins.</p>
                 </div>

                 <form onSubmit={handleRedeemCode} className="space-y-6">
                    <div className="relative">
                       <input 
                         type="text"
                         value={redeemCode}
                         onChange={e => setRedeemCode(e.target.value.toUpperCase().slice(0, 6))}
                         placeholder="E.G. ABCDEF"
                         className="w-full text-center text-3xl font-black tracking-[0.5em] py-5 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-gray-200 uppercase"
                       />
                       {redeemCode.length === 6 && !redeeming && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in">
                             <CheckCircle2 size={24} />
                          </div>
                       )}
                    </div>

                    {redeemMessage && (
                       <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-top-2 ${
                         redeemMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                       }`}>
                          {redeemMessage.type === 'success' ? <Sparkles size={20} /> : <AlertCircle size={20} />}
                          {redeemMessage.text}
                       </div>
                    )}

                    <button 
                      type="submit"
                      disabled={redeeming || redeemCode.length !== 6}
                      className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
                    >
                       {redeeming ? <Loader2 className="animate-spin" size={24} /> : 'CLAIM MY REWARD'}
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* Status Viewer Modal */}
      {showStatusViewer && (
        <StatusViewerModal 
          statuses={filteredCampaigns}
          initialIndex={currentStatusIndex}
          onClose={() => {
            setShowStatusViewer(false)
            fetchData() 
          }}
          user={user}
          onRewardedUpdate={fetchRewardedMedia}
        />
      )}
    </div>
  )
}

function StatusViewerModal({ statuses, initialIndex, onClose, user, onRewardedUpdate }: any) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isRewarded, setIsRewarded] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()
  const timerRef = useRef<any>(null)
  const rewardTimeoutRef = useRef<any>(null)
  const viewedMediaIds = useRef(new Set());

  const currentStatus = statuses[currentIndex]
  const currentMedia = currentStatus?.media_items?.[currentMediaIndex]

  useEffect(() => {
    if (!currentMedia) return
    startTimer()
    return () => stopTimer()
  }, [currentMedia?.id])

  useEffect(() => {
    if (!currentMedia || !user) return

    if (viewedMediaIds.current.has(currentMedia.id)) {
      return
    }

    rewardTimeoutRef.current = setTimeout(() => {
      handleReward()
    }, 50)

    return () => {
      if (rewardTimeoutRef.current) {
        clearTimeout(rewardTimeoutRef.current)
        rewardTimeoutRef.current = null
      }
    }
  }, [currentMedia?.id, user?.id])

  const startTimer = () => {
    stopTimer()
    setProgress(0)
    setIsRewarded(false)
    
    const duration = 5000 
    const interval = 50
    let elapsed = 0

    timerRef.current = setInterval(() => {
      elapsed += interval
      const newProgress = (elapsed / duration) * 100
      setProgress(newProgress)

      if (elapsed >= duration) {
        stopTimer()
        nextMedia()
      }
    }, interval)
  }

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const nextMedia = () => {
    if (currentMediaIndex < currentStatus.media_items.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1)
    } else {
      nextStatus()
    }
  }

  const prevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1)
    } else if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setCurrentMediaIndex(statuses[currentIndex - 1].media_items.length - 1)
    }
  }

  const nextStatus = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setCurrentMediaIndex(0)
    } else {
      onClose()
    }
  }

  const handleReward = async () => {
    if (!currentMedia || !user) return

    if (viewedMediaIds.current.has(currentMedia.id)) return;
    viewedMediaIds.current.add(currentMedia.id);

    try {
      const { data, error } = await supabase.rpc('record_media_view_with_reward', {
        p_media_id: currentMedia.id,
        p_viewer_id: user.id
      })
      if (error) throw error
      if (data?.success && data?.reward_given) {
        setIsRewarded(true)
        if (onRewardedUpdate) onRewardedUpdate()
        setTimeout(() => setIsRewarded(false), 3000)
      }
    } catch (err) {
      console.error('Reward error:', err)
    }
  }

  const handleContactBrand = async () => {
    setLoading(true)
    try {
      const contextData = {
        status_title: currentStatus.title,
        status_type: currentStatus.type,
        media_url: currentMedia.media_url,
        brand_name: currentStatus.brand.name,
        timestamp: new Date().toISOString()
      }

      const { data: chatId, error } = await supabase.rpc('find_or_create_dm_chat', {
        user_1_id: user.id,
        user_2_id: currentStatus.brand.id,
        p_context_data: contextData
      })

      if (error) throw error
      router.push(`/dashboard/chats?id=${chatId}`)
      onClose()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!currentStatus || !currentMedia) return null

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center animate-in fade-in duration-300">
       <div className="absolute top-0 left-0 right-0 p-4 flex gap-1.5 z-[210]">
          {currentStatus.media_items.map((_: any, idx: number) => (
            <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-white transition-all duration-75 ease-linear"
                 style={{ 
                   width: idx < currentMediaIndex ? '100%' : idx === currentMediaIndex ? `${progress}%` : '0%' 
                 }}
               />
            </div>
          ))}
       </div>

       <div className="absolute top-8 left-0 right-0 px-6 flex items-center justify-between z-[210]">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl overflow-hidden border border-white/20">
                <img src={currentStatus.brand.avatar} className="h-full w-full object-cover" alt="" />
             </div>
             <div>
                <p className="text-white font-bold text-sm leading-none">{currentStatus.brand.name}</p>
                <p className="text-white/60 text-[10px] uppercase font-black tracking-widest mt-1">@{currentStatus.brand.username}</p>
             </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center backdrop-blur-md">
             <X size={24} />
          </button>
       </div>

       <div className="relative w-full h-full flex items-center justify-center select-none">
          {currentMedia.media_type === 'video' ? (
            <video 
              key={currentMedia.media_url}
              src={currentMedia.media_url}
              autoPlay
              muted
              playsInline
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <img src={currentMedia.media_url} className="max-h-full max-w-full object-contain" alt="" />
          )}

          <div className="absolute inset-0 flex">
             <div className="flex-1 cursor-pointer" onClick={prevMedia} />
             <div className="flex-1 cursor-pointer" onClick={nextMedia} />
          </div>
       </div>

       <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent z-[210] space-y-6">
          <div className="space-y-2">
             <h3 className="text-xl font-black text-white">{currentStatus.title}</h3>
             <p className="text-sm text-white/70 leading-relaxed italic line-clamp-3">"{currentStatus.description}"</p>
          </div>

          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10">
                <Coins className="text-brand" size={16} />
                <span className="text-sm font-black text-white">{currentMedia.reward_per_view} BC</span>
                <span className="text-[10px] font-black text-brand uppercase tracking-tighter ml-1">Earning</span>
             </div>

             <div className="flex gap-3">
                <button 
                  onClick={handleContactBrand}
                  className="px-6 py-3 bg-white text-gray-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                   Contact Brand
                </button>
                <button 
                  className="h-12 w-12 bg-white/10 text-white rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all"
                >
                   <ArrowRight size={20} />
                </button>
             </div>
          </div>
       </div>

       {isRewarded && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 animate-in zoom-in duration-300 z-[220]">
            <CheckCircle2 size={32} />
            <div>
               <p className="text-lg font-black leading-none">Coins Earned!</p>
               <p className="text-xs font-bold opacity-80 mt-1">Reward added to wallet</p>
            </div>
         </div>
       )}
    </div>
  )
}

function CampaignCard({ campaign, completed, onClick, onShare, isSharing }: { campaign: any, completed?: boolean, onClick: () => void, onShare?: (campaign: any) => void, isSharing?: boolean }) {
  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'status_view': return 'Story View'
      case 'challenge': return 'Video Challenge'
      case 'survey': return 'Market Survey'
      default: return 'Content Task'
    }
  }

  const hasShareRewards = (campaign.reward_amount || 0) > 0 && (campaign.media_items?.length || 0) > 0

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand/30 transition-all group flex flex-col h-full relative overflow-hidden">
       <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand/10 transition-colors" />
       
       <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="h-12 w-12 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
             <img src={campaign.brand.avatar || `https://ui-avatars.com/api/?name=${campaign.brand.name}&background=random`} className="h-full w-full object-cover" alt="" />
          </div>
          <div>
             <div className="flex items-center gap-1.5">
                <p className="font-bold text-gray-900 text-sm leading-none">{campaign.brand.name}</p>
                {campaign.brand.verified && <ShieldCheck size={14} className="text-blue-500" />}
             </div>
             <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1.5">
               {getTypeLabel(campaign.type)}
             </p>
          </div>
       </div>

       <div className="flex-1 space-y-3 mb-8 relative z-10">
          <h3 className="text-lg font-black text-gray-900 leading-tight group-hover:text-brand transition-colors">
            {campaign.title}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed italic">
            "{campaign.description || "Help this brand grow by completing this simple task."}"
          </p>
          
          {hasShareRewards && (
             <div className="flex items-center gap-2 pt-2">
                <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                   <Share2 size={12} className="text-emerald-600" />
                   <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Share to Earn {Math.round((campaign.reward_amount || 0) * 0.1)} BC</span>
                </div>
             </div>
          )}
       </div>

       <div className="pt-6 border-t border-gray-50 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-1.5">
             <div className="h-8 w-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                <Coins size={16} />
             </div>
             <div>
                <p className="text-sm font-black text-gray-900 leading-none">{campaign.reward_amount}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Reward BC</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             {hasShareRewards && (
               <button
                 onClick={(e) => {
                   e.stopPropagation()
                   onShare?.(campaign)
                 }}
                 disabled={isSharing}
                 className="h-12 w-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center hover:bg-brand transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isSharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
               </button>
             )}
             <button 
               onClick={onClick}
               className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand transition-all shadow-lg active:scale-95"
             >
               {campaign.type === 'status_view' ? (completed ? 'VIEW AGAIN' : 'WATCH') : 'DETAILS'}
               <ChevronRight size={14} />
             </button>
          </div>
       </div>

       {campaign.source_hub_name && (
         <div className="absolute top-4 right-8 flex items-center gap-1 px-2 py-0.5 bg-brand/5 border border-brand/10 rounded text-[9px] font-black text-brand uppercase tracking-tighter">
            <Users size={10} />
            {campaign.source_hub_name}
         </div>
       )}
       {completed && (
         <div className="absolute top-4 left-8 flex items-center gap-1 px-2 py-0.5 bg-emerald-100 border border-emerald-200 rounded text-[9px] font-black text-emerald-700 uppercase tracking-tighter">
            <CheckCircle2 size={10} />
            Completed
         </div>
       )}
    </div>
  )
}
