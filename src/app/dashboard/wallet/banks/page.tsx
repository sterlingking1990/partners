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
  ChevronDown,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

interface Bank {
  name: string
  code: string
}

interface FormData {
  bank_name: string
  bank_code: string
  account_number: string
  account_name: string
}

export default function BankAccountsPage() {
  const [banks, setBanks] = useState<any[]>([])
  const [bankList, setBankList] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isResolving, setIsResolving] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    bank_name: '',
    bank_code: '',
    account_number: '',
    account_name: '',
  })

  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchBanks()
    fetchBankList()
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

  const fetchBankList = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-banks`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
        }
      )
      const data = await res.json()
      if (Array.isArray(data)) setBankList(data)
    } catch (err) {
      console.error('Failed to load bank list', err)
    }
  }

  // Auto-resolve account name when account number is 10 digits and bank is selected
  const resolveAccountName = async (accountNumber: string, bankCode: string) => {
    if (accountNumber.length !== 10 || !bankCode) return
    setIsResolving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-bank-account`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accountNumber, bankCode }),
        }
      )
      const data = await res.json()
      if (data?.data?.account_name) {
        setFormData(prev => ({ ...prev, account_name: data.data.account_name }))
      } else {
        setFormData(prev => ({ ...prev, account_name: '' }))
        alert(data.message || 'Could not verify account. Check the number and bank.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsResolving(false)
    }
  }

  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = bankList.find(b => b.code === e.target.value)
    setFormData(prev => ({
      ...prev,
      bank_code: selected?.code ?? '',
      bank_name: selected?.name ?? '',
      account_name: '', // clear resolved name when bank changes
    }))
    if (selected && formData.account_number.length === 10) {
      resolveAccountName(formData.account_number, selected.code)
    }
  }

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
    setFormData(prev => ({ ...prev, account_number: value, account_name: '' }))
    if (value.length === 10 && formData.bank_code) {
      resolveAccountName(value, formData.bank_code)
    }
  }

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.bank_code) { alert('Please select a bank.'); return }
    if (!formData.account_name) { alert('Account name could not be resolved. Check the account number and bank.'); return }
    setIsProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('user_bank_accounts').insert({
        user_id: user.id,
        bank_name: formData.bank_name,
        bank_code: formData.bank_code,
        account_number: formData.account_number,
        account_name: formData.account_name,
      })
      if (error) throw error
      setToastMessage('Bank account added!')
      setShowToast(true)
      setIsAdding(false)
      setFormData({ bank_name: '', bank_code: '', account_number: '', account_name: '' })
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
      const { error } = await supabase.from('user_bank_accounts').delete().eq('id', id)
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
                {/* Bank selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Bank</label>
                  <div className="relative">
                    <select
                      required
                      value={formData.bank_code}
                      onChange={handleBankSelect}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all font-bold appearance-none"
                    >
                      <option value="">Select your bank…</option>
                      {bankList.map(b => (
                        <option key={b.code} value={b.code}>{b.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Account number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Account Number</label>
                  <input
                    required
                    value={formData.account_number}
                    onChange={handleAccountNumberChange}
                    placeholder="10 digits"
                    inputMode="numeric"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all font-bold"
                  />
                </div>

                {/* Auto-resolved account name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Account Name</label>
                  <div className="relative">
                    <input
                      readOnly
                      value={formData.account_name}
                      placeholder={isResolving ? 'Verifying…' : 'Auto-filled after verification'}
                      className="w-full px-5 py-3.5 bg-gray-100 border border-gray-100 rounded-2xl outline-none font-bold uppercase text-gray-700 cursor-not-allowed"
                    />
                    {isResolving && (
                      <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand animate-spin" />
                    )}
                    {!isResolving && formData.account_name && (
                      <CheckCircle2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing || isResolving || !formData.account_name}
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
