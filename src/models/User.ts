import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUser extends Document {
  name: string
  email: string
  password?: string
  image?: string
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  emailVerified?: Date | null
  verificationToken?: string | null
  verificationTokenExpiry?: Date | null
  resetPasswordToken?: string | null
  resetPasswordTokenExpiry?: Date | null
  xp: number
  level: number
  streak: number
  longestStreak: number
  lastActive?: Date
  lastHabitReminderDate?: Date // Track last daily habit reminder
  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
    },
    image: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    emailVerified: {
      type: Date,
      default: null,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    verificationTokenExpiry: {
      type: Date,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordTokenExpiry: {
      type: Date,
      default: null,
    },
    xp: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    streak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastActive: {
      type: Date,
      required: false,
    },
    lastHabitReminderDate: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
)

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User
