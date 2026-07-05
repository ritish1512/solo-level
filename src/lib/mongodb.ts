import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Ensure the TypeScript global variable declaration is correct
declare global {
  var mongooseCache: MongooseCache | undefined;
}

// ✅ FIXED: Securely bind and preserve the cache instance directly on the global scope object
if (!global.mongooseCache) {
  global.mongooseCache = { conn: null, promise: null };
}
const cached = global.mongooseCache;

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // 🚀 Fail fast (within 5s) instead of hanging to prevent Vercel execution timeouts
      serverSelectionTimeoutMS: 5000, 
    };

    console.log("🔄 Opening a fresh MongoDB connection pool...");
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      console.log("✅ MongoDB Connected successfully!");
      return mongooseInstance;
    }).catch((err) => {
      console.error("❌ MongoDB connection error inside promise:", err);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Reset cache promise state if the handshake drops
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
