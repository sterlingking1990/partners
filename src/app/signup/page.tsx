'use client'

import { Suspense, useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Lock, Mail, User, AtSign, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

function SignUpPageContent() {
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<{ checking: boolean; available: boolean | null; message: string }>({ checking: false, available: null, message: '' })
  const [hubCode, setHubCode] = useState('')
  const [hubInfo, setHubInfo] = useState<any>(null)
  const [checkingHub, setCheckingHub] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const supabase = createClient()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    username: '',
  })

  // Debounced username availability check
  useEffect(() => {
    const raw = formData.username.trim()
    if (raw.length < 3) {
      setUsernameStatus({ checking: false, available: null, message: '' })
      return
    }
    const timer = setTimeout(async () => {
      if (raw.toLowerCase().includes('brandible')) {
        setUsernameStatus({ checking: false, available: false, message: 'This username is reserved' })
        return
      }
      setUsernameStatus(prev => ({ ...prev, checking: true }))
      const { data } = await supabase.from('profiles').select('username').eq('username', raw.toLowerCase()).maybeSingle()
      setUsernameStatus({
        checking: false,
        available: !data,
        message: data ? 'Username is already taken' : 'Username is available',
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [formData.username])

  // Debounced hub code lookup
  useEffect(() => {
    const code = hubCode.trim()
    if (code.length < 3) { setHubInfo(null); return }
    const timer = setTimeout(async () => {
      setCheckingHub(true)
      const { data } = await supabase.rpc('get_hub_by_code', { p_code: code })
      setHubInfo(data && data.length > 0 ? data[0] : null)
      setCheckingHub(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [hubCode])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    if (e.target.name === 'username') value = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setFormData({ ...formData, [e.target.name]: value })
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (usernameStatus.available === false) {
      setError('Please choose a different username')
      return
    }
    if (usernameStatus.checking) {
      setError('Please wait while we check your username')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            username: formData.username.toLowerCase(),
            user_type: 'influencer',
            referral_code: hubCode.trim() || null,
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Signup failed')

      router.push('/login?verified=pending')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
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
            Your audience<br />is your<br /><span className="text-brand">superpower.</span>
          </h1>
          <p className="text-white/50 mt-6 text-lg leading-relaxed max-w-sm">
            Create your free account and start earning coins from brands that want to reach your community.
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
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12 overflow-y-auto">
        <div className="max-w-md w-full space-y-8">
          <div className="lg:hidden flex justify-center mb-4">
            <div className="h-14 w-14 overflow-hidden rounded-2xl">
              <img src="/logo.png" alt="Brandible" className="h-full w-full object-contain" />
            </div>
          </div>
        <div className="text-center">
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-2xl mb-4">
             <img src="/logo.png" alt="brandible" className="h-full w-full object-contain" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Start Earning</h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your influencer account and join the community
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2) } : handleSignUp}>
          {step === 1 ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  name="email"
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  placeholder="Password (min. 6 characters)"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white brand-gradient hover:opacity-90 transition-all"
              >
                Next Step
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  name="fullName"
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <div className="relative">
                  <AtSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    name="username"
                    type="text"
                    required
                    minLength={3}
                    className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all ${
                      usernameStatus.available === true ? 'border-green-400 bg-green-50' :
                      usernameStatus.available === false ? 'border-red-400 bg-red-50' :
                      'border-gray-300'
                    }`}
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleChange}
                  />
                  <div className="absolute right-3 top-3">
                    {usernameStatus.checking && <Loader2 size={20} className="animate-spin text-gray-400" />}
                    {!usernameStatus.checking && usernameStatus.available === true && <CheckCircle2 size={20} className="text-green-500" />}
                    {!usernameStatus.checking && usernameStatus.available === false && <XCircle size={20} className="text-red-500" />}
                  </div>
                </div>
                {usernameStatus.message && (
                  <p className={`mt-1 text-xs font-medium ${usernameStatus.available ? 'text-green-600' : 'text-red-600'}`}>
                    {usernameStatus.message}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Hub Code <span className="font-normal normal-case text-gray-400">(Optional)</span></label>
                <input
                  type="text"
                  value={hubCode}
                  onChange={e => setHubCode(e.target.value.toUpperCase())}
                  placeholder="Enter code to join a community"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                />
                {checkingHub && <p className="mt-1 text-xs text-gray-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Looking up community...</p>}
                {hubInfo && (
                  <div className="mt-2 p-3 bg-brand/5 border border-brand/20 rounded-lg">
                    <p className="text-xs font-black text-brand uppercase tracking-widest">Joining Hub</p>
                    <p className="font-bold text-gray-900 mt-0.5">{hubInfo.hub_name}</p>
                    <p className="text-xs text-gray-500">Managed by {hubInfo.owner_username}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 border border-gray-300 text-sm font-semibold rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white brand-gradient hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
            className="font-semibold text-brand hover:text-brand-dark transition-colors"
          >
            Sign in
          </Link>
        </p>
        </div>
      </div>
    </div>
  )

}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpPageContent />
    </Suspense>
  )
}
