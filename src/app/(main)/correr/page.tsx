'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Zap, Footprints, Pause, Play, Timer, Gauge, Flame, Trophy, Check, MapPin } from 'lucide-react'
import { supabase } from '@/core/supabase/browser'
import { checkNewBadges } from '@/core/appChecks'
import { formatDuration } from '@/core/training'
import {
  Activity, GeoPoint, LatLng, RunRecord, RunRecords, acceptPoint, currentPace, formatKm, formatPace, gpsQuality,
  loadRuns, newRecords, personalRecords, rankRun, runCalories, saveRouteLocally, saveRun, simplifyRoute,
} from '@/core/running'
import RouteView from '@/components/run/RouteView'
import FadeIn from '@/components/ui/FadeIn'
import GradientButton from '@/components/ui/GradientButton'
import IconBadge from '@/components/ui/IconBadge'
import TiltCard from '@/components/ui/TiltCard'
import CountUp from '@/components/ui/CountUp'
import Confetti from '@/components/ui/Confetti'
import { GlowOrb } from '@/components/ui/Aurora'
import { TIER_STYLE } from '@/components/ui/tierStyle'
import { colors, glow, gradientCss, gradients } from '@/components/ui/theme'

type Phase = 'setup' | 'countdown' | 'running' | 'summary'

const GOALS = [
  { label: 'Libre', meters: 0 },
  { label: '3 km', meters: 3000 },
  { label: '5 km', meters: 5000 },
  { label: '10 km', meters: 10000 },
]

type RunResult = {
  run: RunRecord
  route: LatLng[]
  records: string[]
  rank: ReturnType<typeof rankRun>
  saved: boolean
}

function LiveStat({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card-dark rounded-3xl p-3.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[#9ca8a5] text-xs">{label}</p>
      </div>
      <p className="text-white text-2xl font-extrabold mt-1 tabular-nums">{value}</p>
      {sub ? <p className="text-[#6b7876] text-[11px]">{sub}</p> : null}
    </div>
  )
}

// Botón que hay que mantener presionado 1 s: evita terminar la carrera por accidente
function HoldToFinish({ onComplete }: { onComplete: () => void }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = () => {
    setHolding(true)
    timer.current = setTimeout(onComplete, 1000)
  }
  const cancel = () => {
    setHolding(false)
    if (timer.current) clearTimeout(timer.current)
  }
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Mantén presionado para terminar"
        className="relative w-[84px] h-[84px] rounded-full border-[3px] border-red-500 overflow-hidden flex items-center justify-center touch-none select-none"
      >
        <span
          className="absolute inset-0 bg-red-500 origin-bottom"
          style={{ transform: `scaleY(${holding ? 1 : 0})`, transition: holding ? 'transform 1s linear' : 'transform 0.2s ease-out' }}
        />
        <span className="relative w-[22px] h-[22px] rounded bg-white" />
      </button>
      <p className="text-[#9ca8a5] text-xs mt-2">Mantén para terminar</p>
    </div>
  )
}

