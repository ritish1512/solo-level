'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Bell, Trash2, Plus } from 'lucide-react'

export interface ReminderConfig {
  enabled: boolean
  reminderTime: string // ISO date string for datetime, HH:MM format for time-only
  message?: string
  notificationType: 'email' | 'in-app' | 'both'
}

interface ReminderConfigPanelProps {
  configs: ReminderConfig[]
  onConfigsChange: (configs: ReminderConfig[]) => void
  title?: string
  description?: string
  timeOnly?: boolean // If true, use time input instead of datetime (for recurring habits)
}

const notificationTypes: Array<'email' | 'in-app' | 'both'> = ['email', 'in-app', 'both']

export function ReminderConfigPanel({
  configs,
  onConfigsChange,
  title = 'Reminder Settings',
  description = 'Configure when you want to be reminded',
  timeOnly = false,
}: ReminderConfigPanelProps) {
  const [localConfigs, setLocalConfigs] = useState<ReminderConfig[]>(configs)

  React.useEffect(() => {
    setLocalConfigs(configs)
  }, [configs])

  const handleAddConfig = () => {
    const newConfig: ReminderConfig = {
      enabled: true,
      reminderTime: timeOnly ? '09:00' : (() => {
        const now = new Date()
        now.setHours(now.getHours() + 1, 0, 0, 0)
        const tzOffset = now.getTimezoneOffset() * 60000
        const local = new Date(now.getTime() - tzOffset)
        return local.toISOString().slice(0, 16)
      })(),
      message: '',
      notificationType: 'both',
    }
    const updated = [...localConfigs, newConfig]
    setLocalConfigs(updated)
    onConfigsChange(updated)
  }

  const handleRemoveConfig = (index: number) => {
    const updated = localConfigs.filter((_, i) => i !== index)
    setLocalConfigs(updated)
    onConfigsChange(updated)
  }

  const handleToggleConfig = (index: number) => {
    const updated = [...localConfigs]
    updated[index].enabled = !updated[index].enabled
    setLocalConfigs(updated)
    onConfigsChange(updated)
  }

  const handleTimeChange = (index: number, value: string) => {
    const updated = [...localConfigs]
    updated[index].reminderTime = value
    setLocalConfigs(updated)
    onConfigsChange(updated)
  }

  const handleMessageChange = (index: number, value: string) => {
    const updated = [...localConfigs]
    updated[index].message = value
    setLocalConfigs(updated)
    onConfigsChange(updated)
  }

  const handleTypeChange = (index: number, value: string) => {
    const updated = [...localConfigs]
    updated[index].notificationType = value as 'email' | 'in-app' | 'both'
    setLocalConfigs(updated)
    onConfigsChange(updated)
  }

  return (
    <Card className="w-full bg-slate-900/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-indigo-400" />
          <div>
            <CardTitle className="text-indigo-100">{title}</CardTitle>
            <CardDescription className="text-slate-400">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {localConfigs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="mb-4">No reminders configured</p>
            <Button
              onClick={handleAddConfig}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </div>
        ) : (
          <>
            {localConfigs.map((config, index) => (
              <div
                key={index}
                className="flex flex-col md:flex-row items-center justify-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 transition"
              > <div className='flex items-center justify-center space-x-2'>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={() => handleToggleConfig(index)}
                  className="h-4 w-4 rounded border-slate-600 text-indigo-600 cursor-pointer"
                />

                <input
                  type={timeOnly ? 'time' : 'datetime-local'}
                  value={config.reminderTime}
                  onChange={(e) => handleTimeChange(index, e.target.value)}
                  className="w-38 h-8 bg-slate-700 border border-slate-600 text-slate-200 rounded px-2 text-sm"
                />
                </div>
                <input
                  type="text"
                  placeholder="Reason..."
                  value={config.message || ''}
                  onChange={(e) => handleMessageChange(index, e.target.value)}
                  className="w-32 h-8 bg-slate-700 border border-slate-600 text-slate-200 rounded px-2 text-sm"
                />
                <div className='flex flex-row items-center justify-evenly space-x-2'>
                  <select
                    value={config.notificationType}
                    onChange={(e) => handleTypeChange(index, e.target.value)}
                    className="w-18 h-8 bg-slate-700 border border-slate-600 text-slate-200 rounded px-2 text-sm"
                  >
                    {notificationTypes.map((type) => (
                      <option key={type} value={type} className="bg-slate-800">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>

                  <Button
                    onClick={() => handleRemoveConfig(index)}
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/20 ml-auto w-fit"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              onClick={handleAddConfig}
              className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/50"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Reminder
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
