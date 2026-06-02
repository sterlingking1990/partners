'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  ArrowLeft,
  Zap,
  Copy,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  TrendingUp,
  CreditCard,
  Share2,
  RefreshCw,
  Link2,
  KeyRound,
  Download,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import Toast from '@/components/Toast'

interface ActivatorRow {
  id: string
  campaign_id: string
  activator_id: string
  dva_account_number: string | null
  dva_bank_name: string | null
  dva_account_name: string | null
  dva_status: string
  total_payments_count: number
  total_commission_earned: number
  status: string
  joined_at: string
}

interface Campaign {
  id: string
  title: string
  description: string
  category: string
  fulfilment_type: string
  campaign_mode: string
  price_kobo: number
  commission_rate: number
  status: string
  learn_more_url: string | null
  profiles: { full_name: string; username: string; avatar_url: string | null }
}

interface Payment {
  id: string
  customer_email: string
  amount_kobo: number
  commission_kobo: number | null
  fulfilment_status: string
  status: string
  created_at: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://partners.brandiblebms.com'

export default function ActivatorCampaignPage({ params }: { params: { id: string } }) {
  const { id: campaignId } = params
  const router = useRouter()
  const supabase = createClient()

  const [activatorRow, setActivatorRow] = useState<ActivatorRow | null>(null)
  const [application, setApplication] = useState<any>(null)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadData() }, [campaignId])

  async function loadData() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }
      setUser(authUser)

      const [campRes, rowRes, appRes, paymentsRes] = await Promise.all([
        supabase
          .from('activation_campaigns')
          .select('id, title, description, category, fulfilment_type, campaign_mode, price_kobo, commission_rate, status, learn_more_url, profiles:brand_id(full_name, username, avatar_url)')
          .eq('id', campaignId)
          .single(),
        supabase
          .from('activation_campaign_activators')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('activator_id', authUser.id)
          .maybeSingle(),
        supabase
          .from('activation_applications')
          .select('id, status, brand_notes, applied_at')
          .eq('campaign_id', campaignId)
          .eq('activator_id', authUser.id)
          .maybeSingle(),
        supabase
          .from('activation_payments')
          .select('id, customer_email, amount_kobo, commission_kobo, fulfilment_status, status, created_at')
          .eq('campaign_id', campaignId)
          .eq('activator_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      setCampaign(campRes.data as any)
      setActivatorRow(rowRes.data as any)
      setApplication(appRes.data)
      setPayments(paymentsRes.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function refreshDVA() {
    if (!activatorRow) return
    setRefreshing(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-activator-dva', {
        body: { campaign_activator_id: activatorRow.id },
      })
      if (error) throw error
      setToastMessage('DVA setup triggered — refresh the page in a moment.')
      setShowToast(true)
      await loadData()
    } catch (e: any) {
      setToastMessage(`Error: ${e.message}`)
      setShowToast(true)
    } finally {
      setRefreshing(false)
    }
  }

  function copy(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    })
  }

  const shareUrl = user ? `${SITE_URL}/activate/${campaignId}?ref=${user.id}` : ''
  const fmt = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`

  async function handleShare() {
    const text = `Get ${campaign?.title ?? 'this product'} — pay directly to my account and receive access instantly.\n\n${shareUrl}`
    if (navigator.share) {
      await navigator.share({ title: campaign?.title, text, url: shareUrl })
    } else {
      copy(shareUrl, 'shareUrl')
      setToastMessage('Campaign link copied!')
      setShowToast(true)
    }
  }

  function FulfilmentIcon() {
    switch (campaign?.fulfilment_type) {
      case 'redirect':      return <Link2 size={16} />
      case 'access_code':   return <KeyRound size={16} />
      case 'file_download': return <Download size={16} />
      case 'credentials':   return <ShieldCheck size={16} />
      default:              return <Zap size={16} />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Campaign not found</p>
      </div>
    )
  }

  const brand = campaign.profiles as any
  const commissionKobo = Math.floor(campaign.price_kobo * (campaign.commission_rate / 100))
  const dvaPending = !activatorRow || activatorRow.dva_status === 'pending'
  const dvaFailed = activatorRow?.dva_status === 'failed'
  const dvaActive = activatorRow?.dva_status === 'active'

  // Show application status for curated campaigns that haven't been approved yet
  const showApplicationStatus = campaign.campaign_mode === 'curated' && !activatorRow

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />

      <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-4 px-4 md:px-8 sticky top-0 z-10">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-semibold text-gray-800 truncate">{campaign.title}</h1>
      </header>

      <main className="p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6">

        {/* Campaign info */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl overflow-hidden border border-gray-100 shrink-0">
              <img src={brand?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(brand?.full_name ?? 'B')}&background=random`} className="h-full w-full object-cover" alt="" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900">{brand?.full_name}</p>
              <p className="text-xs text-gray-500 capitalize flex items-center gap-1.5">
                <FulfilmentIcon /> {campaign.fulfilment_type.replace('_', ' ')} · {campaign.category}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{campaign.description}</p>
          {campaign.learn_more_url && (
            <a
              href={campaign.learn_more_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              <ExternalLink size={14} /> Learn more about this campaign
            </a>
          )}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Customer Price', value: fmt(campaign.price_kobo) },
              { label: 'Your Commission', value: fmt(commissionKobo) },
              { label: 'Rate', value: `${campaign.commission_rate}%` },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-base font-black text-gray-900">{stat.value}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Application status — curated, not yet approved */}
        {showApplicationStatus && application && (
          <div className={`rounded-2xl border p-5 ${
            application.status === 'pending' ? 'bg-amber-50 border-amber-200' :
            application.status === 'rejected' ? 'bg-red-50 border-red-200' :
            'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {application.status === 'pending' ? <Clock size={16} className="text-amber-600" /> :
               application.status === 'rejected' ? <AlertTriangle size={16} className="text-red-600" /> :
               <CheckCircle2 size={16} className="text-green-600" />}
              <p className="font-bold text-sm capitalize">{application.status === 'pending' ? 'Application Pending' : application.status === 'rejected' ? 'Application Rejected' : 'Application Approved'}</p>
            </div>
            {application.brand_notes && <p className="text-sm text-gray-600 mt-1">{application.brand_notes}</p>}
            {application.status === 'pending' && <p className="text-xs text-gray-500 mt-1">The brand is reviewing your application. You'll receive a notification once reviewed.</p>}
          </div>
        )}

        {/* DVA section */}
        {activatorRow && (
          <>
            {dvaPending && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
                <Loader2 size={18} className="text-blue-600 animate-spin shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-blue-900 text-sm">Setting up your account…</p>
                  <p className="text-sm text-blue-700 mt-1">Your dedicated virtual account is being created. This usually takes a few seconds.</p>
                  <button onClick={refreshDVA} disabled={refreshing} className="mt-2 text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline disabled:opacity-50">
                    <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Retry setup
                  </button>
                </div>
              </div>
            )}

            {dvaFailed && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-red-900 text-sm">Account setup failed</p>
                  <p className="text-sm text-red-700 mt-1">We couldn't set up your dedicated account. Please retry or contact support.</p>
                  <button onClick={refreshDVA} disabled={refreshing} className="mt-2 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
                    {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Retry
                  </button>
                </div>
              </div>
            )}

            {dvaActive && activatorRow.dva_account_number && (
              <>
                {/* DVA card — the main action area */}
                <div className="bg-[#0f0817] rounded-[2rem] p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-brand/10 rounded-full blur-3xl -mr-12 -mt-12" />
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand mb-5">Your Activation Account</p>
                    <div className="mb-2">
                      <p className="text-3xl font-mono font-black tracking-[0.15em] mb-1">{activatorRow.dva_account_number}</p>
                      <p className="text-sm text-white/60">{activatorRow.dva_bank_name ?? 'Titan Trust Bank'}</p>
                      <p className="text-xs text-white/40 mt-0.5">{activatorRow.dva_account_name}</p>
                    </div>
                    <div className="flex gap-2 mt-5">
                      <button
                        onClick={() => copy(activatorRow.dva_account_number!, 'account')}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                      >
                        {copiedField === 'account' ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copiedField === 'account' ? 'Copied!' : 'Copy Account'}
                      </button>
                      <button
                        onClick={handleShare}
                        className="flex items-center gap-2 bg-brand hover:bg-brand/90 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand/20"
                      >
                        <Share2 size={14} /> Share Campaign
                      </button>
                    </div>
                  </div>
                </div>

                {/* Share link */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Your Campaign Link</p>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <p className="text-xs text-gray-600 font-mono flex-1 truncate">{shareUrl}</p>
                    <button onClick={() => { copy(shareUrl, 'link'); setToastMessage('Link copied!'); setShowToast(true) }} className="shrink-0 text-gray-400 hover:text-brand transition-colors">
                      {copiedField === 'link' ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-gray-400 hover:text-brand transition-colors">
                      <ExternalLink size={16} />
                    </a>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Share this link or your account number. Every payment that lands in your account earns you {campaign.commission_rate}% commission — automatically.</p>
                </div>

                {/* Earnings summary */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Total Sales', value: activatorRow.total_payments_count.toString(), icon: <CreditCard size={16} />, color: 'text-blue-600' },
                    { label: 'Commission Earned', value: `₦${activatorRow.total_commission_earned.toLocaleString()}`, icon: <TrendingUp size={16} />, color: 'text-green-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className={s.color}>{s.icon}</div>
                      <p className="text-2xl font-black text-gray-900 mt-2">{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Payment feed */}
        {activatorRow && payments.length > 0 && (
          <div className="bg-white rounded-[2rem] border border-gray-100">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Payment History</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {payments.map(p => (
                <div key={p.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {p.customer_email.replace(/(?<=.{3}).(?=.*@)/g, '*')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(p.created_at).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmt(p.amount_kobo)}</p>
                    {p.commission_kobo && <p className="text-xs text-green-600">+{fmt(p.commission_kobo)} earned</p>}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${p.fulfilment_status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.fulfilment_status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activatorRow && payments.length === 0 && dvaActive && (
          <div className="py-16 text-center bg-white rounded-[2rem] border border-dashed border-gray-200 space-y-3">
            <CreditCard size={36} className="mx-auto text-gray-300" />
            <p className="font-bold text-gray-500">No payments yet</p>
            <p className="text-sm text-gray-400">Share your campaign link or account number to start receiving payments.</p>
          </div>
        )}

      </main>
    </div>
  )
}
