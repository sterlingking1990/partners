'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Wallet, 
  Coins, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Plus, 
  CreditCard, 
  Building2, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  TrendingUp,
  Banknote,
  Send,
  ArrowRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

export default function WalletPage() {
  const [user, setUser] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  const [showCashoutModal, setShowCashoutModal] = useState(false)
  const [cashoutAmount, setCashoutAmount] = useState('')
  const [cashoutLimit, setCashoutLimit] = useState(1000)
  const [coinBaseValue, setCoinBaseValue] = useState(1.0) // 1 BC = 1 Naira approx for display
  
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

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

      // Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
      setUser(profile)

      // Fetch Transactions via RPC
      const { data: transData, error: transError } = await supabase.rpc('get_detailed_transactions', {
        p_user_id: authUser.id
      })
      if (!transError) setTransactions(transData || [])

      // Fetch Financial Settings
      const { data: settings } = await supabase.from('app_settings').select('key, value')
      const cashoutLimitSetting = settings?.find(s => s.key === 'cashout_limit')?.value?.limit
      if (cashoutLimitSetting) setCashoutLimit(cashoutLimitSetting)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCashout = async () => {
    const amount = parseFloat(cashoutAmount)
    if (isNaN(amount) || amount < cashoutLimit) {
      alert(`Minimum cashout is ${cashoutLimit} BC`)
      return
    }
    if (amount > user?.brandible_coins) {
      alert('Insufficient balance')
      return
    }

    setIsProcessing(true)
    try {
      const { error } = await supabase.rpc('request_cashout', {
        p_user_id: user.id,
        p_amount: amount,
        p_description: `Web Cashout Request: ${amount} BC`
      })

      if (error) throw error

      setToastMessage('Cashout requested successfully!')
      setShowToast(true)
      setShowCashoutModal(false)
      setCashoutAmount('')
      fetchData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
         <Loader2 className="animate-spin text-brand" size={40} />
         <p className="text-gray-500 font-bold uppercase tracking-widest mt-4 text-[10px]">Accessing Vault...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Wallet className="text-brand" size={20} />
          <h1 className="text-lg font-semibold text-gray-800">My Wallet</h1>
        </div>
      </header>

      <main className="p-8 max-w-5xl mx-auto w-full space-y-8">
        {/* Balance Card */}
        <div className="brand-gradient rounded-[2.5rem] p-10 text-white shadow-2xl shadow-brand/20 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-110" />
           <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Available Balance</p>
                 <div className="flex items-baseline gap-3">
                    <h2 className="text-5xl font-black">{user?.brandible_coins?.toLocaleString() || 0}</h2>
                    <span className="text-xl font-bold opacity-60">BC</span>
                 </div>
                 <p className="mt-4 text-sm font-medium opacity-80 flex items-center gap-2">
                    <TrendingUp size={16} />
                    Est. value: ₦{(user?.brandible_coins * coinBaseValue).toLocaleString()}
                 </p>
              </div>
              <div className="flex gap-4">
                 <button 
                   onClick={() => setShowCashoutModal(true)}
                   className="px-8 py-4 bg-white text-brand font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
                 >
                    Withdraw
                 </button>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Transactions List */}
           <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <History size={20} className="text-brand" />
                    Transaction History
                 </h3>
              </div>
              
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                 {transactions.length > 0 ? (
                   <div className="divide-y divide-gray-50">
                      {transactions.map((tx) => {
                        const isIncome = ['earned', 'reward', 'challenge_reward', 'achievement_reward', 'referral_reward'].includes(tx.type)
                        return (
                          <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                             <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                   {isIncome ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                                </div>
                                <div>
                                   <p className="font-bold text-gray-900 text-sm">{tx.description || tx.type.replace('_', ' ')}</p>
                                   <p className="text-[10px] text-gray-400 font-black uppercase mt-1">
                                      {tx.brand_name ? `From ${tx.brand_name} • ` : ''}
                                      {new Date(tx.created_at).toLocaleDateString()}
                                   </p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className={`text-lg font-black ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                                   {isIncome ? '+' : '-'}{tx.amount}
                                </p>
                                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">BC Tokens</p>
                             </div>
                          </div>
                        )
                      })}
                   </div>
                 ) : (
                   <div className="py-20 text-center space-y-4 opacity-40">
                      <Coins size={48} className="mx-auto" />
                      <p className="text-xs font-black uppercase tracking-widest leading-relaxed">No transactions<br/>found</p>
                   </div>
                 )}
              </div>
           </div>

           {/* Side Actions */}
           <div className="space-y-8">
              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6">
                 <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Bank Details</h3>
                 <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col items-center text-center space-y-4">
                    <Building2 size={32} className="text-gray-300" />
                    <p className="text-xs text-gray-500 font-medium">Manage where you receive your payouts in Nigeria.</p>
                    <button 
                      onClick={() => router.push('/dashboard/wallet/banks')}
                      className="w-full py-3 bg-white border border-gray-200 text-gray-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all"
                    >
                       Configure Bank
                    </button>
                 </div>
              </div>

              <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white space-y-6">
                 <div className="flex items-center gap-3 text-brand">
                    <AlertCircle size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Withdrawal Terms</span>
                 </div>
                 <div className="space-y-4">
                    <TermItem label="Minimum Limit" value={`${cashoutLimit} BC`} />
                    <TermItem label="Processing Time" value="24-48 Hours" />
                    <TermItem label="Platform Fee" value="20%" />
                 </div>
              </div>
           </div>
        </div>
      </main>

      {/* Cashout Modal */}
      {showCashoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                 <h3 className="text-2xl font-black text-gray-900">Withdraw Coins</h3>
                 <button onClick={() => setShowCashoutModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                 </button>
              </div>
              
              <div className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Amount to withdraw (BC)</label>
                    <div className="relative">
                       <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-brand" size={20} />
                       <input 
                         type="number"
                         value={cashoutAmount}
                         onChange={e => setCashoutAmount(e.target.value)}
                         placeholder={`Min. ${cashoutLimit}`}
                         className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all font-black text-lg"
                       />
                    </div>
                 </div>

                 {parseFloat(cashoutAmount) > 0 && (
                   <div className="p-5 bg-emerald-50 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                         <span>Approx. Payout</span>
                         <span>80% after fees</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900">₦{(parseFloat(cashoutAmount) * 0.8 * coinBaseValue).toLocaleString()}</p>
                   </div>
                 )}

                 <button 
                   onClick={handleCashout}
                   disabled={isProcessing || !cashoutAmount}
                   className="w-full py-5 bg-brand text-white font-black rounded-2xl shadow-xl shadow-brand/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                    {isProcessing ? <Loader2 className="animate-spin" size={24} /> : (
                      <>
                        <Banknote size={20} />
                        SUBMIT REQUEST
                      </>
                    )}
                 </button>
                 
                 <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-wider">
                    Funds will be sent to your configured bank account
                 </p>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}

function TermItem({ label, value }: any) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-none">
       <span className="text-xs text-white/40 font-bold uppercase tracking-wider">{label}</span>
       <span className="text-sm font-black">{value}</span>
    </div>
  )
}
