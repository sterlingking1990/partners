'use client'

import { useState, useEffect, use } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Copy,
  CheckCircle2,
  Loader2,
  Zap,
  Link2,
  KeyRound,
  Download,
  ShieldCheck,
  AlertTriangle,
  Shield,
  MessageCircle,
  Webhook,
  ArrowRight,
  User,
  Mail,
  Phone,
} from 'lucide-react'

const WHATSAPP_NUMBER = '+2349015694190'

// Shape of a brand-defined custom field
interface RequiredField {
  key: string
  label: string
  type: 'text' | 'email' | 'tel' | 'select' | 'number'
  options?: string[]          // for type=select
  required?: boolean
  placeholder?: string
}

function FulfilmentDescription({ type, config }: { type: string; config: Record<string, unknown> }) {
  switch (type) {
    case 'redirect':
      return <><Link2 size={14} className="shrink-0 mt-0.5" /> You'll receive a link to access your product via email immediately after payment.</>
    case 'access_code':
      return <><KeyRound size={14} className="shrink-0 mt-0.5" /> You'll receive a unique access code via email immediately after payment.</>
    case 'file_download':
      return <><Download size={14} className="shrink-0 mt-0.5" /> You'll receive a download link via email immediately after payment (valid 72 hours).</>
    case 'credentials':
      return <><ShieldCheck size={14} className="shrink-0 mt-0.5" /> You'll receive login credentials via email immediately after payment.</>
    case 'brand_webhook': {
      const msg = config.customer_message as string | undefined
      return <><Webhook size={14} className="shrink-0 mt-0.5" /> {msg ?? 'Your subscription will be activated automatically after payment confirmation.'}</>
    }
    default:
      return <><Zap size={14} className="shrink-0 mt-0.5" /> Your product will be delivered via email immediately after payment.</>
  }
}