function SplitBars({ splits }: { splits: number[] }) {
  if (splits.length === 0) return null
  const fastest = Math.min(...splits)
  return (
    <div className="card-dark rounded-3xl p-5 mb-4">
      <p className="text-white font-bold mb-3">Parciales por kilómetro</p>
      {splits.map((s, i) => {
        const best = s === fastest
        return (
          <div key={i} className="flex items-center gap-3 mb-2">
            <span className="text-[#9ca8a5] text-xs w-10">{'Km ' + (i + 1)}</span>
            <div className="flex-1 h-3 rounded-full bg-[#1c2523] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.max(12, (fastest / s) * 100)}%`, background: gradientCss(best ? gradients.gold : gradients.brand, 'horizontal') }} />
            </div>
            <span className={`text-xs w-12 text-right tabular-nums ${best ? 'text-yellow-400 font-extrabold' : 'text-white font-semibold'}`}>{formatPace(s)}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function CorrerPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('setup')
  const [activity, setActivity] = useState<Activity>('correr')
  const [goal, setGoal] = useState(0)
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>('unknown')
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [count, setCount] = useState(3)
  const [records, setRecords] = useState<RunRecords | null>(null)
  const [weightKg, setWeightKg] = useState<number | null>(null)

  // En vivo (lo que se pinta) y referencias (lo que usa el GPS sin esperar a React)
  const [paused, setPaused] = useState(false)
  const [distance, setDistance] = useState(0)
  const [route, setRoute] = useState<LatLng[]>([])
  const [now, setNow] = useState(0)
  const [banner, setBanner] = useState<string | null>(null)
  const phaseRef = useRef<Phase>('setup')
  const pausedRef = useRef(false)
  const activityRef = useRef<Activity>('correr')
  const goalRef = useRef(0)
  const goalReached = useRef(false)
  const points = useRef<GeoPoint[]>([])
  const lastPoint = useRef<GeoPoint | null>(null)
  const distanceRef = useRef(0)
  const track = useRef<{ t: number; d: number }[]>([])
  const kmMarks = useRef<number[]>([]) // segundos transcurridos al completar cada km
  const startAt = useRef(0)
  const pausedMs = useRef(0)
  const pauseStartedAt = useRef(0)
  const watchId = useRef<number | null>(null)
  const wakeLock = useRef<WakeLockSentinel | null>(null)
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [result, setResult] = useState<RunResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [shortRun, setShortRun] = useState<RunResult | null>(null)

  const elapsedSeconds = useCallback(() => {
    const end = pausedRef.current ? pauseStartedAt.current : Date.now()
    return Math.max(0, (end - startAt.current - pausedMs.current) / 1000)
  }, [])

  const showBanner = useCallback((text: string) => {
    setBanner(text)
    if (bannerTimer.current) clearTimeout(bannerTimer.current)
    bannerTimer.current = setTimeout(() => setBanner(null), 3500)
  }, [])

  const onLocation = useCallback(
    (loc: GeolocationPosition) => {
      setPermission('granted')
      const acc = loc.coords.accuracy ?? null
      setAccuracy(acc)
      if (phaseRef.current !== 'running' || pausedRef.current) return
      const point: GeoPoint = { lat: loc.coords.latitude, lng: loc.coords.longitude, t: loc.timestamp }
      const { accept, meters } = acceptPoint(lastPoint.current, point, acc, activityRef.current)
      if (!accept) return
      lastPoint.current = point
      points.current.push(point)
      distanceRef.current += meters
      track.current.push({ t: point.t, d: distanceRef.current })
      if (track.current.length > 200) track.current.splice(0, track.current.length - 200)

      // Cada kilómetro completo: parcial y aviso
      while (kmMarks.current.length < Math.floor(distanceRef.current / 1000)) {
        const elapsed = elapsedSeconds()
        const previous = kmMarks.current[kmMarks.current.length - 1] || 0
        kmMarks.current.push(elapsed)
        showBanner(`Km ${kmMarks.current.length} · ${formatPace(elapsed - previous)} /km`)
      }
      if (goalRef.current && !goalReached.current && distanceRef.current >= goalRef.current) {
        goalReached.current = true
        showBanner('¡Objetivo cumplido! 🎉')
      }

      setDistance(distanceRef.current)
      if (points.current.length % 3 === 0 || points.current.length < 4) setRoute(simplifyRoute(points.current, 300))
    },
    [elapsedSeconds, showBanner]
  )

  const keepScreenOn = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) wakeLock.current = await navigator.wakeLock.request('screen')
    } catch {
      // Sin batería o sin permiso: la carrera sigue, pero la pantalla se puede apagar
    }
  }, [])

  const releaseScreen = useCallback(() => {
    wakeLock.current?.release().catch(() => undefined)
    wakeLock.current = null
  }, [])

  // Permiso y GPS desde que se abre la pantalla: así se ve la calidad de la señal antes de salir
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPermission('unsupported')
    } else {
      watchId.current = navigator.geolocation.watchPosition(
        onLocation,
        (err) => {
          if (err.code === err.PERMISSION_DENIED) setPermission('denied')
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      )
    }

    const loadContext = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: p }, runs] = await Promise.all([
        supabase.from('profiles').select('weight_kg').eq('id', user.id).single(),
        loadRuns(user.id).catch(() => []),
      ])
      setWeightKg(p?.weight_kg ? Number(p.weight_kg) : null)
      setRecords(personalRecords(runs))
    }
    loadContext()

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
      if (bannerTimer.current) clearTimeout(bannerTimer.current)
      releaseScreen()
    }
  }, [onLocation, releaseScreen])

  // Reloj en vivo
  useEffect(() => {
    if (phase !== 'running') return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [phase])

  // El navegador suelta el bloqueo de pantalla al cambiar de pestaña y avisa antes de perder la carrera
  useEffect(() => {
    if (phase !== 'running') return
    const onVisible = () => {
      if (document.visibilityState === 'visible') keepScreenOn()
    }
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('beforeunload', onLeave)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('beforeunload', onLeave)
    }
  }, [phase, keepScreenOn])

  const beginRun = () => {
    points.current = []
    lastPoint.current = null
    distanceRef.current = 0
    track.current = []
    kmMarks.current = []
    goalReached.current = false
    pausedMs.current = 0
    pausedRef.current = false
    activityRef.current = activity
    goalRef.current = goal
    setDistance(0)
    setRoute([])
    setPaused(false)
    startAt.current = Date.now()
    setNow(Date.now())
    phaseRef.current = 'running'
    setPhase('running')
    keepScreenOn()
  }

  const startCountdown = () => {
    setPhase('countdown')
    phaseRef.current = 'countdown'
    let n = 3
    setCount(n)
    const timer = setInterval(() => {
      n -= 1
      if (n === 0) {
        clearInterval(timer)
        beginRun()
      } else {
        setCount(n)
      }
    }, 1000)
  }

  const togglePause = () => {
    if (pausedRef.current) {
      pausedMs.current += Date.now() - pauseStartedAt.current
      lastPoint.current = null // al reanudar no se suma la distancia recorrida en pausa
      pausedRef.current = false
      setPaused(false)
    } else {
      pauseStartedAt.current = Date.now()
      pausedRef.current = true
      setPaused(true)
    }
    setNow(Date.now())
  }

  const save = async (base: RunResult) => {
    setSaving(true)
    setShortRun(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }
    const { id: _tmp, ...payload } = base.run
    const id = await saveRun(user.id, payload)
    if (id) {
      await saveRouteLocally(id, base.route)
      setResult({ ...base, run: { ...base.run, id }, saved: true })
      checkNewBadges()
    } else {
      setResult({ ...base, saved: false })
    }
    setSaving(false)
  }

  const finish = async () => {
    if (!pausedRef.current) {
      pauseStartedAt.current = Date.now()
      pausedRef.current = true
    }
    const duration = Math.round(elapsedSeconds())
    phaseRef.current = 'summary'
    releaseScreen()

    const meters = distanceRef.current
    const splits = kmMarks.current.map((mark, i) => Math.round(mark - (kmMarks.current[i - 1] || 0)))
    const run: RunRecord = {
      id: 'nueva',
      activity: activityRef.current,
      started_at: new Date(startAt.current).toISOString(),
      duration_seconds: duration,
      distance_m: Math.round(meters * 10) / 10,
      avg_pace_seconds: meters >= 100 ? Math.round(duration / (meters / 1000)) : null,
      best_km_seconds: splits.length ? Math.min(...splits) : null,
      splits_seconds: splits,
      steps: null, // el navegador no tiene podómetro
      calories: runCalories(weightKg, meters, activityRef.current),
    }

    const { data: { user } } = await supabase.auth.getUser()
    const previous = user ? await loadRuns(user.id).catch(() => []) : []
    const recs = newRecords(run, previous)
    const base: RunResult = { run, route: simplifyRoute(points.current), records: recs, rank: rankRun(run, previous, recs), saved: false }
    setResult(base)
    setPhase('summary')

    if (meters < 100) {
      setShortRun(base)
      return
    }
    save(base)
  }

  const elapsed = phase === 'running' ? (paused ? (pauseStartedAt.current - startAt.current - pausedMs.current) / 1000 : (now - startAt.current - pausedMs.current) / 1000) : 0
  const avgPace = distance >= 50 ? elapsed / (distance / 1000) : null
  const livePace = currentPace(track.current)
  const quality = gpsQuality(accuracy)

  // ----- Resumen -----
  if (phase === 'summary' && result) {
    const tier = TIER_STYLE[result.rank.tier]
    const TierIcon = tier.icon
    const { run } = result

    // Menos de 100 m: se pregunta antes de guardar
    if (shortRun) {
      return (
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="card-dark rounded-3xl p-6 text-center">
            <p className="text-white font-bold text-lg">Recorrido muy corto</p>
            <p className="text-[#9ca8a5] text-sm mt-1">Registramos menos de 100 m. ¿La guardamos igual?</p>
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => router.back()} className="btn-secondary flex-1 rounded-xl py-3 text-sm">Descartar</button>
              <button type="button" onClick={() => save(shortRun)} className="btn-primary flex-1 rounded-xl py-3 text-sm">Guardar</button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="relative max-w-xl mx-auto px-4 py-8 overflow-hidden">
        <GlowOrb color={colors.primary} size={380} style={{ top: -140, left: 'calc(50% - 190px)' }} intensity={0.28} />
        <FadeIn className="relative text-center mb-4">
          <p className="text-green-500 text-xs font-bold uppercase" style={{ letterSpacing: 2 }}>{run.activity === 'correr' ? 'Carrera completada' : 'Caminata completada'}</p>
          <p className="mt-1">
            <CountUp value={run.distance_m / 1000} decimals={2} className="text-white font-black" style={{ fontSize: 56 }} />
            <span className="text-[#9ca8a5] text-lg font-bold ml-1.5">km</span>
          </p>
        </FadeIn>

        <FadeIn delay={80} className="relative card-dark rounded-3xl overflow-hidden mb-4">
          <RouteView route={result.route} width={560} height={240} />
        </FadeIn>

        <FadeIn delay={140} className="relative grid grid-cols-2 gap-2.5 mb-4">
          <LiveStat icon={<Timer color={colors.primary} size={14} />} label="Tiempo" value={formatDuration(run.duration_seconds)} />
          <LiveStat icon={<Gauge color={colors.primary} size={14} />} label="Ritmo medio" value={formatPace(run.avg_pace_seconds)} sub="min/km" />
          <LiveStat icon={<Zap color={colors.gold} size={14} />} label="Mejor km" value={formatPace(run.best_km_seconds)} sub="min/km" />
          <LiveStat icon={<Flame color={colors.orange} size={14} />} label="Calorías" value={String(run.calories ?? 0)} sub="kcal aprox." />
        </FadeIn>

        {/* Rango */}
        <FadeIn delay={200} className="relative mb-4">
          <TiltCard float glare radius={28} maxTilt={8} style={glow(tier.colors[1], 26, 0.4)}>
            <div className="flex items-center gap-4 p-5" style={{ borderRadius: 28, background: gradientCss(tier.colors) }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
                <TierIcon color={tier.text} size={32} />
              </div>
              <div className="flex-1 min-w-0" style={{ color: tier.text }}>
                <p className="text-[11px] font-extrabold opacity-75" style={{ letterSpacing: 2 }}>RANGO</p>
                <p className="text-[28px] font-black">{result.rank.tier}</p>
                <p className="text-[13px] font-bold opacity-80">{result.rank.score + '/100'}</p>
              </div>
            </div>
          </TiltCard>
        </FadeIn>

        <FadeIn delay={240} className="relative card-dark rounded-3xl p-5 mb-4">
          {result.records.length ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {result.records.map((r) => (
                <span key={r} className="flex items-center gap-1.5 bg-yellow-500/15 border border-yellow-500/30 rounded-full px-3 py-1.5 text-yellow-300 text-xs font-extrabold">
                  <Trophy color={colors.gold} size={13} />
                  {r}
                </span>
              ))}
            </div>
          ) : null}
          {result.rank.reasons.map((reason) => (
            <div key={reason} className="flex items-center gap-2.5 mb-2">
              <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Check color={colors.primary} size={12} strokeWidth={3} />
              </span>
              <p className="text-[#c9d1cf] text-sm">{reason}</p>
            </div>
          ))}
        </FadeIn>

        <FadeIn delay={280} className="relative">
          <SplitBars splits={run.splits_seconds || []} />
        </FadeIn>

        {!result.saved ? (
          <div className="relative bg-red-500/10 border border-red-500/20 rounded-2xl p-3 mb-4">
            <p className="text-red-400 text-sm">{saving ? 'Guardando tu carrera…' : 'No se pudo guardar la carrera. Revisa tu conexión.'}</p>
            {!saving ? <button type="button" onClick={() => save(result)} className="text-green-500 text-sm font-semibold mt-2">Reintentar</button> : null}
          </div>
        ) : (
          <p className="relative text-[#6b7876] text-xs text-center mb-4">Tu ruta se guardó solo en este dispositivo.</p>
        )}

        <GradientButton title="Listo" onClick={() => router.push('/progreso?tab=Cardio')} disabled={saving} icon={<Check color="#04120a" size={18} strokeWidth={3} />} className="relative w-full" />
        {result.records.length ? <Confetti /> : null}
      </div>
    )
  }

  // ----- Cuenta regresiva (pantalla completa: la navegación no debe interrumpir la salida) -----
  if (phase === 'countdown') {
    return (
      <div className="fixed inset-0 z-[55] bg-[#0a0f0d] flex flex-col items-center justify-center overflow-hidden">
        <GlowOrb color={colors.primary} size={420} style={{ top: 'calc(50% - 210px)', left: 'calc(50% - 210px)' }} intensity={0.35} duration={3} />
        <p className="relative text-[#9ca8a5] text-sm font-bold uppercase mb-4" style={{ letterSpacing: 3 }}>{activity === 'correr' ? 'Prepárate para correr' : 'Prepárate para caminar'}</p>
        <p key={count} className="count-pop relative text-white font-black" style={{ fontSize: 160, lineHeight: 1 }}>{count}</p>
      </div>
    )
  }

  // ----- En vivo -----
  if (phase === 'running') {
    return (
      <div className="fixed inset-0 z-[55] bg-[#0a0f0d] overflow-y-auto">
        <div className="max-w-xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 card-dark rounded-full px-3 py-1.5">
              {activity === 'correr' ? <Zap color={colors.primary} size={13} /> : <Footprints color={colors.primary} size={13} />}
              <span className="text-white text-xs font-bold">{activity === 'correr' ? 'Corriendo' : 'Caminando'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: quality.color }} />
              <span className="text-[#9ca8a5] text-[11px]">GPS</span>
            </div>
          </div>

          <div className="text-center mt-2 mb-3">
            <p>
              <span className="font-black tabular-nums" style={{ fontSize: 84, lineHeight: '92px', color: paused ? colors.muted : '#ffffff' }}>{formatKm(distance)}</span>
              <span className="text-[#9ca8a5] text-xl font-bold ml-1.5">km</span>
            </p>
            {paused ? <p className="text-yellow-400 text-xs font-extrabold" style={{ letterSpacing: 3 }}>EN PAUSA</p> : null}
            {goal ? (
              <div className="w-full mt-3">
                <div className="h-2 rounded-full bg-[#1c2523] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (distance / goal) * 100)}%`, background: gradientCss(gradients.brand, 'horizontal') }} />
                </div>
                <p className="text-[#6b7876] text-[11px] mt-1 text-right">{'Objetivo ' + formatKm(goal, 0) + ' km'}</p>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2.5 mb-3">
            <LiveStat icon={<Timer color={colors.primary} size={14} />} label="Tiempo" value={formatDuration(elapsed)} />
            <LiveStat icon={<Gauge color={colors.primary} size={14} />} label="Ritmo" value={formatPace(paused ? null : livePace)} sub="min/km" />
            <LiveStat icon={<Gauge color={colors.soft} size={14} />} label="Medio" value={formatPace(avgPace)} sub="min/km" />
          </div>

          <div className="card-dark rounded-3xl overflow-hidden">
            <RouteView route={route} width={560} height={200} live />
          </div>

          <div className="flex items-center justify-center gap-10 mt-7">
            {paused ? (
              <>
                <HoldToFinish onComplete={finish} />
                <div className="flex flex-col items-center">
                  <button type="button" onClick={togglePause} aria-label="Reanudar" className="press w-[84px] h-[84px] rounded-full flex items-center justify-center" style={{ background: gradientCss(gradients.brand), ...glow(colors.primary, 18, 0.5) }}>
                    <Play color="#04120a" size={30} fill="#04120a" />
                  </button>
                  <p className="text-[#9ca8a5] text-xs mt-2">Reanudar</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <button type="button" onClick={togglePause} aria-label="Pausar" className="press w-[92px] h-[92px] rounded-full bg-[#1c2523] border-2 border-yellow-400 flex items-center justify-center">
                  <Pause color={colors.gold} size={34} fill={colors.gold} />
                </button>
                <p className="text-[#9ca8a5] text-xs mt-2">Pausar</p>
              </div>
            )}
          </div>
          <p className="text-[#6b7876] text-[11px] text-center mt-6 leading-4">
            Mantén esta página abierta: si bloqueas el teléfono o cambias de app, el navegador deja de recibir el GPS y ese tramo se mide en línea recta.
          </p>
        </div>

        {/* Aviso de cada kilómetro */}
        {banner ? (
          <div className="fade-in fixed top-4 left-4 right-4 max-w-xl mx-auto rounded-2xl px-4 py-3.5 flex items-center gap-3 pointer-events-none z-[56]" style={{ background: gradientCss(gradients.brand, 'horizontal'), ...glow(colors.primary, 16, 0.5) }}>
            <MapPin color="#04120a" size={18} />
            <p className="font-black" style={{ color: '#04120a' }}>{banner}</p>
          </div>
        ) : null}
      </div>
    )
  }

  // ----- Preparación -----
  return (
    <div className="relative max-w-xl mx-auto px-4 py-8 overflow-hidden">
      <GlowOrb color={colors.orange} size={360} style={{ top: -170, right: -140 }} intensity={0.24} />
      <FadeIn className="relative flex items-end gap-3 mb-6">
        <button type="button" onClick={() => router.back()} aria-label="Volver" className="mb-1.5 text-[#9ca8a5] hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <div>
          <p className="text-green-500 text-xs font-bold uppercase" style={{ letterSpacing: 2 }}>Cardio</p>
          <h1 className="text-white text-3xl font-extrabold mt-1">Salir a correr</h1>
        </div>
      </FadeIn>

      <FadeIn delay={60} className="relative flex gap-3 mb-5">
        {(['correr', 'caminar'] as Activity[]).map((a) => {
          const active = activity === a
          return (
            <button
              key={a}
              type="button"
              onClick={() => setActivity(a)}
              aria-pressed={active}
              className="press flex-1 rounded-3xl p-4 flex flex-col items-center"
              style={{ backgroundColor: active ? 'rgba(34,197,94,0.12)' : colors.surface, border: `1.5px solid ${active ? colors.primary : colors.border}` }}
            >
              <IconBadge colors={a === 'correr' ? gradients.ember : gradients.ocean} size={48} radius={16} shine={active}>
                {a === 'correr' ? <Zap color="#ffffff" size={22} /> : <Footprints color="#04120a" size={22} />}
              </IconBadge>
              <span className="text-white font-bold mt-2">{a === 'correr' ? 'Correr' : 'Caminar'}</span>
            </button>
          )
        })}
      </FadeIn>

      <FadeIn delay={110} className="relative">
        <p className="text-[#9ca8a5] text-xs font-semibold mb-2 ml-1">Objetivo</p>
        <div className="flex gap-2 mb-5">
          {GOALS.map((g) => {
            const active = goal === g.meters
            return (
              <button
                key={g.label}
                type="button"
                onClick={() => setGoal(g.meters)}
                aria-pressed={active}
                className={`flex-1 py-3 rounded-2xl border ${active ? 'bg-green-500 border-green-500 text-black font-extrabold' : 'bg-[#141b19] border-[#2a3532] text-[#c9d1cf] font-semibold'}`}
              >
                {g.label}
              </button>
            )
          })}
        </div>
      </FadeIn>

      <FadeIn delay={160} className="relative card-dark rounded-3xl p-4 mb-4">
        {permission === 'denied' ? (
          <>
            <p className="text-red-400 text-sm font-semibold">Sin permiso de ubicación</p>
            <p className="text-[#9ca8a5] text-xs mt-1 leading-4">Finnets necesita el GPS para medir la distancia. Permite la ubicación para este sitio en los ajustes del navegador y recarga la página.</p>
          </>
        ) : permission === 'unsupported' ? (
          <p className="text-red-400 text-sm font-semibold">Este navegador no tiene GPS</p>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: quality.color }} />
            <p className="text-white text-sm flex-1">{quality.label}</p>
          </div>
        )}
      </FadeIn>

      {records && (records.best5k || records.longest) ? (
        <FadeIn delay={200} className="relative flex gap-3 mb-6">
          {records.best5k ? (
            <div className="flex-1 card-dark rounded-3xl p-4">
              <p className="text-[#9ca8a5] text-xs">Tu mejor 5K</p>
              <p className="text-white text-xl font-extrabold mt-0.5">{formatDuration(records.best5k)}</p>
            </div>
          ) : null}
          {records.longest ? (
            <div className="flex-1 card-dark rounded-3xl p-4">
              <p className="text-[#9ca8a5] text-xs">Más larga</p>
              <p className="text-white text-xl font-extrabold mt-0.5">{formatKm(records.longest, 1) + ' km'}</p>
            </div>
          ) : null}
        </FadeIn>
      ) : null}

      <FadeIn delay={240} className="relative flex flex-col items-center mt-2.5">
        <button
          type="button"
          onClick={startCountdown}
          disabled={permission !== 'granted'}
          aria-label="Empezar"
          className="press w-[150px] h-[150px] rounded-full flex flex-col items-center justify-center disabled:opacity-40"
          style={{ background: gradientCss(gradients.brand), ...glow(colors.primary, 30, 0.6) }}
        >
          <Play color="#04120a" size={40} fill="#04120a" />
          <span className="font-black text-[15px] mt-1" style={{ color: '#04120a', letterSpacing: 1 }}>EMPEZAR</span>
        </button>
        <p className="text-[#6b7876] text-xs text-center mt-5 leading-4 px-6">
          Pensado para el celular. La ruta se guarda solo en este dispositivo y durante la carrera la pantalla se mantiene encendida.
        </p>
      </FadeIn>
    </div>
  )
}
