'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { AiTask, expectedDuration, progressAt, recordDuration, remainingLabel, stageLabel } from '@/core/aiRequest'
import { colors, gradientCss, gradients } from './theme'

// Estado de una generación con IA. run() evita dobles envíos, mide cuánto tardó y deja ver
// la barra llena un momento antes de quitarla; work devuelve true si la generación salió bien.
export function useGeneration(task: AiTask) {
  const [active, setActive] = useState(false)
  const [done, setDone] = useState(false)
  const [expectedMs, setExpectedMs] = useState(30_000)
  const running = useRef(false)

  const run = useCallback(
    async (work: () => Promise<boolean>) => {
      if (running.current) return
      running.current = true
      const started = Date.now()
      setExpectedMs(await expectedDuration(task))
      setActive(true)
      const ok = await work().catch(() => false)
      if (ok) {
        await recordDuration(task, Date.now() - started)
        setDone(true)
        await new Promise((resolve) => setTimeout(resolve, 450))
      }
      setActive(false)
      setDone(false)
      running.current = false
    },
    [task]
  )

  return { task, active, done, expectedMs, run }
}

type Generation = ReturnType<typeof useGeneration>

// Barra de carga con la etapa y el tiempo estimado que falta
export default function GenerationProgress({ generation }: { generation: Generation }) {
  const { task, active, done, expectedMs } = generation
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active) return
    const start = Date.now()
    setElapsed(0)
    const timer = setInterval(() => setElapsed(Date.now() - start), 250)
    return () => clearInterval(timer)
  }, [active])

  if (!active) return null

  const percent = done ? 100 : progressAt(elapsed, expectedMs)

  return (
    <div className="relative card-dark rounded-3xl p-4 mb-5 fade-in">
      <div className="flex items-center gap-2 mb-2.5">
        <Sparkles color={colors.primary} size={16} className="flex-shrink-0" />
        <p className="text-white text-sm font-bold flex-1 min-w-0 truncate">{done ? '¡Listo!' : stageLabel(task, percent)}</p>
        <span className="text-green-500 text-sm font-extrabold tabular-nums">{Math.round(percent) + '%'}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Avance de la generación con IA"
        className="h-2.5 rounded-full bg-[#1c2523] overflow-hidden"
      >
        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: gradientCss(gradients.brand, 'horizontal'), transition: 'width 0.25s linear' }} />
      </div>
      <p className="text-[#9ca8a5] text-xs mt-2">{done ? 'Generado con IA' : remainingLabel(elapsed, expectedMs)}</p>
    </div>
  )
}
