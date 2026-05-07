'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { X, Loader2, Trophy, Zap, RotateCcw } from 'lucide-react'

const FALLBACK_WORDS: Record<number, string[]> = {
  3: ['CAT', 'DOG', 'SUN', 'BOX', 'RED', 'FLY', 'SKY', 'HOT', 'PEN', 'CUP'],
  4: ['GOLD', 'BLUE', 'WIND', 'FIRE', 'TREE', 'BIRD', 'FISH', 'MOON', 'STAR', 'DARK'],
  5: ['BREAD', 'APPLE', 'GRAPE', 'CLOUD', 'LIGHT', 'HEART', 'SMILE', 'WATER', 'DREAM', 'PIZZA'],
  6: ['BANANA', 'ORANGE', 'CHERRY', 'FLOWER', 'SPRING', 'WINTER', 'SUMMER', 'COFFEE', 'GUITAR', 'ROCKET'],
  7: ['DIAMOND', 'RAINBOW', 'JOURNEY', 'SILENCE', 'MORNING', 'EVENING', 'THUNDER', 'PICTURE', 'RECORDS', 'NETWORK'],
}
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

type GameState = 'IDLE' | 'READY' | 'FLASHING' | 'PLAYING' | 'SUCCESS' | 'FAILURE'

interface Props {
  user: any
  onClose: () => void
  onCoinsUpdated: () => void
}

