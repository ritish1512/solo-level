'use client'

import React, { useState, useRef } from 'react'
import { useToast } from '@/components/ui/Toast'
import { Upload, Link as LinkIcon, FileText, X, Loader2, Image as ImageIcon } from 'lucide-react'

interface FileOrLinkUploadProps {
  value: string
  onUploadComplete: (url: string) => void
  label?: string
  placeholder?: string
  accept?: string // e.g. "image/*,video/*"
}

export default function FileOrLinkUpload({
  value,
  onUploadComplete,
  label,
  placeholder = 'Enter URL link or upload file...',
  accept = 'image/*,video/*,application/pdf',
}: FileOrLinkUploadProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Detect file extension type
  const getFileType = (urlStr: string) => {
    if (!urlStr) return 'unknown'
    const cleanUrl = urlStr.split('?')[0].split('#')[0]
    const ext = cleanUrl.split('.').pop()?.toLowerCase() || ''
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) || urlStr.includes('image')) {
      return 'image'
    }
    if (['mp4', 'mov', 'webm', 'ogg'].includes(ext) || urlStr.includes('video')) {
      return 'video'
    }
    return 'document'
  }

  // Handle local file uploads with 10MB constraints
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 10MB File Size check
    const maxSizeBytes = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSizeBytes) {
      toast('File size exceeds the 10MB limit. Please upload a smaller file.', 'error')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        onUploadComplete(data.url)
        toast('File uploaded successfully!', 'success')
      } else {
        const err = await res.json()
        toast(err.error || 'Failed to upload file to Cloudinary', 'error')
      }
    } catch (err) {
      toast('Network connection error during file upload', 'error')
    } finally {
      setUploading(false)
    }
  }

  // Handle manual URL text inputs
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUploadComplete(e.target.value)
  }

  const handleClear = () => {
    onUploadComplete('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const fileType = getFileType(value)

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-bold text-zinc-500">{label}</label>}

      {/* Switch tabs */}
      <div className="flex border-b border-border/40 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`mr-4 flex items-center gap-1 border-b-2 pb-1.5 text-[10px] font-bold uppercase transition-all ${
            activeTab === 'upload' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400'
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          Upload File (&le;10MB)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('link')}
          className={`flex items-center gap-1 border-b-2 pb-1.5 text-[10px] font-bold uppercase transition-all ${
            activeTab === 'link' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400'
          }`}
        >
          <LinkIcon className="h-3.5 w-3.5" />
          Provide URL Link
        </button>
      </div>

      {/* Tab: Upload File */}
      {activeTab === 'upload' && (
        <div className="space-y-3">
          {value ? (
            /* Upload preview and clear actions */
            <div className="relative flex items-center gap-3 rounded-lg border border-border bg-zinc-50/50 p-2 dark:bg-zinc-950/20">
              {fileType === 'image' && (
                <img src={value} alt="Preview" className="h-10 w-10 rounded object-cover border" />
              )}
              {fileType === 'video' && (
                <video src={value} className="h-10 w-10 rounded object-cover border" muted />
              )}
              {fileType === 'document' && (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-violet-500/10 text-violet-500 border border-violet-500/20">
                  <FileText className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-mono text-zinc-400">{value}</p>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-rose-500"
                aria-label="Remove asset"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* Direct file input */
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={accept}
                disabled={uploading}
                className="hidden"
                id="file-or-link-file-input"
              />
              <label
                htmlFor="file-or-link-file-input"
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-zinc-50/50 py-3 text-xs font-bold text-zinc-500 transition-all hover:bg-zinc-100 dark:bg-zinc-950/20 dark:hover:bg-zinc-800/40 ${
                  uploading ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                    Uploading asset...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-violet-500" />
                    Choose File (Max 10MB)
                  </>
                )}
              </label>
            </div>
          )}
        </div>
      )}

      {/* Tab: URL Link */}
      {activeTab === 'link' && (
        <div className="flex gap-2">
          <input
            type="url"
            value={value}
            onChange={handleUrlChange}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-border bg-zinc-50/50 p-2 text-xs font-semibold text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-violet-500 dark:bg-zinc-950/20 dark:text-zinc-300"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-border px-3 text-xs font-bold text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
