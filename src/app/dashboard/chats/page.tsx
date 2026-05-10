'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Search, 
  Send, 
  User, 
  MoreVertical, 
  Phone, 
  Video, 
  Info, 
  CheckCircle2, 
  Clock, 
  Loader2,
  ChevronLeft,
  MessageSquare,
  ShoppingBag,
  ExternalLink,
  PlayCircle,
  X,
  AlertCircle,
  Paperclip,
  Smile,
  Mic,
  Upload,
  Camera,
  Trophy
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import MediaCarouselModal from '@/components/MediaCarouselModal'

function ChatMessagesContent() {
  const [chats, setChats] = useState<any[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Preview Modal State
  const [showPreview, setShowPreview] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId)
      
      const channel = supabase
        .channel(`chat:${selectedChatId}`)
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `chat_id=eq.${selectedChatId}` 
          },
          (payload) => {
            const newMsg = payload.new
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev

              const optimisticIndex = prev.findIndex(m => 
                m.is_optimistic && 
                m.sender_id === newMsg.sender_id && 
                m.content === newMsg.content &&
                Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 10000
              )

              if (optimisticIndex !== -1) {
                const updated = [...prev]
                updated[optimisticIndex] = newMsg
                return updated
              }

              return [...prev, newMsg]
            })
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [selectedChatId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUser(user)

      // Fetch chats where influencer_id = user.id
      const { data: chatsData, error } = await supabase
        .from('chats')
        .select(`
          *,
          brand_profile:brand_id (
            full_name,
            avatar_url,
            username
          ),
          affiliate_deal:unboxed_submission_id (
            referral_reward,
            total_sales_count,
            total_earned_by_influencer
          )
        `)
        .eq('influencer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const chatIds = chatsData.map(c => c.id)
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('chat_id, content, created_at, sender_id')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false })

      const lastMessageMap: Record<string, any> = {}
      lastMessages?.forEach(msg => {
        if (!lastMessageMap[msg.chat_id]) lastMessageMap[msg.chat_id] = msg
      })

      const enrichedChats = chatsData.map(chat => ({
        ...chat,
        last_message: lastMessageMap[chat.id]?.content || 'Start a conversation',
        last_message_time: lastMessageMap[chat.id]?.created_at || chat.created_at,
        is_own_last: lastMessageMap[chat.id]?.sender_id === user.id
      }))

      setChats(enrichedChats)

      const urlChatId = searchParams.get('id')
      if (urlChatId) {
        setSelectedChatId(urlChatId)
        setMobileView('chat')
      } else if (enrichedChats.length > 0) {
        setSelectedChatId(enrichedChats[0].id)
        // Don't switch to chat view on mobile for auto-selection
      }

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (chatId: string) => {
    setMessagesLoading(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newMessage.trim() || !selectedChatId || !currentUser) return

    const msgContent = newMessage.trim()
    setNewMessage('')

    const tempId = `temp-${Date.now()}`
    const optimisticMsg = {
      id: tempId,
      chat_id: selectedChatId,
      sender_id: currentUser.id,
      content: msgContent,
      created_at: new Date().toISOString(),
      is_optimistic: true
    }
    setMessages(prev => [...prev, optimisticMsg])

    try {
      const { error } = await supabase.rpc('send_message', {
        p_chat_id: selectedChatId,
        p_content: msgContent
      })

      if (error) throw error

      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, is_optimistic: false } : m))
      
      setChats(prev => prev.map(c => 
        c.id === selectedChatId 
        ? { ...c, last_message: msgContent, last_message_time: new Date().toISOString(), is_own_last: true } 
        : c
      ))

    } catch (err: any) {
      alert('Failed to send message: ' + err.message)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setNewMessage(msgContent)
    }
  }

  const selectedChat = chats.find(c => c.id === selectedChatId)
  const filteredChats = chats.filter(c => 
    c.brand_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.brand_profile?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
         <Loader2 className="animate-spin text-brand" size={40} />
         <p className="text-gray-400 font-bold uppercase tracking-widest mt-4 text-[10px]">Syncing Conversations...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 h-[100vh] max-h-screen overflow-hidden bg-white">
      {/* Sidebar: Chat List */}
      <div className={`${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex w-full md:w-[350px] lg:w-[400px] flex-col border-r border-gray-100 h-full bg-white relative z-10`}>
        <header className="p-6 border-b border-gray-100 space-y-4 shrink-0">
           <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Messages</h1>
              <div className="h-8 px-3 rounded-xl bg-brand/10 text-brand flex items-center justify-center text-xs font-black">
                 {chats.length}
              </div>
           </div>
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search brands..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all text-sm"
              />
           </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
           {filteredChats.length > 0 ? filteredChats.map((chat) => (
             <button
               key={chat.id}
               onClick={() => { setSelectedChatId(chat.id); setMobileView('chat') }}
               className={`w-full flex items-center gap-4 p-4 transition-all border-b border-gray-50/50 ${selectedChatId === chat.id ? 'bg-brand/5 border-l-4 border-l-brand' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
             >
                <div className="relative shrink-0">
                   <div className="h-12 w-12 rounded-2xl overflow-hidden border border-gray-100 bg-gray-100">
                      <img 
                        src={chat.brand_profile?.avatar_url || `https://ui-avatars.com/api/?name=${chat.brand_profile?.full_name}&background=random`} 
                        className="h-full w-full object-cover"
                        alt=""
                      />
                   </div>
                   <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1 text-left min-w-0">
                   <div className="flex justify-between items-center mb-0.5">
                      <p className="font-bold text-gray-900 truncate text-sm">{chat.brand_profile?.full_name}</p>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">{formatTime(chat.last_message_time)}</span>
                   </div>
                   <p className={`text-xs truncate ${selectedChatId === chat.id ? 'text-brand font-medium' : 'text-gray-500'}`}>
                      {chat.is_own_last ? 'You: ' : ''}{chat.last_message}
                   </p>
                </div>
             </button>
           )) : (
             <div className="p-20 text-center space-y-4 opacity-40">
                <MessageSquare size={48} className="mx-auto" />
                <p className="text-xs font-black uppercase tracking-widest leading-relaxed">No conversations<br/>found</p>
             </div>
           )}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className={`${mobileView === 'list' ? 'hidden' : 'flex'} md:flex flex-1 flex-col h-full bg-gray-50 relative overflow-hidden`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0 relative z-10">
               <div className="flex items-center gap-4">
                  <button onClick={() => setMobileView('list')} className="md:hidden p-2 -ml-2 text-gray-500 hover:text-brand transition-colors"><ChevronLeft size={22} /></button>
                  <div className="h-11 w-11 rounded-xl overflow-hidden border border-gray-100 bg-gray-100 shrink-0">
                     <img 
                        src={selectedChat.brand_profile?.avatar_url || `https://ui-avatars.com/api/?name=${selectedChat.brand_profile?.full_name}&background=random`} 
                        className="h-full w-full object-cover"
                        alt=""
                      />
                  </div>
                  <div>
                     <p className="font-black text-gray-900 leading-none">{selectedChat.brand_profile?.full_name}</p>
                     <p className="text-xs text-gray-400 font-bold mt-1.5 uppercase tracking-wider">@{selectedChat.brand_profile?.username}</p>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <button className="h-10 w-10 rounded-xl bg-gray-50 text-gray-400 hover:text-brand hover:bg-brand/10 transition-all flex items-center justify-center border border-gray-100">
                     <Phone size={18} />
                  </button>
                  <button className="h-10 w-10 rounded-xl bg-gray-50 text-gray-400 hover:text-brand hover:bg-brand/10 transition-all flex items-center justify-center border border-gray-100">
                     <Video size={18} />
                  </button>
                  <div className="w-px h-5 bg-gray-200 mx-1" />
                  <button className="h-10 w-10 rounded-xl bg-gray-50 text-gray-400 hover:text-brand hover:bg-brand/10 transition-all flex items-center justify-center border border-gray-100">
                     <MoreVertical size={18} />
                  </button>
               </div>
            </header>

            {/* Sticky Context Card */}
            {selectedChat.context_data && (
               <div className="px-8 pt-4 pb-2 shrink-0">
                  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-24 h-full bg-brand/5 -skew-x-12 translate-x-12" />
                     
                     <div className="h-12 w-12 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowPreview(true)}>
                        {selectedChat.context_data.media_url ? (
                          selectedChat.context_data.media_type === 'video' ? (
                            <div className="relative w-full h-full">
                               <video 
                                 src={selectedChat.context_data.media_url} 
                                 poster={selectedChat.context_data.thumbnail_url}
                                 className="w-full h-full object-cover"
                               />
                               <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <PlayCircle size={16} className="text-white fill-current" />
                               </div>
                            </div>
                          ) : (
                            <img src={selectedChat.context_data.thumbnail_url || selectedChat.context_data.media_url} className="h-full w-full object-cover" />
                          )
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-brand"><ShoppingBag size={20} /></div>
                        )}
                     </div>

                     <div className="flex-1 space-y-0.5 cursor-pointer" onClick={() => setShowPreview(true)}>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black text-brand uppercase tracking-widest">Brand Context</span>
                           <div className="h-1 w-1 rounded-full bg-gray-300" />
                           <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{selectedChat.type === 'unboxed' ? 'Affiliate Deal' : 'Challenge Details'}</span>
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 leading-tight line-clamp-1">{selectedChat.context_data.status_title || selectedChat.context_data.caption}</h4>
                     </div>

                     {selectedChat.type === 'unboxed' && (
                        <button 
                           onClick={() => router.push(`/dashboard/campaigns`)}
                           className="px-4 py-2 bg-brand text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-brand/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
                        >
                           <Camera size={12} /> RECORD & POST
                        </button>
                     )}
                  </div>
               </div>
            )}

            {/* Scrollable Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-4 scroll-smooth scrollbar-hide">
               {messagesLoading ? (
                  <div className="flex justify-center py-20">
                     <Loader2 className="animate-spin text-brand/20" size={32} />
                  </div>
               ) : messages.map((msg, index) => {
                 const isOwn = msg.sender_id === currentUser.id
                 return (
                   <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1 duration-300`}>
                      <div className={`max-w-[75%] space-y-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                         <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${isOwn ? 'bg-brand text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>
                            {msg.content}
                         </div>
                         <div className="flex items-center gap-2 px-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase">{formatTime(msg.created_at)}</span>
                            {isOwn && (
                               <span className="text-brand font-black text-[10px]">{msg.is_optimistic ? '✓' : '✓✓'}</span>
                            )}
                         </div>
                      </div>
                   </div>
                 )
               })}
               <div ref={messagesEndRef} />
            </div>

            {/* Sticky Input Bar at Bottom */}
            <div className="bg-white border-t border-gray-100 shrink-0">
               {selectedChat.type === 'unboxed' && (
                  <div className="px-8 py-4 bg-brand/5 border-b border-brand/10 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-500">
                     <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-brand text-white rounded-full flex items-center justify-center shadow-lg shadow-brand/20">
                           <Trophy size={18} />
                        </div>
                        <div>
                           <p className="text-sm font-black text-gray-900">Affiliate Performance</p>
                           <p className="text-[10px] text-brand font-bold uppercase tracking-widest">Commission: {selectedChat.affiliate_deal?.referral_reward || '--'} BC per sale</p>
                        </div>
                     </div>
                     <div className="flex gap-6">
                        <div className="text-center">
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Total Sales</p>
                           <p className="text-sm font-black text-gray-900">{selectedChat.affiliate_deal?.total_sales_count || 0}</p>
                        </div>
                        <div className="text-center">
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">You Earned</p>
                           <p className="text-sm font-black text-emerald-600">{selectedChat.affiliate_deal?.total_earned_by_influencer || 0} BC</p>
                        </div>
                     </div>
                  </div>
               )}

               <div className="p-6">
                  <form 
                     onSubmit={handleSendMessage} 
                     className="flex items-end gap-3 max-w-5xl mx-auto"
                  >
                  <div className="flex-1 flex items-end gap-2 bg-gray-50 p-2 pl-4 rounded-3xl border border-gray-100 focus-within:ring-2 focus-within:ring-brand/10 transition-all">
                     <button type="button" className="p-2 text-gray-400 hover:text-brand transition-colors"><Paperclip size={20} /></button>
                     <textarea 
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        rows={1}
                        className="flex-1 bg-transparent py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 resize-none max-h-32"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                     />
                     <button type="button" className="p-2 text-gray-400 hover:text-brand transition-colors"><Smile size={20} /></button>
                  </div>
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="h-12 w-12 bg-brand text-white rounded-full flex items-center justify-center shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 disabled:shadow-none shrink-0"
                  >
                     <Send size={20} />
                  </button>
               </form>
               <p className="text-[9px] text-gray-400 text-center mt-3 font-medium uppercase tracking-[0.2em]">Secure End-to-End Chat</p>
            </div>
          </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
             <div className="h-24 w-24 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-center text-brand/20">
                <MessageSquare size={48} />
             </div>
             <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Direct Messaging</h3>
                <p className="text-gray-500 max-w-sm mx-auto font-medium leading-relaxed">Select a brand from the list on the left to start coordinating your campaigns.</p>
             </div>
             <button 
               onClick={() => router.push('/dashboard/campaigns')}
               className="px-8 py-3 bg-brand/5 text-brand rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand/10 transition-all border border-brand/10"
             >
                Explore Opportunities
             </button>
          </div>
        )}
      </div>

      {/* Media Preview Modal */}
      {selectedChat?.context_data?.media_url && (
        <MediaCarouselModal 
          isVisible={showPreview}
          onClose={() => setShowPreview(false)}
          mediaItems={[{
            ...selectedChat.context_data,
            id: selectedChat.id,
            created_at: selectedChat.created_at
          }]}
          initialIndex={0}
        />
      )}
    </div>
  )
}

export default function ChatMessagesPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex flex-col items-center justify-center bg-white"><Loader2 className="animate-spin text-brand" size={40} /></div>}>
       <ChatMessagesContent />
    </Suspense>
  )
}