export default function MemorizeGame({ user, onClose, onCoinsUpdated }: Props) {
  const supabase = createClient()

  const [level, setLevel] = useState(1)
  const [stage, setStage] = useState(1)
  const [userMaxLevel, setUserMaxLevel] = useState(1)
  const [grid, setGrid] = useState<string[]>([])
  const [targetWord, setTargetWord] = useState('')
  const [flashingIndex, setFlashingIndex] = useState(-1)
  const [userInput, setUserInput] = useState<string[]>([])
  const [clickedIndices, setClickedIndices] = useState<number[]>([])
  const [gameState, setGameState] = useState<GameState>('IDLE')
  const [message, setMessage] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [gameWords, setGameWords] = useState<Record<number, string[]>>(FALLBACK_WORDS)
  const [campaignTriggers, setCampaignTriggers] = useState<any[]>([])
  const [earnedCampaigns, setEarnedCampaigns] = useState<any[]>([])
  const [activeTrigger, setActiveTrigger] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    cols: 4, rows: 4, stagesPerLevel: 5, flashMs: 800, flashGapMs: 300,
    graceMs: 3000, influencerRewardPct: 0.5, campaignProbability: 0.3,
    minWordLength: 3, maxWordLength: 7,
  })

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const flashingRef = useRef(false)

  useEffect(() => {
    init()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const init = async () => {
    console.log('[Game] init start')
    setLoading(true)
    try {
      console.log('[Game] fetching settings...')
      const loadedSettings = await fetchSettings()
      console.log('[Game] settings loaded:', loadedSettings)
      console.log('[Game] fetching words and max level...')
      const [loadedWords] = await Promise.all([fetchWords(loadedSettings), fetchMaxLevel()])
      console.log('[Game] init complete')
      await prepareStage(1, 1, loadedWords)
    } catch (e) {
      console.error('[Game] init error:', e)
      setMessage('Failed to load game. Please try again.')
    } finally {
      console.log('[Game] setLoading(false)')
      setLoading(false)
    }
  }

  const fetchWords = async (s?: typeof settings) => {
    const min = s?.minWordLength ?? settings.minWordLength
    const max = s?.maxWordLength ?? settings.maxWordLength
    console.log(`[Game] fetchWords start, range ${min}-${max}`)
    const words: Record<number, string[]> = {}
    for (let len = min; len <= max; len++) {
      try {
        const { data } = await supabase.rpc('get_words_by_length', { p_word_length: len })
        words[len] = data?.length ? data.map((d: any) => d.word) : FALLBACK_WORDS[len]
      } catch {
        words[len] = FALLBACK_WORDS[len]
      }
    }
    console.log('[Game] fetchWords done:', Object.keys(words).map(k => `${k}:${words[parseInt(k)].length}words`))
    setGameWords(words)
    return words
  }

  const fetchMaxLevel = async () => {
    console.log('[Game] fetchMaxLevel start')
    const { data } = await supabase
      .from('user_game_progress')
      .select('max_level_reached')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data) {
      setUserMaxLevel(data.max_level_reached || 1)
    } else {
      await supabase.from('user_game_progress').insert({ user_id: user.id, max_level_reached: 1 })
    }
  }

  const fetchSettings = async () => {
    console.log('[Game] fetchSettings start')
    const defaults = {
      cols: 4, rows: 4, stagesPerLevel: 5, flashMs: 800, flashGapMs: 300,
      graceMs: 3000, influencerRewardPct: 0.5, campaignProbability: 0.3,
      minWordLength: 3, maxWordLength: 7,
    }
    try {
      const { data } = await supabase.from('app_settings').select('key, value')
      if (!data) return defaults
      const s: Record<string, string> = {}
      data.forEach((r: any) => { s[r.key] = r.value })
      const loaded = {
        cols: parseInt(s.grid_columns) || 4,
        rows: parseInt(s.grid_rows) || 4,
        stagesPerLevel: parseInt(s.stages_per_level) || 5,
        flashMs: parseInt(s.flash_duration_ms) || 800,
        flashGapMs: parseInt(s.flash_gap_ms) || 300,
        graceMs: parseInt(s.grace_time_ms) || 3000,
        influencerRewardPct: (parseFloat(s.influencer_reward_percentage) || 50) / 100,
        campaignProbability: parseFloat(s.campaign_trigger_probability) || 0.3,
        minWordLength: parseInt(s.min_word_length) || 3,
        maxWordLength: parseInt(s.max_word_length) || 7,
      }
      console.log('[Game] fetchSettings success:', loaded)
      setSettings(loaded)
      return loaded
    } catch (e) {
      console.error('[Game] fetchSettings error:', e)
      return defaults
    }
  }


  const prepareStage = useCallback(async (lvl: number, stg: number, wordsOverride?: Record<number, string[]>) => {
    if (timerRef.current) clearInterval(timerRef.current)
    flashingRef.current = false

    const wordLength = Math.min(2 + lvl, settings.maxWordLength)
    const words = wordsOverride || gameWords
    const wordList = words[wordLength] || words[settings.maxWordLength] || FALLBACK_WORDS[wordLength] || ['STAR']

    // Fetch campaign triggers
    let triggers: any[] = []
    try {
      const { data } = await supabase.rpc('get_active_triggers_for_level', {
        p_word_length: wordLength,
        p_user_id: user.id,
      })
      if (data?.length) {
        const enriched = await Promise.all(data.map(async (t: any) => {
          const { data: camp } = await supabase.rpc('get_campaign_by_id_safe', { p_campaign_id: t.campaign_id })
          if (!camp?.length) return null
          return { ...t, ...camp[0], coin_reward: camp[0].coin_per_trigger }
        }))
        triggers = enriched.filter(Boolean)
      }
    } catch {}
    setCampaignTriggers(triggers)

    // Pick word — maybe a campaign trigger
    let word: string
    let selectedTrigger: any = null
    if (triggers.length && Math.random() < settings.campaignProbability) {
      selectedTrigger = triggers[Math.floor(Math.random() * triggers.length)]
      word = selectedTrigger.trigger_word
    } else {
      word = wordList[Math.floor(Math.random() * wordList.length)]
    }

    // Build grid
    const gridSize = settings.cols * settings.rows
    const wordLetters = Array.from(new Set(word.split('')))
    const fillers = ALPHABET.filter(l => !wordLetters.includes(l))
      .sort(() => Math.random() - 0.5)
      .slice(0, gridSize - wordLetters.length)
    const finalGrid = [...wordLetters, ...fillers].sort(() => Math.random() - 0.5)

    setGrid(finalGrid)
    setTargetWord(word)
    setUserInput([])
    setClickedIndices([])
    setFlashingIndex(-1)
    setTimeLeft(0)
    setActiveTrigger(selectedTrigger || null)
    setGameState('READY')
    setMessage(selectedTrigger
      ? `Level ${lvl} · Stage ${stg} — Sponsor word! 💰`
      : `Level ${lvl} · Stage ${stg}`)
  }, [gameWords, user.id, settings])

  const startFlashing = async () => {
    if (flashingRef.current) return
    flashingRef.current = true
    setGameState('FLASHING')
    setMessage('Watch carefully...')

    const shuffled = [...grid].sort(() => Math.random() - 0.5)
    setGrid(shuffled)

    for (let i = 0; i < targetWord.length; i++) {
      if (!flashingRef.current) return
      const idx = shuffled.indexOf(targetWord[i])
      setFlashingIndex(idx)
      await new Promise(r => setTimeout(r, settings.flashMs))
      setFlashingIndex(-1)
      await new Promise(r => setTimeout(r, settings.flashGapMs))
    }

    if (!flashingRef.current) return
    const total = targetWord.length * (settings.flashMs + settings.flashGapMs) + settings.graceMs
    setTotalTime(total)
    setTimeLeft(total)
    setGameState('PLAYING')
    setMessage('Tap the letters in order!')

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          clearInterval(timerRef.current!)
          handleTimeout()
          return 0
        }
        return prev - 100
      })
    }, 100)
  }

  const handleBoxPress = (index: number) => {
    if (gameState !== 'PLAYING') return
    const letter = grid[index]
    const expected = targetWord[userInput.length]

    if (letter === expected) {
      const newInput = [...userInput, letter]
      setUserInput(newInput)
      setClickedIndices(prev => [...prev, index])
      if (newInput.length === targetWord.length) handleStageSuccess(newInput)
    } else {
      handleStageFailure()
    }
  }

  const handleStageSuccess = async (input: string[]) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setGameState('SUCCESS')
    setMessage('Correct! ✓')

    // Campaign trigger reward
    const trigger = campaignTriggers.find(t => t.trigger_word === targetWord)
    if (trigger) {
      const reward = parseFloat((trigger.coin_reward * settings.influencerRewardPct).toFixed(2))
      try {
        const { data } = await supabase.rpc('record_game_interaction', {
          p_campaign_id: trigger.campaign_id,
          p_influencer_id: user.id,
          p_trigger_word: targetWord,
          p_success: true,
          p_coins_earned: reward,
          p_full_cost: trigger.coin_reward,
        })
        if (data?.success) {
          setEarnedCampaigns(prev => [...prev, { name: trigger.campaign_name, reward }])
          setMessage(`Correct! +${reward} BC sponsor bonus! 💰`)
          onCoinsUpdated()
            }
      } catch {}
    }

    setTimeout(() => {
      if (stage < settings.stagesPerLevel) {
        const next = stage + 1
        setStage(next)
        prepareStage(level, next)
      } else {
        handleLevelComplete()
      }
    }, 1200)
  }

  const handleLevelComplete = async () => {
    setGameState('IDLE')
    const nextLevel = level + 1
    // Update max level
    if (level >= userMaxLevel) {
      const newMax = level + 1
      await supabase.from('user_game_progress')
        .update({ max_level_reached: newMax })
        .eq('user_id', user.id)
      setUserMaxLevel(newMax)
    }
    setMessage(`Level ${level} complete! 🎉 Starting Level ${nextLevel}...`)
    setTimeout(() => {
      setLevel(nextLevel)
      setStage(1)
      prepareStage(nextLevel, 1)
    }, 1500)
  }

  const handleStageFailure = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    flashingRef.current = false
    setGameState('FAILURE')
    setActiveTrigger(null)
    setMessage(`Wrong! The word was: ${targetWord}`)
  }

  const handleTimeout = () => {
    flashingRef.current = false
    setGameState('FAILURE')
    setActiveTrigger(null)
    setMessage(`Time's up! The word was: ${targetWord}`)
  }

  const retryStage = () => prepareStage(level, stage)

  const cellSize = Math.floor((Math.min(typeof window !== 'undefined' ? window.innerWidth * 0.8 : 400, 400) - 32) / settings.cols)

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <Loader2 className="animate-spin text-brand" size={32} />
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-6 py-6 px-4 max-w-md mx-auto w-full">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-brand/10 rounded-2xl flex items-center justify-center">
            <Trophy size={20} className="text-brand" />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm">Level {level}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stage {stage}/{settings.stagesPerLevel}</p>
          </div>
        </div>
        <button onClick={onClose} className="h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
          <X size={20} className="text-gray-500" />
        </button>
      </div>

      {/* Message */}
      <div className={`w-full py-4 px-6 rounded-2xl text-center font-bold text-sm transition-all ${
        gameState === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
        gameState === 'FAILURE' ? 'bg-red-50 text-red-700 border border-red-100' :
        'bg-brand/5 text-brand border border-brand/10'
      }`}>
        {message}
      </div>

      {/* Sponsor image */}
      {activeTrigger?.media_url && (
        <div className="w-full rounded-2xl overflow-hidden border border-brand/10 shadow-md">
          <img src={activeTrigger.media_url} alt={activeTrigger.campaign_name} className="w-full object-cover max-h-36" />
          <div className="px-3 py-2 bg-brand/5 flex items-center justify-between">
            <span className="text-[10px] font-black text-brand uppercase tracking-widest">Sponsored · {activeTrigger.campaign_name}</span>
            <span className="text-[10px] font-black text-emerald-600">+{parseFloat((activeTrigger.coin_reward * settings.influencerRewardPct).toFixed(2))} BC on find</span>
          </div>
        </div>
      )}

      {/* Timer bar */}
      {gameState === 'PLAYING' && totalTime > 0 && (
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-100"
            style={{ width: `${(timeLeft / totalTime) * 100}%` }}
          />
        </div>
      )}

      {/* Grid */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${settings.cols}, 1fr)`, width: '100%', maxWidth: 360 }}
      >
        {grid.map((letter, idx) => {
          const isClicked = clickedIndices.includes(idx)
          const isFlashing = flashingIndex === idx
          const showLetter = !(gameState === 'FLASHING' && !isFlashing) && !(gameState === 'PLAYING' && !isClicked)
          return (
            <button
              key={idx}
              onClick={() => handleBoxPress(idx)}
              disabled={gameState !== 'PLAYING' || isClicked}
              className={`
                aspect-square rounded-2xl font-black text-lg transition-all select-none
                ${isFlashing ? 'bg-brand scale-110 shadow-lg shadow-brand/40' :
                  isClicked ? 'bg-emerald-500 scale-95' :
                  gameState === 'PLAYING' ? 'bg-white border-2 border-gray-200 hover:border-brand active:scale-95 shadow-sm' :
                  'bg-white border-2 border-gray-100'}
              `}
            >
              <span className={showLetter ? (isFlashing ? 'text-white' : isClicked ? 'text-white' : 'text-gray-800') : 'invisible'}>
                {letter}
              </span>
            </button>
          )
        })}
      </div>

      {/* Action buttons */}
      <div className="w-full flex gap-3">
        {gameState === 'IDLE' || gameState === 'READY' ? (
          <button
            onClick={startFlashing}
            disabled={gameState === 'IDLE'}
            className="flex-1 py-4 bg-brand text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Zap size={16} /> {gameState === 'IDLE' ? 'Loading...' : 'Start Flash'}
          </button>
        ) : gameState === 'FAILURE' ? (
          <button
            onClick={retryStage}
            className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> Try Again
          </button>
        ) : gameState === 'SUCCESS' ? (
          <div className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest text-center">
            ✓ Next stage loading...
          </div>
        ) : (
          <div className="flex-1 py-4 bg-brand/10 text-brand rounded-2xl font-black text-sm uppercase tracking-widest text-center animate-pulse">
            {gameState === 'FLASHING' ? 'Watch the letters...' : 'Tap the letters!'}
          </div>
        )}
      </div>

      {/* Earned campaign bonuses */}
      {earnedCampaigns.length > 0 && (
        <div className="w-full space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sponsor Bonuses Earned</p>
          {earnedCampaigns.map((c, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
              <span className="text-xs font-bold text-gray-700">{c.name}</span>
              <span className="text-xs font-black text-emerald-600">+{c.reward} BC</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
