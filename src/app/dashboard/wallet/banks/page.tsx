'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Building2, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  X, 
  Loader2, 
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  AlertCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

export default function BankAccountsPage() {
  const [banks, setBanks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    account_name: ''
  })

  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchBanks()
  }, [])

  const fetchBanks = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_bank_accounts')
        .select('*')
        .eq('user_id', user.id)
      
      if (error) throw error
      setBanks(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_bank_accounts')
        .insert({
          user_id: user.id,
          ...formData
        })

      if (error) throw error

      setToastMessage('Bank account added!')
      setShowToast(true)
      setIsAdding(false)
      setFormData({ bank_name: '', account_number: '', account_name: '' })
      fetchBanks()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteBank = async (id: string) => {
    if (!confirm('Remove this bank account?')) return
    try {
      const { error } = await supabase
        .from('user_bank_accounts')
        .delete()
        .eq('id', id)
      if (error) throw error
      setBanks(banks.filter(b => b.id !== id))
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
         <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Bank Accounts</h1>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-brand text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand/90 transition-all shadow-lg shadow-brand/20"
        >
          <Plus size={18} /> Add New
        </button>
      </header>

      <main className="p-8 max-w-4xl mx-auto w-full space-y-8">
        <div className="space-y-6">
           {banks.length > 0 ? banks.map((bank) => (
             <div key={bank.id} className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm flex items-center justify-between group hover:border-brand/30 transition-all">
                <div className="flex items-center gap-6">
                   <div className="h-14 w-14 bg-gray-50 rounded-2xl flex items-center justify-center text-brand border border-gray-100">
                      <Building2 size={28} />
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-gray-900">{bank.account_name}</h3>
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">
                         {bank.bank_name} • {bank.account_number}
                      </p>
                   </div>
                </div>
                <button 
                  onClick={() => handleDeleteBank(bank.id)}
                  className="h-10 w-10 text-gray-300 hover:text-red-500 transition-colors flex items-center justify-center"
                >
                   <Trash2 size={20} />
                </button>
             </div>
           )) : (
             <div className="py-20 text-center space-y-6 bg-white rounded-[3rem] border border-dashed border-gray-200">
                <div className="h-20 w-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto text-gray-300">
                   <CreditCard size={40} />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-gray-900">No bank accounts</h3>
                   <p className="text-gray-500 max-w-xs mx-auto mt-2">Add a bank account to start withdrawing your earnings.</p>
                </div>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="bg-brand text-white px-8 py-3 rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-brand/20"
                >
                   Add Account Now
                </button>
             </div>
           )}
        </div>

        <div className="bg-emerald-50 rounded-[2.5rem] p-8 border border-emerald-100 flex gap-6">
           <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
              <ShieldCheck size={24} />
           </div>
           <div>
              <h4 className="font-bold text-emerald-900">Name Verification</h4>
              <p className="text-sm text-emerald-700 leading-relaxed mt-1">
                 To prevent fraud, your bank account name must closely match your profile name. Payouts to 3rd party accounts are not supported.
              </p>
           </div>
        </div>
      </main>

      {/* Add Bank Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                 <h3 className="text-2xl font-black text-gray-900">Add Account</h3>
                 <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                 </button>
              </div>
              
              <form onSubmit={handleAddBank} className="p-8 space-y-6">
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Bank Name</label>
                       <input 
                         required
                         value={formData.bank_name}
                         onChange={e => setFormData({...formData, bank_name: e.target.value})}
                         placeholder="e.g. Zenith Bank"
                         className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all font-bold"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Account Number</label>
                       <input 
                         required
                         value={formData.account_number}
                         onChange={e => setFormData({...formData, account_number: e.target.value})}
                         placeholder="10 Digits"
                         maxLength={10}
                         className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all font-bold"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Account Name</label>
                       <input 
                         required
                         value={formData.account_name}
                         onChange={e => setFormData({...formData, account_name: e.target.value})}
                         placeholder="Exact name on account"
                         className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all font-bold uppercase"
                       />
                    </div>
                 </div>

                 <button 
                   type="submit"
                   disabled={isProcessing}
                   className="w-full py-4 bg-brand text-white font-black rounded-2xl shadow-xl shadow-brand/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                    {isProcessing ? <Loader2 className="animate-spin" size={24} /> : 'SECURELY SAVE ACCOUNT'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  )
}
