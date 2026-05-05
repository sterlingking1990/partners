'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  ShoppingBag, Search, Loader2, Play, X, ExternalLink,
  MessageSquare, Sparkles, Tag, ChevronRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

export default function ShopPage() {
  const [mediaItems, setMediaItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [contacting, setContacting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

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

      const { data, error } = await supabase
        .from('searchable_brand_media')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setMediaItems(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setAiAnalysis(null)
    try {
      const { data, error } = await supabase.functions.invoke('ai-search-media', {
        body: { query: searchQuery, limit: 100 },
      })
      if (error) throw error
      if (data?.results) {
        setMediaItems(data.results)
        setAiAnalysis(data.analysis)
      } else {
        setMediaItems([])
      }
    } catch (err: any) {
      setToastType('error')
      setToastMessage(err.message || 'Search failed')
      setShowToast(true)
    } finally {
      setSearching(false)
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setAiAnalysis(null)
    fetchData()
  }

  const handleContactBrand = async (item: any) => {
    if (!user) return
    setContacting(true)
    try {
      // Check if brand is an agency with WhatsApp
      const { data: brandData } = await supabase
        .from('brands')
        .select('profile_id, isAgency, sales_handler, agency_status')
        .eq('id', item.brand_id)
        .single()

      if (brandData?.isAgency && brandData?.agency_status === 'closed') {
        setToastType('error')
        setToastMessage('This agency is currently not accepting new contacts.')
        setShowToast(true)
        return
      }

      if (brandData?.isAgency && brandData?.sales_handler) {
        // Generate share link
        const { data: shareLink } = await supabase.rpc('generate_brand_media_share_link', {
          p_media_id: item.id,
          p_referrer_id: user.id,
        })
        const linkPart = shareLink ? ` Link: ${shareLink}.` : ''
        const message = `Hi, I'm interested in your content: "${item.caption || 'Media'}" from ${item.brand_username || 'your brand'}.${linkPart} Let's chat!`
        window.open(`https://wa.me/${brandData.sales_handler}?text=${encodeURIComponent(message)}`, '_blank')
        setSelectedItem(null)
        return
      }

      // In-app chat
      const contextData = {
        media_id: item.id,
        media_type: item.media_type,
        media_url: item.media_url,
        caption: item.caption,
        brand_name: item.brand_username,
        source: 'shop_page',
        timestamp: new Date().toISOString(),
      }

      const { data: chatId, error } = await supabase.rpc('find_or_create_dm_chat', {
        user_1_id: user.id,
        user_2_id: brandData?.profile_id,
        p_source_status_id: null,
        p_source_media_id: null,
        p_context_data: contextData,
      })

      if (error) throw error
      setSelectedItem(null)
      router.push(`/dashboard/chats?id=${chatId}`)
    } catch (err: any) {
      setToastType('error')
      setToastMessage(err.message || 'Could not contact brand.')
      setShowToast(true)
    } finally {
      setContacting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} type={toastType} />

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <ShoppingBag className="text-brand" size={20} />
          <h1 className="text-lg font-semibold text-gray-800">Shop</h1>
        </div>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{mediaItems.length} Items</span>
      </header>

      <main className="p-8 max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Explore All Products</h2>
          <p className="text-gray-500 font-medium mt-1">Shop items you love from all brands.</p>
        </div>

        {/* AI Search Bar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAISearch()}
              placeholder="Search with AI (e.g. 'birthday gift ideas')"
              className="w-full pl-12 pr-10 py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm focus:ring-2 focus:ring-brand outline-none transition-all"
            />
            {searchQuery && (
              <button onClick={handleClearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            )}
          </div>
          <button
            onClick={handleAISearch}
            disabled={searching || !searchQuery.trim()}
            className="flex items-center gap-2 px-6 py-4 bg-brand text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            AI Search
          </button>
        </div>

        {/* AI Analysis */}
        {aiAnalysis && (
          <div className="flex items-center gap-3 p-4 bg-brand/5 border border-brand/10 rounded-2xl">
            <Sparkles size={16} className="text-brand shrink-0" />
            <div className="flex flex-wrap gap-2">
              {aiAnalysis.occasion && <span className="px-3 py-1 bg-white rounded-full text-xs font-bold text-brand border border-brand/10">🎁 {aiAnalysis.occasion}</span>}
              {aiAnalysis.price_range && aiAnalysis.price_range !== 'any' && <span className="px-3 py-1 bg-white rounded-full text-xs font-bold text-brand border border-brand/10">💰 {aiAnalysis.price_range}</span>}
              {aiAnalysis.query_type && <span className="px-3 py-1 bg-white rounded-full text-xs font-bold text-brand border border-brand/10">📝 {aiAnalysis.query_type}</span>}
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="animate-spin text-brand" size={40} />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Loading Products...</p>
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="py-40 text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
            <ShoppingBag className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-xl font-bold text-gray-900">No products found</h3>
            <p className="text-gray-500 mt-2">Try a different search or check back later.</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {mediaItems.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="break-inside-avoid bg-white rounded-[1.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand/20 transition-all cursor-pointer group"
              >
                <div className="relative overflow-hidden">
                  {item.media_type === 'video' ? (
                    <div className="relative bg-gray-900">
                      {item.thumbnail_url
                        ? <img src={item.thumbnail_url} alt="" className="w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="aspect-square bg-gray-800 flex items-center justify-center"><Play size={40} className="text-white/50" /></div>
                      }
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-12 w-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm">
                          <Play size={20} className="text-white ml-1" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img src={item.media_url} alt={item.caption || ''} className="w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}
                </div>

                <div className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <img
                      src={item.brand_profile_image || `https://ui-avatars.com/api/?name=${item.brand_username}&size=32`}
                      className="h-5 w-5 rounded-full object-cover"
                      alt=""
                    />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter truncate">@{item.brand_username}</span>
                  </div>
                  {item.caption && <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{item.caption}</p>}
                  {item.keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.keywords.slice(0, 3).map((kw: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-brand/5 text-brand rounded-md text-[9px] font-black uppercase tracking-tighter">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-[2.5rem] overflow-hidden max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Media */}
            <div className="bg-gray-900 max-h-[50vh] overflow-hidden flex items-center justify-center">
              {selectedItem.media_type === 'video' ? (
                <video src={selectedItem.media_url} controls className="w-full max-h-[50vh] object-contain" />
              ) : (
                <img src={selectedItem.media_url} alt="" className="w-full max-h-[50vh] object-contain" />
              )}
            </div>

            <div className="p-6 space-y-4">
              {/* Brand */}
              <div className="flex items-center gap-3">
                <img
                  src={selectedItem.brand_profile_image || `https://ui-avatars.com/api/?name=${selectedItem.brand_username}&size=40`}
                  className="h-10 w-10 rounded-xl object-cover"
                  alt=""
                />
                <div>
                  <p className="font-bold text-gray-900">@{selectedItem.brand_username}</p>
                  {selectedItem.brand_company_name && <p className="text-xs text-gray-400">{selectedItem.brand_company_name}</p>}
                </div>
                <a
                  href={`https://shop.brandiblebms.com/${selectedItem.brand_username}/wall`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                  onClick={e => e.stopPropagation()}
                >
                  Visit Shop <ExternalLink size={12} />
                </a>
              </div>

              {selectedItem.caption && <p className="text-sm text-gray-600 leading-relaxed">{selectedItem.caption}</p>}

              {selectedItem.keywords?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedItem.keywords.map((kw: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-brand/5 text-brand rounded-lg text-[10px] font-black uppercase tracking-tighter">{kw}</span>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 py-3 border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => handleContactBrand(selectedItem)}
                  disabled={contacting}
                  className="flex-[2] py-3 bg-brand text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {contacting ? <Loader2 size={14} className="animate-spin" /> : <><MessageSquare size={14} /> Contact Brand</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
