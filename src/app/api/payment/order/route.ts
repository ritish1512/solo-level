import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Invoice from '@/models/Invoice'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { invoiceId } = await request.json()
    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    await dbConnect()

    const invoice = await Invoice.findOne({ _id: invoiceId, user: session.user.id })
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    // Fallback indicator if credentials are missing
    if (!keyId || !keySecret) {
      return NextResponse.json({
        mock: true,
        message: 'Razorpay keys missing from .env.local. Initializing mock payment fallback.'
      })
    }

    // Razorpay amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(invoice.amount * 100)

    const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: invoice._id.toString(),
      })
    })

    if (!razorpayRes.ok) {
      const errText = await razorpayRes.text()
      console.error('Razorpay Order creation error:', errText)
      return NextResponse.json({ error: 'Razorpay order creation failed.' }, { status: 502 })
    }

    const orderData = await razorpayRes.json()

    // Save order ID to database invoice
    invoice.orderId = orderData.id
    await invoice.save()

    return NextResponse.json({
      id: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      key: keyId
    })
  } catch (error: any) {
    console.error('Payment Order API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
