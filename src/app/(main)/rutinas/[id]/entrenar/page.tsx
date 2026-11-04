'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  X, SkipForward, ArrowLeft, Play, Check, Dumbbell, Repeat, Layers, Timer, Minus, Plus, TrendingUp,
  Sparkles, PersonStanding, Flame, Weight, Trophy, Target, Clock, Disc3,
} from 'lucide-react'
import { supabase } from '@/core/supabase/browser'
import { checkNewBadges } from '@/core/appChecks'
import {
  ExerciseInfo, ExerciseResult, Recommendation, TrainingProfile, WeightHistory, WorkoutReport,
  averageReps, buildWorkoutReport, formatDuration, isBodyweight, loadWeightHistory, parseWeight, recommendWeight,
  saveExerciseLog, weightStepFor,
} from '@/core/training'
import { REGION_LABEL, Region, heatColor, sessionHeat } from '@/core/muscles'
import { estimateOneRepMax, formatKg, platesPerSide, strengthLevel, warmupSets } from '@/core/gym'
import Body3D from '@/components/body/Body3D'
import { BodyVariant, variantForGender } from '@/components/body/BodyMap'
import FadeIn from '@/components/ui/FadeIn'
import { TIER_STYLE } from '@/components/ui/tierStyle'
import GradientButton from '@/components/ui/GradientButton'
import IconBadge from '@/components/ui/IconBadge'
import AnimatedRing from '@/components/ui/AnimatedRing'
import TiltCard from '@/components/ui/TiltCard'
import CountUp from '@/components/ui/CountUp'
import Confetti from '@/components/ui/Confetti'
import Skeleton from '@/components/ui/Skeleton'
import { GlowOrb } from '@/components/ui/Aurora'
import { colors, glow, gradientCss, gradients, GradientColors } from '@/components/ui/theme'

type FlatExercise = {
  id: string
  info: ExerciseInfo
  gif_url: string | null
  sets: number
  reps: string
  rest_seconds: number
}

const DAY_GRADIENTS = [gradients.brand, gradients.ocean, gradients.violet, gradients.ember, gradients.gold]

const RECOMMENDATION_ICON = { subir: TrendingUp, mantener: Repeat, inicial: Sparkles, corporal: PersonStanding }

// Colores estándar de los discos olímpicos
const PLATE_COLORS: Record<number, string> = { 25: '#dc2626', 20: '#2563eb', 15: '#facc15', 10: '#16a34a', 5: '#e5e7eb', 2.5: '#475569', 1.25: '#94a3b8' }

// Barra superior que avanza con cada ejercicio
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-[#1c2523] overflow-hidden flex-1 mx-3">
      <div className="h-full rounded-full" style={{ width: `${value * 100}%`, background: gradientCss(gradients.brand, 'horizontal'), transition: 'width 0.5s cubic-bezier(0.22, 1, 0.36, 1)' }} />
    </div>
  )
}

