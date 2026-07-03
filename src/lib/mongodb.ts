import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Correctly declare global variables for Next.js environments
declare global {
  var mongooseCache: MongooseCache | undefined
}

// Safely reference the exact global object without shallow mutations
let cached = global.mongooseCache || { conn: null, promise: null }

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null }
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // 🚀 IMPORTANT: Stop the 30-second hang. 
      // If it can't connect within 5 seconds, fail out immediately so you can see why.
      serverSelectionTimeoutMS: 5000, 
    }

    console.log("🔄 Opening a fresh MongoDB connection pool...")
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      console.log("✅ MongoDB Connected successfully!")
      return mongooseInstance
    }).catch((err) => {
      console.error("❌ MongoDB connection error inside promise:", err)
      throw err
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null // Reset cache if the connection fails
    throw e
  }

  return cached.conn
}

export default dbConnect
