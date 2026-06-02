'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Store,
  Search,
  Loader2,
  Zap,
  Users,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  Link2,
  KeyRound,
  Download,
  Filter,
  ExternalLink,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

const CATEGORIES = ['all', 'health', 'education', 'finance', 'software', 'entertainment', 'other']

const FulfilmentIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'redirect':      return <Link2 size={14} />
    case 'access_code':   return <KeyRound size={14} />
    case 'file_download': return <Download size={14} />
    case 'credentials':   return <ShieldCheck size={14} />
    default:              return <Zap size={14} />
  }
}

const ModeTag = ({ mode }: { mode: string }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
    mode === 'open'
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-amber-50 text-amber-700 border-amber-200'
  }`}>
    {mode === 'open' ? <Zap size={10} /> : <Lock size={10} />}
    {mode}
  </span>
)

export default function ActivationsMarketplacePage() {
  const supabase = createClient()
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [eligible, setEligible] = useState<boolean | null>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [myCampaigns, setMyCampaigns] = useState<Record<string, any>>({})
  const [myApplications, setMyApplications] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [myStats, setMyStats] = useState({ earnings: 0, campaigns: 0 })
  const [hasPhone, setHasPhone] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      setUser(authUser)

      const [eligibleRes, campaignsRes, activatorRes, appsRes, profileRes] = await Promise.all([
        supabase.from('eligible_activators').select('id').eq('id', authUser.id).maybeSingle(),
        supabase
          .from('activation_campaigns')
          .select(`
            id, title, description, category, campaign_mode, price_kobo,
            commission_rate, max_activators, active_activators, fulfilment_type,
            status, verification_status, learn_more_url,
            profiles:brand_id (full_name, username, avatar_url)
          `)
          .eq('status', 'active')
          .eq('verification_status', 'approved')
          .order('created_at', { ascending: false }),
        supabase
          .from('activation_campaign_activators')
          .select('campaign_id, id, dva_status, dva_account_number, dva_bank_name, dva_account_name, total_payments_count, total_commission_earned')
          .eq('activator_id', authUser.id),
        supabase
          .from('activation_applications')
          .select('campaign_id, id, status')
          .eq('activator_id', authUser.id),
        supabase
          .from('profiles')
          .select('total_activation_earnings, total_activations_count, phone')
          .eq('id', authUser.id)
          .single(),
      ])

      setEligible(!!eligibleRes.data)
      setCampaigns(campaignsRes.data ?? [])

      const activatorMap: Record<string, any> = {}
      for (const row of activatorRes.data ?? []) activatorMap[row.campaign_id] = row
      setMyCampaigns(activatorMap)

      const appsMap: Record<string, any> = {}
      for (const row of appsRes.data ?? []) appsMap[row.campaign_id] = row
      setMyApplications(appsMap)

      if (profileRes.data) {
        setMyStats({
          earnings: profileRes.data.total_activation_earnings ?? 0,
          campaigns: profileRes.data.total_activations_count ?? 0,
        })
        setHasPhone(!!profileRes.data.phone)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(campaignId: string, mode: string, pitch?: string) {
    if (!eligible) return
    if (!hasPhone) {
      setToastMessage('Add a phone number in Settings before joining campaigns.')
      setShowToast(true)
      return
    }
    setJoiningId(campaignId)
    try {
      const { data, error } = await supabase.functions.invoke('join-activation-campaign', {
        body: { campaign_id: campaignId, pitch },
      })
      if (error) throw error
      if (!data.success) throw new Error(data.error)

      setToastMessage(
        mode === 'open'
          ? 'Joined! Your dedicated account is being set up — check back in a moment.'
          : 'Application submitted! The brand will review it shortly.'
      )
      setShowToast(true)
      await fetchData()
    } catch (e: any) {
      setToastMessage(`Error: ${e.message}`)
      setShowToast(true)
    } finally {
      setJoiningId(null)
    }
  }

  const filtered = campaigns.filter(c => {
    const matchCat = category === 'all' || c.category === category
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.profiles?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const fmt = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />

      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Store className="text-brand" size={20} />
          <h1 className="text-lg font-semibold text-gray-800">Activation Marketplace</h1>
        </div>
        <div className="flex items-center gap-2 bg-brand/5 px-3 py-1.5 rounded-full border border-brand/10">
          <span className="text-[10px] font-black text-brand uppercase tracking-widest">{campaigns.length} Campaigns</span>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">

        {/* Earnings summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Earned', value: `₦${myStats.earnings.toLocaleString()}`, icon: <TrendingUp size={18} />, color: 'text-green-600' },
            { label: 'Active Campaigns', value: Object.keys(myCampaigns).length.toString(), icon: <Store size={18} />, color: 'text-blue-600' },
            { label: 'Pending Apps', value: Object.values(myApplications).filter((a: any) => a.status === 'pending').length.toString(), icon: <Clock size={18} />, color: 'text-amber-600' },
            { label: 'Eligible', value: eligible === null ? '…' : eligible ? 'Yes' : 'No', icon: eligible ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />, color: eligible ? 'text-green-600' : 'text-red-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className={`${stat.color} mb-2`}>{stat.icon}</div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Eligibility warning */}
        {eligible === false && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 text-sm">You're not yet eligible to activate campaigns</p>
              <p className="text-sm text-amber-700 mt-1">To become an activator you need: a linked bank account + at least 1 completed platform activity (story view, survey, or challenge). Go to your wallet to add a bank account.</p>
            </div>
          </div>
        )}

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search campaigns or brands…"
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all ${category === cat ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* My active campaigns shortcut */}
        {Object.keys(myCampaigns).length > 0 && (
          <div>
            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-3">Your Active Campaigns</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {Object.values(myCampaigns).map((row: any) => {
                const camp = campaigns.find(c => c.id === row.campaign_id)
                if (!camp) return null
                return (
                  <button
                    key={row.campaign_id}
                    onClick={() => router.push(`/dashboard/activations/${row.campaign_id}`)}
                    className="flex-none bg-white border border-gray-200 rounded-2xl p-4 w-56 text-left hover:border-brand/40 hover:shadow-md transition-all group"
                  >
                    <p className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-brand">{camp.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{row.total_payments_count} sales · ₦{row.total_commission_earned.toLocaleString()} earned</p>
                    <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${row.dva_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {row.dva_status === 'active' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                      DVA {row.dva_status}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Campaigns grid */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={36} className="animate-spin text-brand" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200 space-y-4">
            <Store size={40} className="mx-auto text-gray-300" />
            <p className="font-bold text-gray-500">No campaigns found</p>
            <p className="text-sm text-gray-400">Try a different category or check back later</p>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">All Campaigns</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map(camp => {
                const joined = myCampaigns[camp.id]
                const applied = myApplications[camp.id]
                const commissionKobo = Math.floor(camp.price_kobo * (camp.commission_rate / 100))
                const atCap = camp.max_activators !== null && camp.active_activators >= camp.max_activators

                return (
                  <ActivationCampaignCard
                    key={camp.id}
                    campaign={camp}
                    joined={joined}
                    applied={applied}
                    atCap={atCap}
                    eligible={eligible ?? false}
                    joiningId={joiningId}
                    commissionKobo={commissionKobo}
                    fmt={fmt}
                    onJoin={() => handleJoin(camp.id, camp.campaign_mode)}
                    onView={() => router.push(`/dashboard/activations/${camp.id}`)}
                  />
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function ActivationCampaignCard({ campaign, joined, applied, atCap, eligible, joiningId, commissionKobo, fmt, onJoin, onView }: {
  campaign: any
  joined: any
  applied: any
  atCap: boolean
  eligible: boolean
  joiningId: string | null
  commissionKobo: number
  fmt: (kobo: number) => string
  onJoin: () => void
  onView: () => void
}) {
  const isJoining = joiningId === campaign.id
  const brand = campaign.profiles

  let actionButton: React.ReactNode

  if (joined) {
    actionButton = (
      <button onClick={onView} className="flex items-center gap-1.5 bg-brand text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand/90 transition-all">
        Manage <ChevronRight size={12} />
      </button>
    )
  } else if (applied) {
    actionButton = (
      <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
        applied.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
        applied.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
        'bg-red-50 text-red-700 border-red-200'
      }`}>
        {applied.status === 'pending' ? '⏳ Applied' : applied.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
      </div>
    )
  } else if (!eligible) {
    actionButton = (
      <button disabled className="flex items-center gap-1.5 bg-gray-100 text-gray-400 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
        <Lock size={12} /> Not Eligible
      </button>
    )
  } else if (atCap) {
    actionButton = (
      <span className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-400">Full</span>
    )
  } else {
    actionButton = (
      <button
        onClick={onJoin}
        disabled={isJoining}
        className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-60 ${
          campaign.campaign_mode === 'open'
            ? 'bg-gray-900 text-white hover:bg-brand shadow-gray-900/20'
            : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
        }`}
      >
        {isJoining ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
        {campaign.campaign_mode === 'open' ? 'Join Now' : 'Apply'}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand/30 transition-all group flex flex-col relative overflow-hidden p-6">
      <div className="absolute top-0 right-0 w-28 h-28 bg-brand/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-brand/10 transition-colors" />

      {/* Brand row */}
      <div className="flex items-center gap-3 mb-5 relative z-10">
        <div className="h-10 w-10 rounded-xl overflow-hidden border border-gray-100 shadow-sm shrink-0">
          <img
            src={brand?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(brand?.full_name ?? 'B')}&background=random`}
            className="h-full w-full object-cover"
            alt=""
          />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-none truncate">{brand?.full_name ?? 'Brand'}</p>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 truncate">@{brand?.username}</p>
        </div>
        <div className="ml-auto shrink-0">
          <ModeTag mode={campaign.campaign_mode} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2 mb-5 relative z-10">
        <h3 className="text-base font-black text-gray-900 leading-tight group-hover:text-brand transition-colors line-clamp-2">
          {campaign.title}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{campaign.description}</p>

        {campaign.learn_more_url && (
          <a
            href={campaign.learn_more_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-brand hover:underline"
          >
            <ExternalLink size={10} /> Learn more
          </a>
        )}

        <div className="flex items-center gap-2 pt-1">
          <div className="flex items-center gap-1 text-gray-400 text-[10px] font-semibold capitalize">
            <FulfilmentIcon type={campaign.fulfilment_type} />
            {campaign.fulfilment_type.replace('_', ' ')}
          </div>
          <span className="text-gray-300">·</span>
          <div className="flex items-center gap-1 text-gray-400 text-[10px] font-semibold capitalize">
            {campaign.category}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-5 border-t border-gray-50 flex items-center justify-between relative z-10">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-lg font-black text-gray-900">{fmt(commissionKobo)}</p>
            <span className="text-[10px] font-black text-green-600 uppercase tracking-tighter bg-green-50 px-1.5 py-0.5 rounded-lg">per sale</span>
          </div>
          <p className="text-[10px] text-gray-400">
            {fmt(campaign.price_kobo)} price · {campaign.commission_rate}% commission
            {campaign.max_activators ? ` · ${campaign.active_activators}/${campaign.max_activators} activators` : ''}
          </p>
        </div>
        {actionButton}
      </div>
    </div>
  )
}
