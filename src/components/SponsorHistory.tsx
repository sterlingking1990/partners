'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { X, Loader2 } from 'lucide-react'

export default function SponsorHistory({ user, onClose }: { user: any; onClose: () => void }) {
  const supabase = createClient()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data: interactions } = await supabase
          .from('game_campaign_interactions')
          .select('trigger_word, coins_earned, campaign_id')
          .eq('influencer_id', user.id)
          .eq('success', true)
          .order('created_at', { ascending: false })
        if (!interactions?.length) return

        const campaignIds = Array.from(new Set(interactions.map((i: any) => i.campaign_id)))
        const campData: any[] = []
        for (const cid of campaignIds) {
          const { data } = await supabase.rpc('get_campaign_by_id_safe', { p_campaign_id: cid })
          if (data?.[0]) campData.push(data[0])
        }

        const brandIds = Array.from(new Set(campData.map((c: any) => c.brand_id).filter(Boolean)))
        let brandMap: Record<string, string> = {}
        if (brandIds.length) {
          const { data: brands } = await supabase.from('brands').select('id, company_name').in('id', brandIds)
          brands?.forEach((b: any) => { brandMap[b.id] = b.company_name })
        }

        const aggregated = interactions.reduce((acc: any, i: any) => {
          const camp = campData.find((c: any) => c.id === i.campaign_id)
          if (!acc[i.campaign_id]) {
            acc[i.campaign_id] = {
              campaign_id: i.campaign_id,
              campaign_name: camp?.campaign_name || 'Campaign',
              brand_name: brandMap[camp?.brand_id] || 'Brand',
              campaign_message: camp?.campaign_message,
              campaign_link: camp?.campaign_link,
              cta_text: camp?.cta_text,
              media_url: camp?.media_url,
              all_triggers: camp?.game_triggers || [],
              campaign_status: camp?.status,
              total_earned: 0,
              unlocked_triggers: [],
            }
          }
          acc[i.campaign_id].total_earned += parseFloat(i.coins_earned || 0)
          if (!acc[i.campaign_id].unlocked_triggers.includes(i.trigger_word))
            acc[i.campaign_id].unlocked_triggers.push(i.trigger_word)
          return acc
        }, {})

        setCampaigns(Object.values(aggregated).slice(0, 5))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.id])

  return (
    <div className="flex flex-col gap-6 py-6 px-4 max-w-md mx-auto w-full">
      <div className="flex items-center justify-between">
        <p className="font-black text-gray-900 text-base uppercase tracking-widest">Sponsor History</p>
        <button onClick={onClose} className="h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
          <X size={20} className="text-gray-500" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand" size={28} /></div>
      ) : campaigns.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No sponsor history yet. Play more to unlock sponsor words!</p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c: any) => (
            <div key={c.campaign_id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              {c.media_url && (
                <div className="relative">
                  <img src={c.media_url} alt={c.campaign_name} className="w-full h-28 object-cover" />
                  {c.campaign_status !== 'active' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xs font-black uppercase tracking-widest">Campaign Ended</span>
                    </div>
                  )}
                </div>
              )}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-gray-900 text-sm">{c.campaign_name}</p>
                    <p className="text-[10px] text-gray-400">by {c.brand_name}</p>
                  </div>
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black">+{c.total_earned.toFixed(1)} BC</span>
                </div>
                {c.campaign_message && <p className="text-xs text-gray-500 line-clamp-2">{c.campaign_message}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {c.unlocked_triggers.map((t: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full text-[10px] font-black text-emerald-700">{t} ✓</span>
                  ))}
                  {c.all_triggers.filter((t: string) => !c.unlocked_triggers.includes(t)).map((t: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-full text-[10px] font-black text-gray-400">{t} 🔒</span>
                  ))}
                </div>
                {c.campaign_link && c.campaign_status === 'active' && (
                  <a href={c.campaign_link} target="_blank" rel="noopener noreferrer"
                    className="block w-full py-2 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-widest text-center hover:opacity-90 transition-opacity">
                    {c.cta_text || 'Learn More'}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
