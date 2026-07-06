/**
 * Diagnostic script: list pending reminders (isSent: false, triggerTime <= now)
 * Usage: set MONGODB_URI and run `node scripts/list_pending_reminders.js`
 */

const mongoose = require('mongoose')
// Load local .env if present
try {
  require('dotenv').config({ path: '.env.local' })
} catch (e) {
  // dotenv may not be installed in all environments; attempt manual parse of .env.local
  const fs = require('fs')
  const path = require('path')
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8')
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const idx = trimmed.indexOf('=')
      if (idx === -1) return
      const key = trimmed.slice(0, idx).trim()
      let val = trimmed.slice(idx + 1).trim()
      // remove surrounding quotes
      if ((val.startsWith("\"") && val.endsWith("\"") ) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = val
    })
  }
}

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL || process.env.MONGO_URI

if (!MONGO_URI) {
  console.error('Please set MONGODB_URI (or MONGO_URI / DATABASE_URL) in your environment and re-run this script.')
  process.exit(1)
}

async function main() {
  await mongoose.connect(MONGO_URI, { dbName: process.env.MONGODB_DB || undefined })
  const { Schema, Types } = mongoose

  const ReminderSchema = new Schema({
    user: Schema.Types.ObjectId,
    title: String,
    message: String,
    relatedTo: String,
    relatedId: Schema.Types.ObjectId,
    triggerTime: Date,
    isSent: Boolean,
    emailSent: Boolean,
    channel: String,
  }, { collection: 'reminders', timestamps: true })

  const Reminder = mongoose.models.Reminder || mongoose.model('Reminder', ReminderSchema)

  const now = new Date()
  const reminders = await Reminder.find({ isSent: false, triggerTime: { $lte: now } }).limit(200).lean()

  console.log(`Found ${reminders.length} pending reminders (triggerTime <= now). Showing up to 200:`)

  const usersColl = mongoose.connection.collection('users')

  for (const r of reminders) {
    let userEmail = null
    try {
      if (r.user) {
        const u = await usersColl.findOne({ _id: r.user })
        if (u) {
          userEmail = u.email || u.name || null
          if (!u.email) {
            console.log('Full user document (no email):', JSON.stringify(u))
          }
        } else {
          console.log('Referenced user not found in users collection for id:', r.user)
        }
      }
    } catch (e) {
      console.error('Error fetching user for reminder:', e)
    }

    console.log('---')
    console.log('id:', r._id)
    console.log('title:', r.title)
    console.log('relatedTo:', r.relatedTo)
    console.log('relatedId:', r.relatedId)
    console.log('triggerTime:', r.triggerTime)
    console.log('channel:', r.channel)
    console.log('isSent:', r.isSent, 'emailSent:', r.emailSent)
    console.log('userId:', r.user, 'userEmail:', userEmail)
  }

  await mongoose.disconnect()
  process.exit(0)
}

main().catch((err) => {
  console.error('Error running reminder diagnostic:', err)
  process.exit(2)
})
