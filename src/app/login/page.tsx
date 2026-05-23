'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Lock, Mail, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const verifiedPending = searchParams.get('verified') === 'pending'
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left: Hero Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 relative overflow-hidden flex-col justify-between p-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand/40 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand/20 rounded-full blur-3xl -ml-32 -mb-32" />
        <div className="relative z-10">
          <div className="h-12 w-12 overflow-hidden rounded-2xl mb-12">
            <img src="/logo.png" alt="Brandible" className="h-full w-full object-contain" />
          </div>
          <p className="text-brand font-black text-xs uppercase tracking-[0.3em] mb-6">Brandible Member</p>
          <h1 className="text-5xl font-black text-white leading-[1.1]">
            Shop brands you love<br /><span className="text-brand">&mdash; get rewarded.</span>
          </h1>
          <p className="text-white/50 mt-8 text-base leading-relaxed max-w-sm">
            Brandible is a buying community. Discover products from brands you love, earn coins through their activities, and spend them on more of what you want.
          </p>
        </div>
        <div className="relative z-10 space-y-6">
          {[
            { icon: '\ud83d\udecd\ufe0f', title: 'Buy from brands you love', desc: 'Discover products from real brands inside your hub and buy directly.' },
            { icon: '\ud83e\ude99', title: 'Earn while you engage', desc: 'Complete status views, surveys, challenges, and games to earn Brandible Coins.' },
            { icon: '\ud83c\udfaf', title: 'Join the right community', desc: 'Hubs connect you to brands that actually match what you care about.' },
            { icon: '\ud83c\udfc6', title: 'Own a hub, earn commission', desc: 'Build a hub community and earn a fee every time a brand targets your members.' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center text-lg flex-shrink-0">{item.icon}</div>
              <div>
                <p className="text-white font-bold text-sm">{item.title}</p>
                <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="relative z-10 pt-8 border-t border-white/10">
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest">&ldquo;Where buyers and brands build something real.&rdquo;</p>
        </div>
      </div>

      {/* Mobile Hero — visible only on small screens */}
      <div className="lg:hidden bg-gray-900 relative overflow-hidden px-8 pt-12 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand/40 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand/20 rounded-full blur-3xl -ml-20 -mb-20" />
        <div className="relative z-10">
          {/* Logo + label */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 overflow-hidden rounded-xl flex-shrink-0">
              <img src="/logo.png" alt="Brandible" className="h-full w-full object-contain" />
            </div>
            <p className="text-brand font-black text-xs uppercase tracking-[0.25em]">Brandible Member</p>
          </div>

          {/* Headline */}
          <h1 className="text-3xl font-black text-white leading-[1.15] mb-4">
            Shop brands you love<br />
            <span className="text-brand">&mdash; and get rewarded.</span>
          </h1>

          {/* Description */}
          <p className="text-white/50 text-sm leading-relaxed mb-8">
            Brandible is a buying community. Discover products, engage with brand activities, and earn coins — all inside your hub.
          </p>

          {/* Feature pills */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🛍️', text: 'Shop brands you love' },
              { icon: '🪙', text: 'Earn coins for activities' },
              { icon: '🎯', text: 'Join the right hub' },
              { icon: '🏆', text: 'Own a hub, earn commission' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-3">
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <p className="text-white/70 text-xs font-semibold leading-tight">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-500">Sign in to your member account</p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {verifiedPending && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                Account created! Please check your email to verify your account, then sign in below.
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white brand-gradient hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600">
            New member?{' '}
            <Link
              href={redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'}
              className="font-semibold text-brand hover:text-brand-dark transition-colors"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )

}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  )
}
