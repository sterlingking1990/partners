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
          <p className="text-brand font-black text-xs uppercase tracking-[0.3em] mb-4">Brandible Influencer</p>
          <h1 className="text-5xl font-black text-white leading-tight">
            Turn your<br />influence into<br /><span className="text-brand">real income.</span>
          </h1>
          <p className="text-white/50 mt-6 text-lg leading-relaxed max-w-sm">
            Join thousands of creators earning coins by viewing content, completing challenges, and representing brands they love.
          </p>
        </div>
        <div className="relative z-10 space-y-6">
          {[
            { icon: '\ud83e\ude99', title: 'Earn Brandible Coins', desc: 'Get rewarded for every view, survey, and challenge you complete.' },
            { icon: '\ud83d\udecd\ufe0f', title: 'Shop with your coins', desc: 'Redeem coins for real products from top brands in the marketplace.' },
            { icon: '\ud83c\udfc6', title: 'Go Pro & get hired', desc: 'Build your reputation, get featured, and land private brand deals.' },
            { icon: '\ud83e\udd1d', title: 'Lead a community', desc: 'Own a hub, grow your audience, and earn a cut of every campaign.' },
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
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest">&ldquo;The platform that pays you to be yourself.&rdquo;</p>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="max-w-md w-full space-y-8">
          <div className="lg:hidden flex justify-center mb-4">
            <div className="h-14 w-14 overflow-hidden rounded-2xl">
              <img src="/logo.png" alt="Brandible" className="h-full w-full object-contain" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-500">Sign in to your influencer account</p>
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
            New influencer?{' '}
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
