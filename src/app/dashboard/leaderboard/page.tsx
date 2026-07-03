import React from 'react'
import Image from 'next/image'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { Trophy, Award, Flame, User as UserIcon, Check } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'

interface UserRank {
  _id: string
  name: string
  xp: number
  level: number
  streak: number
  image?: string
}

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return null
  }

  await dbConnect()

  const userId = session.user.id

  // Fetch top 10 users ranked by XP
  const rawUsers = await User.find()
    .select('name xp level streak image')
    .sort({ xp: -1 })
    .limit(10)
  
  const users: UserRank[] = JSON.parse(JSON.stringify(rawUsers))

  // Find the logged-in user's rank
  const loggedInUser = users.find((u) => u._id === userId) || await User.findById(userId).select('name xp level streak image')
  const userRankIndex = users.findIndex((u) => u._id === userId) + 1

  // Achievements logic
  const streak = loggedInUser?.streak || 0
  const level = loggedInUser?.level || 1

  const achievements = [
    {
      id: 'bronze-monarch',
      title: 'Bronze Monarch',
      desc: 'Maintain a 3-day consistency streak.',
      unlocked: streak >= 3,
      icon: <Award className={`w-8 h-8 ${streak >= 3 ? 'text-amber-600' : 'text-zinc-500'}`} />
    },
    {
      id: 'silver-monarch',
      title: 'Silver Monarch',
      desc: 'Maintain a 5-day consistency streak.',
      unlocked: streak >= 5,
      icon: <Award className={`w-8 h-8 ${streak >= 5 ? 'text-zinc-400' : 'text-zinc-500'}`} />
    },
    {
      id: 'gold-monarch',
      title: 'Gold Monarch',
      desc: 'Maintain a 7-day consistency streak.',
      unlocked: streak >= 7,
      icon: <Award className={`w-8 h-8 ${streak >= 7 ? 'text-amber-500 fill-current' : 'text-zinc-500'}`} />
    },
    {
      id: 'shadow-monarch',
      title: 'Shadow Monarch',
      desc: 'Maintain a 15-day consistency streak.',
      unlocked: streak >= 15,
      icon: <Award className={`w-8 h-8 ${streak >= 15 ? 'text-indigo-500 fill-current animate-pulse' : 'text-zinc-500'}`} />
    },
    {
      id: 'level-5',
      title: 'Monarch Level V',
      desc: 'Arise to Level 5 or higher.',
      unlocked: level >= 5,
      icon: <Trophy className={`w-8 h-8 ${level >= 5 ? 'text-indigo-500' : 'text-zinc-500'}`} />
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white font-sans">Leaderboard</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm font-medium">Rankings, milestones, and XP consistency points</p>
      </div>

      {/* Grid: Rankings & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Top Rankings Table (spans 2) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border bg-card/30">
            <CardHeader className="pb-2 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Global Rankings</CardTitle>
                <CardDescription className="text-xs">Top players sorted by total leveling XP</CardDescription>
              </div>
              <Trophy className="w-5 h-5 text-amber-500" />
            </CardHeader>
            <CardContent className="py-4 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">
                      <th className="px-6 py-3">Rank</th>
                      <th className="px-6 py-3">Player</th>
                      <th className="px-6 py-3 text-center">Level</th>
                      <th className="px-6 py-3 text-center">Streak</th>
                      <th className="px-6 py-3 text-right">Total XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => {
                      const isSelf = u._id === userId
                      const rank = i + 1
                      return (
                        <tr 
                          key={u._id} 
                          className={`border-b border-border/20 transition-colors ${
                            isSelf 
                              ? 'bg-indigo-500/5 hover:bg-indigo-500/10 font-bold' 
                              : 'hover:bg-zinc-150/50 dark:hover:bg-zinc-900/10'
                          }`}
                        >
                          <td className="px-6 py-3.5">
                            {rank === 1 ? (
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white font-extrabold text-xs">1</span>
                            ) : rank === 2 ? (
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-300 text-zinc-800 font-extrabold text-xs">2</span>
                            ) : rank === 3 ? (
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white font-extrabold text-xs">3</span>
                            ) : (
                              <span className="text-zinc-400 pl-2 font-mono">{rank}</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 flex items-center gap-3">
                            {u.image ? (
                              <Image
                                src={u.image}
                                alt={u.name}
                                width={28}
                                height={28}
                                className="h-7 w-7 rounded-full border border-border object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                                <UserIcon className="w-4 h-4" />
                              </div>
                            )}
                            <span className={isSelf ? 'text-indigo-500' : 'text-zinc-800 dark:text-zinc-200'}>
                              {u.name} {isSelf && <span className="text-[9px] font-extrabold px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-500 uppercase ml-1">You</span>}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-center font-mono font-bold text-zinc-700 dark:text-zinc-300">{u.level}</td>
                          <td className="px-6 py-3.5 text-center">
                            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-500">
                              <Flame className="w-3.5 h-3.5 fill-current" />
                              {u.streak}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono font-bold text-zinc-900 dark:text-white">
                            {u.xp.toLocaleString()} XP
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Achievements & Badges (spans 1) */}
        <div className="space-y-6">
          {/* User Rank Card */}
          {loggedInUser && (
            <Card className="border-border bg-card/30">
              <CardContent className="p-6 text-center space-y-3">
                <p className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Your Standing</p>
                
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-500 text-2xl font-extrabold shadow-sm">
                  Lvl {level}
                </div>

                <div>
                  <h3 className="font-extrabold text-lg text-zinc-950 dark:text-white">{loggedInUser.name}</h3>
                  <p className="text-xs text-indigo-500 font-bold mt-1">Rank #{userRankIndex} global</p>
                </div>

                <div className="flex gap-4 justify-center text-xs font-semibold text-zinc-400 pt-2 border-t border-border/40">
                  <div className="text-center">
                    <p className="text-zinc-500">Streak</p>
                    <p className="text-amber-500 font-extrabold font-mono flex items-center gap-0.5 justify-center mt-0.5">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      {streak}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-zinc-500">Total XP</p>
                    <p className="text-zinc-900 dark:text-white font-extrabold font-mono mt-0.5">{loggedInUser.xp} XP</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Streak achievements */}
          <Card className="border-border bg-card/30">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500">Streaks Achievements</CardTitle>
              <CardDescription className="text-[10px]">Dynamic badges unlocked via consistency</CardDescription>
            </CardHeader>
            <CardContent className="py-4 space-y-3.5">
              {achievements.map((ach) => (
                <div 
                  key={ach.id} 
                  className={`flex items-center gap-3.5 p-3 rounded-lg border transition-all ${
                    ach.unlocked 
                      ? 'bg-indigo-500/5 border-indigo-500/20' 
                      : 'bg-zinc-100/40 dark:bg-zinc-950/20 border-border opacity-70'
                  }`}
                >
                  <div className={`p-2 rounded-lg border bg-background flex-shrink-0 ${ach.unlocked ? 'border-indigo-500/30' : 'border-border'}`}>
                    {ach.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className={`text-xs font-bold truncate ${ach.unlocked ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                        {ach.title}
                      </h4>
                      {ach.unlocked && (
                        <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-indigo-500 text-white font-extrabold text-[8px]">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{ach.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
