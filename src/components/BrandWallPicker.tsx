'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { X, Loader2, Image as ImageIcon, Check } from 'lucide-react'

interface BrandWallPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string) => void
  brandId?: string // Now optional, if provided it fetches from this specific brand
}

export default function BrandWallPicker({ isOpen, onClose, onSelect, brandId }: BrandWallPickerProps) {
  const [media, setMedia] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchMedia()
    }
  }, [isOpen, brandId])

  const fetchMedia = async () => {
    setLoading(true)
    try {
      let targetBrandId = brandId

      // If no brandId provided, assume we are a brand looking at our own wall
      if (!targetBrandId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: brand } = await supabase
          .from('brands')
          .select('id')
          .eq('profile_id', user.id)
          .single()

        if (!brand) return
        targetBrandId = brand.id
      }

      const { data, error } = await supabase
        .from('brand_wall_media')
        .select('*')
        .eq('brand_id', targetBrandId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMedia(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 lg:p-12 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Select Media</h2>
            <p className="text-sm text-gray-500 mt-1">Choose from high-quality assets.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-brand" size={40} />
            </div>
          ) : media.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map((m) => (
                <div 
                  key={m.id}
                  onClick={() => { onSelect(m.media_url); onClose() }}
                  className="aspect-square rounded-2xl overflow-hidden cursor-pointer group relative border-2 border-transparent hover:border-brand transition-all"
                >
                   {m.media_type === 'video' ? (
                     <video src={m.media_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                   ) : (
                     <img src={m.media_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                   )}
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-white/90 scale-0 group-hover:scale-100 transition-transform duration-200 flex items-center justify-center text-brand">
                        <Check size={20} />
                      </div>
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                <ImageIcon size={32} />
              </div>
              <p className="text-gray-500 font-medium">No media found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
