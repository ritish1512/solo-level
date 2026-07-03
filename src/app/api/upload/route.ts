import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // 1. Session verification check
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET

    // If Cloudinary variables are missing, return a warning fallback message
    if (!cloudName || !uploadPreset) {
      console.log('\n=======================================')
      console.log('--- CLOUDINARY UPLOAD WARNING ---')
      console.log('CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET are missing from .env.local')
      console.log('File Name:', file.name)
      console.log('=======================================\n')
      
      // Fallback url simulation for local testing
      return NextResponse.json({
        url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
        fallback: true
      })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Convert file buffer to base64 Data URI
    const fileBase64 = `data:${file.type};base64,${buffer.toString('base64')}`

    const cloudinaryFormData = new FormData()
    cloudinaryFormData.append('file', fileBase64)
    cloudinaryFormData.append('upload_preset', uploadPreset)

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`
    const cloudinaryRes = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: cloudinaryFormData,
    })

    if (!cloudinaryRes.ok) {
      const errText = await cloudinaryRes.text()
      console.error('Cloudinary API upload failure:', errText)
      return NextResponse.json({ error: 'Cloudinary transmission failed.' }, { status: 502 })
    }

    const responseData = await cloudinaryRes.json()
    return NextResponse.json({ url: responseData.secure_url })
  } catch (error: any) {
    console.error('File Upload Route Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
