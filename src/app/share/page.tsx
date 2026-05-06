'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const REFERRAL_STORAGE_KEY = 'pending_referral'

type ReferralPayload = {
  mediaId: string
  referrerId: string
  statusId: string
  brandId?: string | null
  brandPhone?: string | null
  timestamp: number
  redirectUrl: string
}

type ReferralResult = {
  success: boolean
  message?: string
  reward_amount?: number
  error_code?: string
}

function savePendingReferral(referral: ReferralPayload) {
  try {
    window.localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(referral))
  } catch (error) {
    console.warn('Unable to save pending referral', error)
  }
}

function removePendingReferral() {
  try {
    window.localStorage.removeItem(REFERRAL_STORAGE_KEY)
  } catch (error) {
    console.warn('Unable to remove pending referral', error)
  }
}

function SharePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'processing' | 'success' | 'error' | 'missing'>('loading')
  const [message, setMessage] = useState('Checking your share link...')
  const [rewardAmount, setRewardAmount] = useState<number | null>(null)
  const [referrerId, setReferrerId] = useState<string | null>(null)
  const [mediaId, setMediaId] = useState<string | null>(null)

  useEffect(() => {
    const media_id = searchParams.get('media_id')
    const referrer_id = searchParams.get('referrer_id')
    const status_id = searchParams.get('status_id')
    const brand_id = searchParams.get('brand_id')
    const brand_phone = searchParams.get('brand_phone')
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '/'

    if (!media_id || !referrer_id || !status_id) {
      setStatus('missing')
      setMessage('Missing required share parameters. Please open the link again or contact support.')
      return
    }

    setReferrerId(referrer_id)
    setMediaId(media_id)

    const referralPayload: ReferralPayload = {
      mediaId: media_id,
      referrerId: referrer_id,
      statusId: status_id,
      brandId: brand_id,
      brandPhone: brand_phone,
      timestamp: Date.now(),
      redirectUrl: currentUrl,
    }

    const supabase = createClient()

    async function handleSharePage() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          savePendingReferral(referralPayload)
          setStatus('redirecting')
          const redirect = encodeURIComponent(currentUrl)
          router.push(`/login?redirect=${redirect}`)
          return
        }

        setStatus('processing')
        setMessage('Processing your referral reward...')

        const { data, error } = await supabase.rpc('process_referral', {
          p_referrer_id: referrer_id,
          p_media_id: media_id,
        })

        if (error) {
          console.error('Referral RPC error', error)
          setStatus('error')
          setMessage('Unable to process the referral reward. Please try again later.')
          return
        }

        const result = data as ReferralResult
        if (!result.success) {
          if (result.error_code === 'NOT_AUTHENTICATED') {
            savePendingReferral(referralPayload)
            const redirect = encodeURIComponent(currentUrl)
            router.push(`/login?redirect=${redirect}`)
            return
          }

          setStatus('error')
          setMessage(result.message || 'The referral could not be processed.')
          return
        }

        setRewardAmount(result.reward_amount ?? null)
        setStatus('success')
        setMessage(result.message ?? 'Referral processed successfully!')
        removePendingReferral()
      } catch (error) {
        console.error('Share page processing error', error)
        setStatus('error')
        setMessage('An unexpected error occurred while processing the reward.')
      }
    }

    handleSharePage()
  }, [router, searchParams])

  const renderBody = () => {
    switch (status) {
      case 'loading':
        return <p className="text-sm text-gray-600">{message}</p>
      case 'redirecting':
        return <p className="text-sm text-gray-600">Redirecting you to sign in so you can claim your reward...</p>
      case 'processing':
        return <p className="text-sm text-gray-600">{message}</p>
      case 'success':
        return (
          <div className="space-y-4 text-center">
            <p className="text-lg font-semibold text-green-700">{message}</p>
            {rewardAmount != null && (
              <p className="text-4xl font-bold text-brand">+₦{rewardAmount.toFixed(2)}</p>
            )}
            <p className="text-sm text-gray-600">Thanks for joining Brandible. Your reward has been added to your wallet.</p>
          </div>
        )
      case 'missing':
      case 'error':
        return <p className="text-sm text-red-600">{message}</p>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl glass-card p-10 rounded-3xl shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Claim your reward</h1>
          <p className="mt-2 text-gray-600">Brandible is checking your shared reward link now.</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          {renderBody()}
          {(status === 'error' || status === 'missing') && (
            <div className="mt-6 text-center">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
                onClick={() => router.push('/')}
              >
                Return to Brandible
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SharePage() {
  return (
    <Suspense>
      <SharePageContent />
    </Suspense>
  )
}
