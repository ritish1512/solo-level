import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import dbConnect from '@/lib/mongodb'
import Invoice from '@/models/Invoice'
import Transaction from '@/models/Transaction'
import User from '@/models/User'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId } = await request.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !invoiceId) {
      return NextResponse.json({ error: 'Missing payment signature verification tokens.' }, { status: 400 })
    }

    await dbConnect()

    // Retrieve Invoice
    const invoice = await Invoice.findOne({ _id: invoiceId, user: session.user.id })
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keySecret) {
      return NextResponse.json({ error: 'Razorpay secret key configuration is missing.' }, { status: 500 })
    }

    // Verify signature using HMAC SHA256
    const text = `${razorpay_order_id}|${razorpay_payment_id}`
    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex')

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 })
    }

    // Mark paid in database
    invoice.status = 'Paid'
    invoice.paymentId = razorpay_payment_id
    await invoice.save()

    // Log Income Transaction
    await Transaction.create({
      user: session.user.id,
      type: 'Income',
      amount: invoice.amount,
      category: 'Freelancing',
      description: `Freelance Payment for: ${invoice.description} (Ref: ${razorpay_payment_id})`,
      date: new Date(),
    })

    // Award +50 XP
    const user = await User.findById(session.user.id)
    let leveledUp = false
    if (user) {
      user.xp += 50
      const nextLevel = Math.floor(user.xp / 100) + 1
      if (nextLevel > user.level) {
        user.level = nextLevel
        leveledUp = true
      }
      await user.save()
    }

    // Send invoice email receipt via SMTP
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(smtpPort) || 587,
          secure: Number(smtpPort) === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        })

        const mailContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; rounded-lg: 8px;">
            <h2 style="color: #6366f1; font-weight: bold; border-bottom: 2px solid #e4e4e7; padding-bottom: 10px;">SOLO LEVELING RECEIPT</h2>
            <p>Hello <strong>${invoice.clientName}</strong>,</p>
            <p>We have successfully received your payment for the freelance invoice.</p>
            
            <div style="background-color: #f4f4f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>Description:</strong> ${invoice.description}</p>
              <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ₹${invoice.amount}</p>
              <p style="margin: 4px 0;"><strong>Payment ID:</strong> ${razorpay_payment_id}</p>
              <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p style="font-size: 12px; color: #71717a;">Thank you for your business. This is an automated billing notification receipt.</p>
          </div>
        `

        await transporter.sendMail({
          from: `"Solo Leveling Billing" <${smtpUser}>`,
          to: invoice.clientEmail,
          subject: `Payment Receipt: ${invoice.description}`,
          html: mailContent,
        })
      } catch (err) {
        console.error('SMTP Email dispatch failed:', err)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and receipt delivered.',
      leveledUp,
    })
  } catch (error: any) {
    console.error('Payment Verification API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
