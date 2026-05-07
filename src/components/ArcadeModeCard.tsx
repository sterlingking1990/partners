'use client'

import { useState } from 'react'
import MemorizeGame from './MemorizeGame'
import SponsorHistory from './SponsorHistory'

type Step = 'game' | 'history' | null

export default function ArcadeModeCard({ user }: { user: any }) {
  const [step, setStep] = useState<Step>(null)

  return (
    <>
      <div className="glass-card rounded-[2rem] p-8 bg-gray-900 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/20 rounded-full blur-3xl -mr-10 -mt-10" />
        <h3 className="text-xl font-bold mb-2">Arcade Mode</h3>
        <p className="text-white/50 text-xs leading-relaxed mb-6">Play games, spot brand sponsor words and earn coins instantly.</p>
        <button
          onClick={() => setStep('game')}
          className="w-full py-4 bg-brand text-white font-black rounded-2xl shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest"
        >
          Launch Game
        </button>
      </div>

      {step === 'game' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-auto w-full max-w-lg max-h-[90vh]">
            <MemorizeGame user={user} onClose={() => setStep('history')} onCoinsUpdated={() => {}} />
          </div>
        </div>
      )}

      {step === 'history' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-auto w-full max-w-lg max-h-[90vh]">
            <SponsorHistory user={user} onClose={() => setStep(null)} />
          </div>
        </div>
      )}
    </>
  )
}
