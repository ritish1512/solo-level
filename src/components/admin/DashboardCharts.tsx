'use client'

import React, { useState } from 'react'

interface ChartDataPoint {
  label: string
  value: number
  secondaryValue?: number
}

interface ChartProps {
  title: string
  data: ChartDataPoint[]
  type: 'area' | 'bar' | 'line'
  color?: 'violet' | 'emerald' | 'blue' | 'amber'
  loading?: boolean
}

export default function DashboardCharts({
  title,
  data,
  type,
  color = 'violet',
  loading = false,
}: ChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (loading || data.length === 0) {
    return (
      <div className="flex h-72 w-full animate-pulse flex-col justify-between rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md">
        <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex flex-1 items-end gap-3 pt-6">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="w-full rounded bg-zinc-200 dark:bg-zinc-800"
              style={{ height: `${20 + i * 12}%` }}
            />
          ))}
        </div>
      </div>
    )
  }

  // Color schemes
  const colorMap = {
    violet: {
      stroke: '#8b5cf6',
      fill: 'url(#gradient-violet)',
      glow: 'shadow-violet-500/20',
      text: 'text-violet-500',
      bg: 'bg-violet-500',
    },
    emerald: {
      stroke: '#10b981',
      fill: 'url(#gradient-emerald)',
      glow: 'shadow-emerald-500/20',
      text: 'text-emerald-500',
      bg: 'bg-emerald-500',
    },
    blue: {
      stroke: '#3b82f6',
      fill: 'url(#gradient-blue)',
      glow: 'shadow-blue-500/20',
      text: 'text-blue-500',
      bg: 'bg-blue-500',
    },
    amber: {
      stroke: '#f59e0b',
      fill: 'url(#gradient-amber)',
      glow: 'shadow-amber-500/20',
      text: 'text-amber-500',
      bg: 'bg-amber-500',
    },
  }

  const activeColor = colorMap[color]

  // Math configurations for SVG layouts
  const width = 500
  const height = 200
  const paddingX = 40
  const paddingY = 25

  const values = data.map((d) => d.value)
  const maxValue = Math.max(...values, 1)
  const minValue = Math.min(...values, 0)
  const range = maxValue - minValue

  // Generate SVG Coordinates
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2)
    const y = height - paddingY - ((d.value - minValue) / range) * (height - paddingY * 2)
    return { x, y, label: d.label, value: d.value, secondary: d.secondaryValue }
  })

  // Generate line path definition
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Generate area path definition
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : ''

  return (
    <div className="relative flex flex-col rounded-xl border border-border bg-card/25 p-6 backdrop-blur-md transition-all hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-tight text-zinc-700 dark:text-zinc-300">{title}</h3>
        {hoveredIndex !== null && (
          <div className="flex items-center gap-1.5 text-xs font-bold transition-all">
            <span className="text-zinc-400 dark:text-zinc-500">{points[hoveredIndex].label}:</span>
            <span className={activeColor.text}>
              {points[hoveredIndex].value}
              {points[hoveredIndex].secondary !== undefined && ` / ${points[hoveredIndex].secondary}`}
            </span>
          </div>
        )}
      </div>

      <div className="relative h-48 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full overflow-visible"
          aria-label={`${title} chart`}
        >
          <defs>
            <linearGradient id="gradient-violet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradient-emerald" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradient-blue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradient-amber" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            className="stroke-zinc-200/50 dark:stroke-zinc-800/40"
            strokeDasharray="4"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            className="stroke-zinc-200/50 dark:stroke-zinc-800/40"
            strokeDasharray="4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            className="stroke-zinc-300 dark:stroke-zinc-800"
          />

          {/* Y Axis Labels */}
          <text
            x={paddingX - 8}
            y={paddingY + 4}
            className="fill-zinc-400 text-[10px] font-semibold dark:fill-zinc-500"
            textAnchor="end"
          >
            {Math.round(maxValue)}
          </text>
          <text
            x={paddingX - 8}
            y={height / 2 + 4}
            className="fill-zinc-400 text-[10px] font-semibold dark:fill-zinc-500"
            textAnchor="end"
          >
            {Math.round(minValue + range / 2)}
          </text>
          <text
            x={paddingX - 8}
            y={height - paddingY + 4}
            className="fill-zinc-400 text-[10px] font-semibold dark:fill-zinc-500"
            textAnchor="end"
          >
            {Math.round(minValue)}
          </text>

          {/* X Axis Labels */}
          {data.map((d, i) => {
            const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2)
            // Show alternate labels on mobile to avoid overlapping
            if (data.length > 10 && i % 2 !== 0) return null
            return (
              <text
                key={i}
                x={x}
                y={height - 8}
                className="fill-zinc-400 text-[9px] font-bold dark:fill-zinc-500"
                textAnchor="middle"
              >
                {d.label}
              </text>
            )
          })}

          {/* Area Chart Implementation */}
          {type === 'area' && points.length > 0 && (
            <>
              <path d={areaPath} fill={activeColor.fill} className="animate-fade-in" />
              <path
                d={linePath}
                fill="none"
                stroke={activeColor.stroke}
                strokeWidth="2.5"
                className="animate-draw-line"
              />
            </>
          )}

          {/* Line Chart Implementation */}
          {type === 'line' && points.length > 0 && (
            <path
              d={linePath}
              fill="none"
              stroke={activeColor.stroke}
              strokeWidth="2.5"
              className="animate-draw-line"
            />
          )}

          {/* Bar Chart Implementation */}
          {type === 'bar' &&
            points.map((p, i) => {
              const barWidth = Math.max(12, (width - paddingX * 2) / data.length - 12)
              const xPos = p.x - barWidth / 2
              const barHeight = height - paddingY - p.y
              return (
                <rect
                  key={i}
                  x={xPos}
                  y={p.y}
                  width={barWidth}
                  height={Math.max(barHeight, 4)} // Ensure at least a small bump for zero values
                  rx="3"
                  ry="3"
                  fill={activeColor.stroke}
                  opacity={hoveredIndex === i ? '1' : '0.8'}
                  className="transition-all duration-200"
                />
              )
            })}

          {/* Hover Guides & Interactive Circles */}
          {points.map((p, i) => {
            const hitWidth = (width - paddingX * 2) / data.length
            return (
              <g key={i}>
                {/* Hotspot for mouse hover detection */}
                <rect
                  x={p.x - hitWidth / 2}
                  y={paddingY}
                  width={hitWidth}
                  height={height - paddingY * 2}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Vertical hover marker line */}
                {hoveredIndex === i && type !== 'bar' && (
                  <line
                    x1={p.x}
                    y1={paddingY}
                    x2={p.x}
                    y2={height - paddingY}
                    stroke={activeColor.stroke}
                    strokeWidth="1.2"
                    strokeDasharray="3"
                    opacity="0.6"
                  />
                )}

                {/* Hover dots for line/area chart */}
                {type !== 'bar' && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIndex === i ? '5' : '3.5'}
                    fill={hoveredIndex === i ? activeColor.stroke : '#ffffff'}
                    stroke={activeColor.stroke}
                    strokeWidth={hoveredIndex === i ? '1.5' : '2'}
                    className="transition-all duration-150 pointer-events-none dark:fill-zinc-950"
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