export default function PublicActivationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = use(params)
  const searchParams = useSearchParams()
  const referrerId = searchParams.get('ref')
  const supabase = createClient()

  const [campaign, setCampaign] = useState<any>(null)
  const [activatorRow, setActivatorRow] = useState<any>(null)
  const [brand, setBrand] = useState<any>(null)
  const [fulfilmentConfig, setFulfilmentConfig] = useState<Record<string, unknown>>({})
  const [requiredFields, setRequiredFields] = useState<RequiredField[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Contact capture form state
  const [formStep, setFormStep] = useState<'contact' | 'payment'>('contact')
  const [contactForm, setContactForm] = useState<Record<string, string>>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
  })
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const [submittingContact, setSubmittingContact] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [campaignId, referrerId])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const { data: campData, error: campError } = await supabase
        .from('activation_campaigns')
        .select('id, title, description, category, fulfilment_type, fulfilment_config, price_kobo, status, verification_status, profiles:brand_id(full_name, username, avatar_url)')
        .eq('id', campaignId)
        .eq('status', 'active')
        .eq('verification_status', 'approved')
        .single()

      if (campError || !campData) { setError('This campaign is not available.'); return }

      setCampaign(campData)
      setBrand(campData.profiles)

      const config = (campData.fulfilment_config ?? {}) as Record<string, unknown>
      setFulfilmentConfig(config)

      // Parse brand-defined required fields
      const fields = (config.required_fields as RequiredField[] | undefined) ?? []
      setRequiredFields(fields)

      // For non-webhook campaigns, skip the contact form and show payment directly
      if (campData.fulfilment_type !== 'brand_webhook') {
        setFormStep('payment')
      }

      if (referrerId) {
        const { data: row } = await supabase
          .from('activation_campaign_activators')
          .select('id, activator_id, dva_account_number, dva_bank_name, dva_account_name, dva_status')
          .eq('campaign_id', campaignId)
          .eq('activator_id', referrerId)
          .eq('dva_status', 'active')
          .maybeSingle()
        setActivatorRow(row)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    setContactError(null)

    if (!contactForm.customer_email) { setContactError('Email is required'); return }
    if (!contactForm.customer_phone) { setContactError('Phone number is required'); return }

    // Validate required custom fields
    for (const field of requiredFields) {
      if (field.required && !customFieldValues[field.key]) {
        setContactError(`${field.label} is required`)
        return
      }
    }

    if (!activatorRow?.dva_account_number) { setContactError('Payment account not ready — please refresh.'); return }

    setSubmittingContact(true)
    try {
      const { error: insertError } = await supabase
        .from('pending_activation_customers')
        .insert({
          campaign_id: campaignId,
          activator_id: referrerId,
          dva_account_number: activatorRow.dva_account_number,
          customer_email: contactForm.customer_email.trim().toLowerCase(),
          customer_phone: contactForm.customer_phone.trim(),
          customer_name: contactForm.customer_name.trim() || null,
          extra_fields: customFieldValues,
        })

      if (insertError) throw insertError
      setFormStep('payment')
    } catch (e: any) {
      setContactError(e.message)
    } finally {
      setSubmittingContact(false)
    }
  }

  function copy(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field)
      setTimeout(() => setCopied(null), 2500)
    })
  }

  const fmt = (kobo: number) =>
    `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`

  const inputClass = 'w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/50 focus:border-[#d4a574]/50'
  const labelClass = 'block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1.5'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0817] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#d4a574]" />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-[#0f0817] flex flex-col items-center justify-center p-6 text-center gap-4">
        <AlertTriangle size={40} className="text-[#d4a574]" />
        <h1 className="text-xl font-bold text-white">Campaign Unavailable</h1>
        <p className="text-white/60 max-w-sm">{error ?? 'This campaign is no longer active.'}</p>
        <a href="/" className="mt-4 text-[#d4a574] text-sm font-semibold hover:underline">Return to Brandible →</a>
      </div>
    )
  }

  const hasDVA = !!activatorRow?.dva_account_number
  const price = fmt(campaign.price_kobo)
  const isBrandWebhook = campaign.fulfilment_type === 'brand_webhook'

  return (
    <div className="min-h-screen bg-[#0f0817] text-white">

      {/* Top bar */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="font-black tracking-[0.3em] text-[#d4a574] text-sm">BRANDIBLE</span>
        <div className="flex items-center gap-1.5 bg-green-900/30 border border-green-800/50 px-2.5 py-1 rounded-full">
          <Shield size={12} className="text-green-400" />
          <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Verified Campaign</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
            <img
              src={brand?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(brand?.full_name ?? 'B')}&background=random`}
              className="h-full w-full object-cover"
              alt=""
            />
          </div>
          <div>
            <p className="font-bold text-white">{brand?.full_name}</p>
            <p className="text-xs text-white/40">@{brand?.username}</p>
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h1 className="text-2xl font-black text-white leading-tight mb-3">{campaign.title}</h1>
          <p className="text-white/70 text-sm leading-relaxed">{campaign.description}</p>
        </div>

        {/* What you get */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#d4a574] mb-2">What you get</p>
          <div className="flex items-start gap-2 text-sm text-white/80">
            <FulfilmentDescription type={campaign.fulfilment_type} config={fulfilmentConfig} />
          </div>
        </div>

        {/* Price */}
        <div className="text-center py-2">
          <p className="text-4xl font-black text-white">{price}</p>
          <p className="text-white/40 text-sm mt-1">one-time payment</p>
        </div>

        {/* ── STEP 1: Contact form (brand_webhook campaigns) ── */}
        {isBrandWebhook && formStep === 'contact' && (
          <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#d4a574] mb-4">Your details</p>
            <p className="text-xs text-white/50 mb-5">We need these to activate your subscription after payment.</p>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              {/* Always-present fields */}
              <div>
                <label className={labelClass}>Full Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={contactForm.customer_name}
                    onChange={e => setContactForm(f => ({ ...f, customer_name: e.target.value }))}
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email Address <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={contactForm.customer_email}
                    onChange={e => setContactForm(f => ({ ...f, customer_email: e.target.value }))}
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Phone Number <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="tel"
                    required
                    placeholder="08012345678"
                    value={contactForm.customer_phone}
                    onChange={e => setContactForm(f => ({ ...f, customer_phone: e.target.value }))}
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>

              {/* Dynamic brand-defined fields */}
              {requiredFields.map(field => (
                <div key={field.key}>
                  <label className={labelClass}>
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      required={field.required}
                      value={customFieldValues[field.key] ?? ''}
                      onChange={e => setCustomFieldValues(v => ({ ...v, [field.key]: e.target.value }))}
                      className={`${inputClass} appearance-none`}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      required={field.required}
                      placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                      value={customFieldValues[field.key] ?? ''}
                      onChange={e => setCustomFieldValues(v => ({ ...v, [field.key]: e.target.value }))}
                      className={inputClass}
                    />
                  )}
                </div>
              ))}

              {contactError && (
                <div className="flex items-center gap-2 text-red-400 text-xs p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertTriangle size={14} className="shrink-0" /> {contactError}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingContact || !hasDVA}
                className="w-full py-4 bg-[#d4a574] text-[#0f0817] font-black rounded-2xl text-sm flex items-center justify-center gap-2 hover:bg-[#c89860] disabled:opacity-50 transition-all"
              >
                {submittingContact
                  ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                  : <>{hasDVA ? <>Continue to Payment <ArrowRight size={16} /></> : 'Payment account loading…'}</>}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2: DVA payment block ── */}
        {formStep === 'payment' && (
          <>
            {!hasDVA ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-3">
                <Loader2 size={24} className="mx-auto text-[#d4a574] animate-spin" />
                <p className="text-white/70 text-sm">Payment account loading…</p>
                <p className="text-white/40 text-xs">If this persists, contact support below.</p>
              </div>
            ) : (
              <div className="bg-white/5 border border-[#d4a574]/30 rounded-[1.5rem] p-6 space-y-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#d4a574] mb-3">Pay to this account</p>
                  <div className="space-y-3">
                    {[
                      { label: 'Bank', value: activatorRow.dva_bank_name ?? 'Titan Trust Bank', field: 'bank' },
                      { label: 'Account Number', value: activatorRow.dva_account_number, field: 'account' },
                      { label: 'Account Name', value: activatorRow.dva_account_name, field: 'name' },
                      { label: 'Amount', value: price, field: 'amount' },
                    ].map(row => (
                      <div key={row.field} className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] text-white/40 uppercase tracking-wider">{row.label}</p>
                          <p className="text-white font-bold mt-0.5 font-mono text-sm">{row.value}</p>
                        </div>
                        <button
                          onClick={() => copy(row.value, row.field)}
                          className="shrink-0 flex items-center gap-1 text-[#d4a574] hover:text-white transition-colors text-[10px] font-bold"
                        >
                          {copied === row.field ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                          {copied === row.field ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2">
                  <p className="text-xs font-black text-white/70">How to pay:</p>
                  <ol className="space-y-1.5 text-xs text-white/60 list-decimal list-inside leading-relaxed">
                    <li>Open your banking app and go to <span className="text-white font-semibold">Transfer</span></li>
                    <li>Select <span className="text-white font-semibold">{activatorRow.dva_bank_name ?? 'Titan Trust Bank'}</span> as the bank</li>
                    <li>Enter account number <span className="font-mono text-white font-semibold">{activatorRow.dva_account_number}</span></li>
                    <li>Transfer exactly <span className="text-white font-semibold">{price}</span></li>
                    <li>
                      {isBrandWebhook
                        ? (fulfilmentConfig.customer_message as string ?? 'Your subscription will activate within minutes')
                        : 'Your product will be sent to your email within seconds'}
                    </li>
                  </ol>
                </div>

                <div className="bg-[#d4a574]/10 border border-[#d4a574]/20 rounded-xl p-3">
                  <p className="text-xs text-[#d4a574] font-semibold">✓ Payments processed and verified by Brandible. Your product is delivered automatically after confirmation.</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Support */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I need help with the ${campaign.title} activation campaign on Brandible.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            <MessageCircle size={14} />
            Need help? Chat us on WhatsApp
          </a>
        </div>

        <p className="text-center text-[10px] text-white/20 pb-4">
          This campaign is verified and powered by Brandible · brandiblebms.com
        </p>
      </div>
    </div>
  )
}