// Puntos de las series: hechas en verde, la actual late, las que faltan en gris
function SetDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-2 mt-4">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        return (
          <div
            key={n}
            className={`flex-1 h-2 rounded ${n === current ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: n <= current ? colors.primary : colors.surface2 }}
          />
        )
      })}
    </div>
  )
}

function ClockChip({ seconds, label }: { seconds: number; label?: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#1c2523] border border-[#2a3532] rounded-full px-3 py-1.5">
      <Timer color={colors.primary} size={13} />
      <span className="text-white text-xs font-bold tabular-nums">{(label ? label + ' ' : '') + formatDuration(seconds)}</span>
    </div>
  )
}

// Peso del ejercicio: -/+ por pasos, teclado numérico (acepta coma o punto) y sugerencia
function WeightCard({
  info, value, onChange, recommendation, firstSet,
}: {
  info: ExerciseInfo
  value: string
  onChange: (text: string) => void
  recommendation: Recommendation | null
  firstSet: boolean
}) {
  const bodyweight = isBodyweight(info)
  const step = weightStepFor(info)
  const current = parseWeight(value)
  const plates = info.equipment === 'barra' && current !== null ? platesPerSide(current) : null
  const warmup = firstSet && current !== null && (info.equipment === 'barra' || info.equipment === 'maquina') ? warmupSets(current, step) : []
  const nudge = (delta: number) => {
    const next = Math.max(0, Math.round(((parseWeight(value) ?? 0) + delta) * 100) / 100)
    onChange(String(next))
  }
  const RecIcon = recommendation ? RECOMMENDATION_ICON[recommendation.kind] : Sparkles
  const suggested = recommendation?.weightKg ?? null
  const showUse = suggested !== null && parseWeight(value) !== suggested

  return (
    <div className="card-dark rounded-3xl p-4 mt-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Weight color={colors.primary} size={16} />
          <p className="text-white font-bold text-sm">{bodyweight ? 'Lastre (opcional)' : 'Peso de hoy'}</p>
        </div>
        {recommendation?.lastWeight !== null && recommendation?.lastWeight !== undefined ? (
          <p className="text-[#9ca8a5] text-xs">{'Última vez: ' + recommendation.lastWeight + ' kg'}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => nudge(-step)} aria-label={`Bajar ${step} kilos`} className="press w-12 h-12 rounded-2xl bg-[#1c2523] border border-[#2a3532] flex items-center justify-center flex-shrink-0">
          <Minus color={colors.text} size={18} />
        </button>
        <div className="flex-1 min-w-0 flex items-center justify-center bg-[#1c2523] border border-[#2a3532] rounded-2xl h-14">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ''))}
            inputMode="decimal"
            placeholder={bodyweight ? '0' : '--'}
            aria-label="Peso en kilos"
            className="bg-transparent outline-none text-white text-[28px] font-extrabold text-center w-24 placeholder:text-[#6b7876]"
          />
          <span className="text-[#9ca8a5] font-semibold">kg</span>
        </div>
        <button type="button" onClick={() => nudge(step)} aria-label={`Subir ${step} kilos`} className="press w-12 h-12 rounded-2xl bg-[#1c2523] border border-[#2a3532] flex items-center justify-center flex-shrink-0">
          <Plus color={colors.text} size={18} />
        </button>
      </div>

      {recommendation ? (
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-2xl p-3 mt-3">
          <RecIcon color={colors.primary} size={18} className="flex-shrink-0" />
          <p className="text-[#c9d1cf] text-xs flex-1 leading-4">{recommendation.message}</p>
          {showUse ? (
            <button type="button" onClick={() => onChange(String(suggested))} aria-label={`Usar ${suggested} kilos`} className="press bg-green-500 rounded-full px-3 py-1.5 text-black text-xs font-extrabold whitespace-nowrap">
              {'Usar ' + suggested + ' kg'}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Calculadora de discos (barra olímpica de 20 kg) */}
      {plates ? (
        <div className="flex items-center flex-wrap gap-1.5 mt-3">
          <Disc3 color={colors.soft} size={14} />
          <span className="text-[#9ca8a5] text-xs mr-1">{plates.length ? 'Por lado:' : 'Solo la barra (20 kg)'}</span>
          {plates.map((p, i) => (
            <span key={i} className="rounded-full px-2 py-0.5 text-[11px] font-extrabold" style={{ backgroundColor: PLATE_COLORS[p] || colors.surface2, color: p >= 5 && p !== 15 ? '#ffffff' : '#0a0f0d' }}>
              {formatKg(p)}
            </span>
          ))}
        </div>
      ) : info.equipment === 'mancuernas' && current ? (
        <p className="text-[#6b7876] text-xs mt-3">{formatKg(current) + ' kg en cada mancuerna'}</p>
      ) : null}

      {/* Calentamiento antes de la primera serie */}
      {warmup.length ? (
        <div className="bg-[#1c2523] rounded-2xl p-3 mt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Flame color={colors.orange} size={14} />
            <p className="text-white text-xs font-bold">Calentamiento sugerido</p>
          </div>
          <div className="flex gap-2">
            {warmup.map((w, i) => (
              <div key={i} className="flex-1 bg-[#0a0f0d] rounded-xl py-2 text-center">
                <p className="text-white text-sm font-extrabold">{formatKg(w.weight) + ' kg'}</p>
                <p className="text-[#6b7876] text-[11px]">{'× ' + w.reps}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StatTile({ icon, colors: gradient, label, children }: { icon: ReactNode; colors: GradientColors; label: string; children: ReactNode }) {
  return (
    <div className="card-dark rounded-3xl p-4">
      <IconBadge colors={gradient} size={32} radius={10}>{icon}</IconBadge>
      <p className="text-[#9ca8a5] text-xs mt-3">{label}</p>
      {children}
    </div>
  )
}

// Resumen final: rango, estadísticas, mapa de calor, para qué sirvió y detalle por ejercicio
function WorkoutSummary({
  report, results, variant, profile, onClose, onOpenBody,
}: {
  report: WorkoutReport
  results: ExerciseResult[]
  variant: BodyVariant
  profile: TrainingProfile
  onClose: () => void
  onOpenBody: () => void
}) {
  const tier = TIER_STYLE[report.tier]
  const TierIcon = tier.icon
  const heat = sessionHeat(results.map((r) => ({ name: r.exercise.name, muscleGroup: r.exercise.muscleGroup, sets: r.sets })))
  const hottest = (Object.entries(heat) as [Region, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  return (
    <div className="relative max-w-xl mx-auto px-4 py-8 overflow-hidden">
      <GlowOrb color={tier.colors[1]} size={420} style={{ top: -120, left: 'calc(50% - 210px)' }} intensity={0.3} />

      <FadeIn className="relative text-center mb-5">
        <p className="text-green-500 text-xs font-bold uppercase" style={{ letterSpacing: 2 }}>Entrenamiento completado</p>
        <h1 className="text-white text-3xl font-extrabold mt-1">¡Gran trabajo! 💪</h1>
      </FadeIn>

      {/* Rango */}
      <FadeIn delay={120} className="relative mb-4">
        <TiltCard float glare radius={30} maxTilt={8} style={glow(tier.colors[1], 28, 0.45)}>
          <div className="flex flex-col items-center p-6" style={{ borderRadius: 30, background: gradientCss(tier.colors) }}>
            <p className="text-[11px] font-extrabold opacity-75" style={{ color: tier.text, letterSpacing: 2 }}>RANGO DE LA SESIÓN</p>
            <div className="w-20 h-20 rounded-full flex items-center justify-center my-3" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
              <TierIcon color={tier.text} size={40} strokeWidth={2.2} />
            </div>
            <p className="text-[34px] font-black" style={{ color: tier.text }}>{report.tier}</p>
            <p className="mt-1" style={{ color: tier.text }}>
              <CountUp value={report.score} delay={300} className="text-[22px] font-extrabold" />
              <span className="text-[13px] opacity-70 ml-0.5">/100</span>
            </p>
          </div>
        </TiltCard>
      </FadeIn>

      {/* Estadísticas */}
      <FadeIn delay={200} className="relative grid grid-cols-2 gap-3 mb-4">
        <StatTile icon={<Clock color="#04120a" size={15} />} colors={gradients.brand} label="Tiempo total">
          <p className="text-white text-2xl font-extrabold">{formatDuration(report.totalSeconds)}</p>
          <p className="text-[#6b7876] text-[11px]">{'Estimado ' + formatDuration(report.estimatedSeconds)}</p>
        </StatTile>
        <StatTile icon={<Weight color="#ffffff" size={15} />} colors={gradients.violet} label="Volumen movido">
          <p>
            <CountUp value={Math.round(report.volumeKg)} delay={300} className="text-white text-2xl font-extrabold" />
            <span className="text-[#9ca8a5] text-xs ml-1">kg</span>
          </p>
          <p className="text-[#6b7876] text-[11px]">peso × series × reps</p>
        </StatTile>
        <StatTile icon={<Flame color="#ffffff" size={15} />} colors={gradients.ember} label="Calorías aprox.">
          <p>
            <CountUp value={report.calories} delay={300} className="text-white text-2xl font-extrabold" />
            <span className="text-[#9ca8a5] text-xs ml-1">kcal</span>
          </p>
        </StatTile>
        <StatTile icon={<Trophy color="#422006" size={15} />} colors={gradients.gold} label="Récords personales">
          <p className="text-white text-2xl font-extrabold">{report.personalRecords.length}</p>
          <p className="text-[#6b7876] text-[11px] truncate">{report.personalRecords.length ? report.personalRecords.join(', ') : 'Sigue sumando'}</p>
        </StatTile>
      </FadeIn>

      {/* Por qué este rango */}
      <FadeIn delay={260} className="relative card-dark rounded-3xl p-5 mb-4">
        <p className="text-white font-bold mb-3">Por qué este rango</p>
        {report.reasons.map((reason) => (
          <div key={reason} className="flex items-center gap-2.5 mb-2">
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Check color={colors.primary} size={12} strokeWidth={3} />
            </div>
            <p className="text-[#c9d1cf] text-sm">{reason}</p>
          </div>
        ))}
      </FadeIn>

      {/* Mapa de calor de la sesión */}
      <FadeIn delay={300} className="relative card-dark rounded-3xl p-5 mb-4 flex flex-col items-center">
        <div className="flex items-center gap-2 self-start mb-1">
          <Flame color={colors.orange} size={18} />
          <p className="text-white font-bold">Zonas trabajadas hoy</p>
        </div>
        <p className="text-[#6b7876] text-xs self-start mb-4">Arrastra el cuerpo de lado para ver la espalda</p>
        <Body3D variant={variant} values={heat} width={190} glowColor={colors.orange} />
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {hottest.map(([region, value]) => (
            <div key={region} className="flex items-center gap-1.5 bg-[#1c2523] rounded-full px-3 py-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: heatColor(value) }} />
              <span className="text-white text-xs font-semibold">{REGION_LABEL[region]}</span>
            </div>
          ))}
        </div>
        <button type="button" onClick={onOpenBody} className="press flex items-center gap-1.5 px-4 py-2 rounded-full border border-green-500/40 mt-3.5">
          <TrendingUp color={colors.primary} size={14} />
          <span className="text-green-500 text-xs font-bold">Ver la evolución de mi cuerpo</span>
        </button>
      </FadeIn>

      {/* Para qué sirvió */}
      <FadeIn delay={340} className="relative card-dark rounded-3xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Target color={colors.primary} size={18} />
          <p className="text-white font-bold">¿Para qué te sirvió?</p>
        </div>
        <p className="text-[#9ca8a5] text-sm leading-5 mb-4">{report.purpose}</p>
        {report.muscles.map((m, i) => (
          <div key={m.group} className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="text-white text-sm font-semibold">{m.label}</span>
              <span className="text-[#9ca8a5] text-xs">{m.sets + (m.sets === 1 ? ' serie' : ' series')}</span>
            </div>
            <div className="h-2 rounded-full bg-[#1c2523] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.max(8, m.share * 100)}%`, background: gradientCss(DAY_GRADIENTS[i % DAY_GRADIENTS.length], 'horizontal') }} />
            </div>
          </div>
        ))}
      </FadeIn>

      {/* Detalle por ejercicio */}
      <FadeIn delay={380} className="relative card-dark rounded-3xl p-5 mb-6">
        <p className="text-white font-bold mb-3">Tu sesión</p>
        {results.map((r, i) => {
          const record = report.personalRecords.includes(r.exercise.name)
          const oneRm = r.weightKg ? estimateOneRepMax(r.weightKg, averageReps(r.reps)) : null
          const level = oneRm ? strengthLevel(r.exercise.name, oneRm, profile.weightKg, profile.gender) : null
          return (
            <div key={i} className={`flex items-center gap-3 py-2.5 ${i < results.length - 1 ? 'border-b border-[#2a3532]' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold">{r.exercise.name}</p>
                <p className="text-[#6b7876] text-xs mt-0.5">
                  {r.sets + ' × ' + r.reps + ' · ' + (r.weightKg ? r.weightKg + ' kg' : isBodyweight(r.exercise) ? 'Peso corporal' : 'Sin peso') + (oneRm ? ' · 1RM ~' + formatKg(oneRm) + ' kg' : '')}
                </p>
                {level ? (
                  <p className="text-violet-300 text-[11px] mt-0.5">
                    {'Nivel ' + level.level + ' · ' + formatKg(level.ratio) + '× tu peso' + (level.next ? ' · ' + level.next.level + ' con 1RM de ' + formatKg(level.next.kg) + ' kg' : '')}
                  </p>
                ) : null}
              </div>
              {record ? <span className="bg-yellow-500/15 text-yellow-400 rounded-full px-2 py-0.5 text-[10px] font-extrabold">RÉCORD</span> : null}
              <span className="text-[#9ca8a5] text-xs tabular-nums">{formatDuration(r.durationSeconds)}</span>
            </div>
          )
        })}
      </FadeIn>

      <GradientButton title="Volver" onClick={onClose} icon={<Check color="#04120a" size={18} strokeWidth={3} />} className="relative w-full" />
      <Confetti />
    </div>
  )
}

function Entrenar() {
  const { id } = useParams<{ id: string }>()
  const dayId = useSearchParams().get('dayId')
  // Si se llega con un día recomendado (desde Inicio), arranca directo en ese día
  const autoStarted = useRef(false)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState<any | null>(null)
  const [queue, setQueue] = useState<FlatExercise[]>([])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [phase, setPhase] = useState<'exercise' | 'resting' | 'done'>('exercise')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [restRound, setRestRound] = useState(0)

  // Cronómetro: inicio de la sesión y del ejercicio actual; "now" avanza cada segundo
  const [now, setNow] = useState(0)
  const sessionStart = useRef(0)
  const exerciseStart = useRef(0)

  const [profile, setProfile] = useState<TrainingProfile>({ weightKg: null, gender: null, goal: null, activityLevel: null })
  const [history, setHistory] = useState<WeightHistory>({})
  const [weights, setWeights] = useState<Record<string, string>>({})
  const [results, setResults] = useState<ExerciseResult[]>([])
  const [report, setReport] = useState<WorkoutReport | null>(null)

  useEffect(() => {
    const load = async () => {
      const [{ data }, { data: { user } }] = await Promise.all([
        supabase
          .from('routine_days')
          .select('id, day_number, title, routine_exercises(id, exercise_id, sets, reps, rest_seconds, order_index, exercises(name, gif_url, muscle_group, equipment, difficulty))')
          .eq('routine_id', id)
          .order('day_number', { ascending: true }),
        supabase.auth.getUser(),
      ])
      setDays(data || [])

      if (user) {
        const { data: p } = await supabase
          .from('profiles')
          .select('weight_kg, gender, goal, activity_level')
          .eq('id', user.id)
          .single()
        if (p) setProfile({ weightKg: p.weight_kg ? Number(p.weight_kg) : null, gender: p.gender, goal: p.goal, activityLevel: p.activity_level })
      }
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (autoStarted.current || loading || !dayId) return
    const day = days.find((d) => d.id === dayId)
    autoStarted.current = true
    if (day && day.routine_exercises?.length) startDay(day)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, days, dayId])

  // El reloj corre mientras se entrena
  useEffect(() => {
    if (!selectedDay || phase === 'done') return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [selectedDay, phase])

  const startDay = async (day: any) => {
    const flat: FlatExercise[] = [...day.routine_exercises]
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((ex: any) => ({
        id: ex.id,
        info: {
          exerciseId: ex.exercise_id,
          name: ex.exercises?.name || 'Ejercicio',
          muscleGroup: ex.exercises?.muscle_group ?? null,
          equipment: ex.exercises?.equipment ?? null,
          difficulty: ex.exercises?.difficulty ?? null,
        },
        gif_url: ex.exercises?.gif_url,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds || 60,
      }))
    setQueue(flat)
    setSelectedDay(day)
    setCurrentIndex(0)
    setCurrentSet(1)
    setPhase('exercise')
    setResults([])
    sessionStart.current = Date.now()
    exerciseStart.current = Date.now()
    setNow(Date.now())

    const { data: { user } } = await supabase.auth.getUser()
    if (user) setHistory(await loadWeightHistory(user.id, flat.map((f) => f.info.exerciseId)))
  }

  useEffect(() => {
    if (phase !== 'resting') return
    if (secondsLeft <= 0) {
      goToNextStep()
      return
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft])

  const currentExercise = queue[currentIndex]
  const currentHistory = currentExercise ? history[currentExercise.info.exerciseId] || [] : []
  const recommendation = currentExercise ? recommendWeight(currentExercise.info, currentHistory, profile) : null

  // Al llegar a cada ejercicio, el campo de peso arranca con la sugerencia
  useEffect(() => {
    if (!currentExercise || weights[currentExercise.id] !== undefined || !recommendation) return
    if (recommendation.weightKg !== null && !isBodyweight(currentExercise.info)) {
      setWeights((w) => ({ ...w, [currentExercise.id]: String(recommendation.weightKg) }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExercise?.id, history])

  const finishExercise = () => {
    if (!currentExercise) return Promise.resolve()
    const durationSeconds = Math.round((Date.now() - exerciseStart.current) / 1000)
    const weightKg = parseWeight(weights[currentExercise.id] || '')
    const result: ExerciseResult = {
      exercise: currentExercise.info,
      sets: currentExercise.sets,
      reps: currentExercise.reps,
      restSeconds: currentExercise.rest_seconds,
      weightKg: weightKg && weightKg > 0 ? weightKg : null,
      durationSeconds,
      previous: currentHistory,
    }
    setResults((r) => [...r, result])
    exerciseStart.current = Date.now()

    return supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      return saveExerciseLog({
        userId: user.id,
        routineExerciseId: currentExercise.id,
        exerciseId: currentExercise.info.exerciseId,
        sets: currentExercise.sets,
        reps: currentExercise.reps,
        weightKg: result.weightKg,
        durationSeconds,
      }).then(() => undefined)
    })
  }

  const goToNextStep = () => {
    if (!currentExercise) return
    if (currentSet < currentExercise.sets) {
      setCurrentSet((s) => s + 1)
      setPhase('exercise')
      return
    }
    const logged = finishExercise()
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1)
      setCurrentSet(1)
      setPhase('exercise')
    } else {
      setPhase('done')
      // Cuando se guarda el último ejercicio, revisa si el entrenamiento desbloqueó insignias
      logged.then(() => checkNewBadges())
    }
  }

  // El informe se arma una vez, con todos los resultados ya acumulados
  useEffect(() => {
    if (phase !== 'done' || report || results.length !== queue.length) return
    const totalSeconds = Math.round((Date.now() - sessionStart.current) / 1000)
    setReport(buildWorkoutReport(results, totalSeconds, profile))
  }, [phase, results, queue.length, report, profile])

  const handleCompleteSet = () => {
    if (!currentExercise) return
    setSecondsLeft(currentExercise.rest_seconds)
    setRestRound((r) => r + 1)
    setPhase('resting')
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 space-y-3">
        <Skeleton height={28} width={220} radius={10} />
        <Skeleton height={86} radius={22} />
        <Skeleton height={86} radius={22} />
        <Skeleton height={86} radius={22} />
      </div>
    )
  }

  // ----- Elegir el día -----
  if (!selectedDay) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <button type="button" onClick={() => router.back()} aria-label="Volver" className="mb-5 text-[#9ca8a5] hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <FadeIn>
          <p className="text-green-500 text-xs font-bold uppercase" style={{ letterSpacing: 2 }}>Hora de entrenar</p>
          <h1 className="text-white text-3xl font-extrabold mt-1">¿Qué día vas a entrenar?</h1>
          <p className="text-[#9ca8a5] text-sm mt-1 mb-6">Elige el día de tu rutina</p>
        </FadeIn>
        {days.length === 0 ? <p className="text-[#9ca8a5] text-center mt-10">Esta rutina todavía no tiene días.</p> : null}
        {days.map((day, i) => (
          <FadeIn key={day.id} delay={80 + i * 70}>
            <button type="button" onClick={() => startDay(day)} aria-label={'Entrenar ' + day.title} className="press w-full text-left card-dark card-dark-hover rounded-3xl p-4 mb-3 flex items-center gap-4">
              <IconBadge colors={DAY_GRADIENTS[i % DAY_GRADIENTS.length]} size={48} radius={16}>
                <span className="text-[18px] font-black" style={{ color: '#04120a' }}>{i + 1}</span>
              </IconBadge>
              <span className="flex-1 min-w-0">
                <span className="block text-white font-bold">{day.title}</span>
                <span className="block text-[#9ca8a5] text-xs mt-0.5">{(day.routine_exercises?.length || 0) + ' ejercicios'}</span>
              </span>
              <span className="bg-green-500 rounded-full p-2.5" style={glow(colors.primary, 10, 0.5)}>
                <Play color="#04120a" size={14} fill="#04120a" />
              </span>
            </button>
          </FadeIn>
        ))}
      </div>
    )
  }

  // ----- Terminado -----
  if (phase === 'done') {
    if (!report) {
      return (
        <div className="max-w-md mx-auto px-4 py-16">
          <Skeleton height={220} radius={30} />
        </div>
      )
    }
    return (
      <WorkoutSummary
        report={report}
        results={results}
        variant={variantForGender(profile.gender)}
        profile={profile}
        onClose={() => router.push('/rutinas')}
        onOpenBody={() => router.push('/cuerpo')}
      />
    )
  }

  const totalSeconds = Math.round((now - sessionStart.current) / 1000)
  const exerciseSeconds = Math.round((now - exerciseStart.current) / 1000)

  const nextLabel = currentExercise
    ? currentSet < currentExercise.sets
      ? `Serie ${currentSet + 1} de ${currentExercise.sets}`
      : queue[currentIndex + 1]?.info.name || 'Terminar'
    : ''

  // ----- Descanso -----
  if (phase === 'resting') {
    return (
      <div className="relative min-h-[calc(100vh-6rem)] md:min-h-screen flex flex-col items-center justify-center px-6 py-10 overflow-hidden">
        <GlowOrb color={colors.primary} size={380} style={{ top: 'calc(50% - 220px)', left: 'calc(50% - 190px)' }} intensity={0.3} duration={5} />
        <div className="absolute top-6 right-4">
          <ClockChip seconds={totalSeconds} />
        </div>
        <p className="relative text-[#9ca8a5] text-xs font-bold uppercase mb-6" style={{ letterSpacing: 3 }}>Descanso</p>
        <AnimatedRing key={restRound} progress={0} from={100} duration={(currentExercise?.rest_seconds || 60) * 1000} linear size={250} stroke={14}>
          <span className="text-white font-extrabold tabular-nums" style={{ fontSize: 64, lineHeight: '70px' }}>{secondsLeft}</span>
          <span className="text-[#9ca8a5] text-sm">segundos</span>
        </AnimatedRing>
        <div className="relative card-dark rounded-2xl px-4 py-3 mt-8 text-center">
          <p className="text-[#6b7876] text-xs">Siguiente</p>
          <p className="text-white font-semibold mt-0.5">{nextLabel}</p>
        </div>
        <button type="button" onClick={goToNextStep} className="press relative mt-5 flex items-center gap-2 px-5 py-3 rounded-full border border-[#2a3532]">
          <SkipForward color={colors.soft} size={16} />
          <span className="text-[#c9d1cf] text-sm font-semibold">Saltar descanso</span>
        </button>
      </div>
    )
  }

  // ----- Ejercicio -----
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center mb-3">
        <button
          type="button"
          onClick={() => { if (confirm('¿Salir del entrenamiento? Los ejercicios ya completados quedan guardados.')) router.push('/rutinas') }}
          aria-label="Salir del entrenamiento"
          className="text-[#6b7876] hover:text-white"
        >
          <X size={22} />
        </button>
        <ProgressBar value={(currentIndex + (currentSet - 1) / Math.max(1, currentExercise?.sets || 1)) / queue.length} />
        <span className="text-[#9ca8a5] text-xs font-semibold">{currentIndex + 1 + '/' + queue.length}</span>
      </div>
      <div className="flex justify-end mb-4">
        <ClockChip seconds={totalSeconds} label="Total" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <FadeIn key={currentExercise?.id}>
          <div className="rounded-3xl overflow-hidden border border-[#2a3532] mb-5" style={glow(colors.primary, 20, 0.18)}>
            {currentExercise?.gif_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentExercise.gif_url} alt={currentExercise.info.name} className="w-full aspect-square object-cover bg-[#1c2523]" />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center" style={{ background: gradientCss(gradients.steel) }}>
                <Dumbbell color={colors.muted} size={72} />
              </div>
            )}
          </div>
          <h1 className="text-white text-2xl font-extrabold">{currentExercise?.info.name}</h1>
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-1.5 bg-green-500/15 rounded-full px-3 py-1.5">
              <Layers color={colors.primary} size={13} />
              <span className="text-green-500 text-xs font-bold">{'Serie ' + currentSet + ' de ' + currentExercise?.sets}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#1c2523] rounded-full px-3 py-1.5">
              <Repeat color={colors.soft} size={13} />
              <span className="text-[#c9d1cf] text-xs font-semibold">{currentExercise?.reps + ' repeticiones'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#1c2523] rounded-full px-3 py-1.5">
              <Timer color={colors.soft} size={13} />
              <span className="text-[#c9d1cf] text-xs font-semibold tabular-nums">{'En este ejercicio ' + formatDuration(exerciseSeconds)}</span>
            </div>
          </div>
          <SetDots total={currentExercise?.sets || 1} current={currentSet} />
        </FadeIn>

        <div>
          {currentExercise ? (
            <WeightCard
              info={currentExercise.info}
              value={weights[currentExercise.id] ?? ''}
              onChange={(text) => setWeights((w) => ({ ...w, [currentExercise.id]: text }))}
              recommendation={recommendation}
              firstSet={currentSet === 1}
            />
          ) : null}

          <GradientButton title="Completar serie" onClick={handleCompleteSet} icon={<Check color="#04120a" size={18} strokeWidth={3} />} className="w-full mt-5" />
          <p className="text-[#6b7876] text-xs text-center mt-3">{'Después: ' + nextLabel}</p>
        </div>
      </div>
    </div>
  )
}

// useSearchParams exige un límite Suspense en Next.js
export default function EntrenarPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-10"><Skeleton height={86} radius={22} /></div>}>
      <Entrenar />
    </Suspense>
  )
}
