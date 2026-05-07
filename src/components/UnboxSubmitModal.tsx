'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { X, Upload, Search, Loader2, CheckCircle2 } from 'lucide-react'

export default function UnboxSubmitModal({ hubId, hubName, onClose, onSuccess }: {
  hubId: string
  hubName: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [caption, setCaption] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [brandSearch, setBrandSearch] = useState('')
  const [brandResults, setBrandResults] = useState<any[]>([])
  const [selectedBrand, setSelectedBrand] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFile(file)
    setMediaType(file.type.startsWith('video') ? 'video' : 'image')
    setMediaPreview(URL.createObjectURL(file))
  }

  const searchBrands = async (q: string) => {
    setBrandSearch(q)
    if (q.length < 2) { setBrandResults([]); return }
    const lower = q.toLowerCase()

    // Query profiles of type 'brand' directly — has email, full_name, username
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, username, avatar_url')
      .eq('user_type', 'brand')
      .or(`email.ilike.%${lower}%,username.ilike.%${lower}%,full_name.ilike.%${lower}%`)
      .limit(8)

    if (!profiles?.length) { setBrandResults([]); return }

    // Get brand records for matched profiles
    const { data: brands } = await supabase
      .from('brands')
      .select('id, company_name, industry, profile_id')
      .in('profile_id', profiles.map((p: any) => p.id))

    const brandsMap = Object.fromEntries((brands || []).map((b: any) => [b.profile_id, b]))

    setBrandResults(profiles.map((p: any) => ({
      id: brandsMap[p.id]?.id,
      company_name: brandsMap[p.id]?.company_name || p.full_name || p.username,
      industry: brandsMap[p.id]?.industry,
      profiles: p,
    })).filter((b: any) => b.id))
  }

  const handleSubmit = async () => {
    if (!mediaFile || !selectedBrand || !caption.trim()) return
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = mediaType === 'video' ? 'mp4' : 'jpg'
      const fileName = `unbox_${Date.now()}.${ext}`
      const { data: uploaded, error: uploadError } = await supabase.storage
        .from('challenge-submissions')
        .upload(fileName, mediaFile)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('challenge-submissions')
        .getPublicUrl(uploaded.path)

      const { error } = await supabase.from('unboxed_submissions').insert({
        influencer_id: user.id,
        brand_id: selectedBrand.id,
        media_url: publicUrl,
        thumbnail_url: publicUrl,
        caption: caption.trim(),
        status: 'pending',
        hub_id: hubId,
        media_type: mediaType,
      })
      if (error) throw error

      setDone(true)
      setTimeout(() => { onSuccess(); onClose() }, 1500)
    } catch (err: any) {
      alert('Failed to submit: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-8 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-gray-900">Sell & Earn</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{hubName}</p>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="p-16 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 size={48} className="text-emerald-500" />
            <p className="font-black text-gray-900 text-lg">Submitted!</p>
            <p className="text-sm text-gray-400">Waiting for brand approval.</p>
          </div>
        ) : (
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Media Upload */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Photo / Video</label>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
              {mediaPreview ? (
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-900 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {mediaType === 'video'
                    ? <video src={mediaPreview} className="w-full h-full object-cover" />
                    : <img src={mediaPreview} className="w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-black uppercase tracking-widest">Change</p>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full aspect-video rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 hover:border-brand hover:bg-brand/5 transition-all">
                  <Upload size={28} className="text-gray-300" />
                  <p className="text-xs font-bold text-gray-400">Click to upload photo or video</p>
                </button>
              )}
            </div>

            {/* Brand Search */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Tag a Brand</label>
              {selectedBrand ? (
                <div className="flex items-center gap-3 p-4 bg-brand/5 border border-brand/20 rounded-2xl">
                  <img src={selectedBrand.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${selectedBrand.company_name}`} className="h-8 w-8 rounded-xl object-cover" />
                  <p className="font-bold text-gray-900 flex-1">{selectedBrand.company_name}</p>
                  <button onClick={() => { setSelectedBrand(null); setBrandSearch('') }} className="text-gray-400 hover:text-red-500 transition-colors"><X size={16} /></button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    value={brandSearch}
                    onChange={e => searchBrands(e.target.value)}
                    placeholder="Search brand name..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand"
                  />
                  {brandResults.length > 0 && (
                    <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-xl z-10 overflow-hidden">
                      {brandResults.map((b: any) => (
                        <button key={b.id} onClick={() => { setSelectedBrand(b); setBrandResults([]) }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                          <img src={b.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${b.company_name}`} className="h-8 w-8 rounded-xl object-cover" />
                          <div>
                            <p className="font-bold text-sm text-gray-900">{b.company_name}</p>
                            <p className="text-[10px] text-gray-400">@{b.profiles?.username} &middot; {b.profiles?.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Caption */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Caption</label>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={3}
                placeholder="Describe the product and why you love it..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={uploading || !mediaFile || !selectedBrand || !caption.trim()}
              className="w-full py-4 bg-brand text-white font-black rounded-2xl shadow-xl shadow-brand/20 hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-widest text-sm"
            >
              {uploading ? <><Loader2 className="animate-spin" size={18} /> Submitting...</> : 'Submit for Approval'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
