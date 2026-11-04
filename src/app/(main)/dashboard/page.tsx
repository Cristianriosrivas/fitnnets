'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Weight, Ruler, Dumbbell, Flame, Play, Droplet, Trophy, ChevronRight, Plus, PersonStanding, BatteryCharging, Sparkles, Zap, Footprints } from 'lucide-react'
import { supabase } from '@/core/supabase/browser'
import Aurora from '@/components/ui/Aurora'
import FadeIn from '@/components/ui/FadeIn'
import TiltCard from '@/components/ui/TiltCard'
import IconBadge from '@/components/ui/IconBadge'
import AnimatedRing from '@/components/ui/AnimatedRing'
import CountUp from '@/components/ui/CountUp'
import Skeleton from '@/components/ui/Skeleton'
import { colors, glow, gradientCss, gradients, GradientColors } from '@/components/ui/theme'
import BodyMap, { BodyVariant, preferredVariant } from '@/components/body/BodyMap'
import type { Region } from '@/core/muscles'
import { RecoveryMap, computeRecovery, loadRecentLogs, readiness, recommendDay, recoveryColor, tiredRegions } from '@/core/recovery'
import { loadStepGoal, loadStepHistory, localDate } from '@/core/steps'

const TIPS = [
  'Mantén una buena hidratación. El agua mejora tu rendimiento y recuperación.',
  'La constancia es más importante que la intensidad. Entrena con calidad, no solo con prisa.',
  'Duerme al menos 7 horas: es cuando tu cuerpo realmente construye músculo.',
  'El calentamiento previene lesiones y mejora tu rendimiento en cada serie.',
  'La proteína después de entrenar ayuda a la recuperación muscular.',
  'Progresar poco a poco es mejor que forzar demasiado y lesionarte.',
  'Escucha a tu cuerpo: el descanso también es parte del entrenamiento.',
]

const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function StatCard({ icon, colors: gradient, label, children }: { icon: ReactNode; colors: GradientColors; label: string; children: ReactNode }) {
  return (
    <TiltCard maxTilt={12} radius={22}>
      <div className="card-dark p-4" style={{ borderRadius: 22 }}>
        <IconBadge colors={gradient} size={34} radius={11}>{icon}</IconBadge>
        <p className="text-[#9ca8a5] text-xs mt-3">{label}</p>
        <div className="flex items-end mt-0.5">{children}</div>
      </div>
    </TiltCard>
  )
}

// Barras de la semana que crecen una tras otra
function WeekBars({ days }: { days: { label: string; trained: boolean }[] }) {
  return (
    <div className="flex-1 flex items-end justify-between ml-5 h-[92px]">
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1">
          <div className="flex flex-col justify-end w-full px-1 h-[66px]">
            <div
              className="fade-in rounded-full"
              style={{
                height: d.trained ? 66 : 14,
                animationDelay: `${i * 70}ms`,
                background: d.trained ? gradientCss(['#a3e635', '#22c55e', '#15803d'], 'vertical') : '#1f2926',
              }}
            />
          </div>
          <span className="text-[10px] mt-1.5" style={{ color: i === days.length - 1 ? colors.primary : colors.muted, fontWeight: i === days.length - 1 ? 700 : 500 }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// Cuerpo de frente y espalda pintado por recuperación, con qué músculos conviene descansar
function RecoveryCard({ map, variant }: { map: RecoveryMap; variant: BodyVariant }) {
  const score = readiness(map)
  const tired = tiredRegions(map)
  const values = Object.fromEntries(Object.entries(map).map(([region, r]) => [region, r.recovery])) as Record<Region, number>
  const colorFor = (_region: Region, value: number) => recoveryColor(value)
  const advice = tired.length
    ? 'Descansa ' + tired.slice(0, 2).map((t) => `${t.label.toLowerCase()} (${Math.round(t.recovery * 100)}%, lista en ${t.hoursToFull} h)`).join(' y ')
    : 'Todo tu cuerpo está recuperado. ¡A entrenar!'
  return (
    <Link href="/cuerpo?mode=recuperacion" aria-label="Ver mi recuperación muscular" className="press card-dark card-dark-hover rounded-3xl p-4 flex items-center gap-3 h-full">
      <div className="flex flex-shrink-0">
        <BodyMap variant={variant} side="front" values={values} width={50} colorFor={colorFor} pulse={false} />
        <BodyMap variant={variant} side="back" values={values} width={50} colorFor={colorFor} pulse={false} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <BatteryCharging color={recoveryColor(score / 100)} size={15} />
          <p className="text-[#9ca8a5] text-xs">Recuperación muscular</p>
        </div>
        <div className="flex items-end mt-0.5">
          <CountUp value={score} suffix="%" className="text-2xl font-extrabold" style={{ color: recoveryColor(score / 100) }} />
          <span className="text-[#9ca8a5] text-xs mb-1 ml-1.5">{score >= 85 ? 'listo para todo' : score >= 65 ? 'listo para entrenar' : 'mejor un día suave'}</span>
        </div>
        <p className="text-[#9ca8a5] text-xs mt-1 leading-4 line-clamp-3">{advice}</p>
      </div>
      <ChevronRight color={colors.muted} size={18} className="flex-shrink-0" />
    </Link>
  )
}

function RowLink({ href, label, title, subtitle, badge, chevron = colors.muted, className = 'card-dark card-dark-hover', style }: { href: string; label: string; title: string; subtitle: string; badge: ReactNode; chevron?: string; className?: string; style?: React.CSSProperties }) {
  return (
    <Link href={href} aria-label={label} className={`press rounded-3xl p-4 flex items-center gap-3 h-full ${className}`} style={style}>
      {badge}
      <span className="flex-1 min-w-0">
        <span className="block text-white font-bold text-sm">{title}</span>
        <span className="block text-[#9ca8a5] text-xs mt-0.5">{subtitle}</span>
      </span>
      <ChevronRight color={chevron} size={18} className="flex-shrink-0" />
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Skeleton height={18} width={120} radius={8} />
      <Skeleton height={34} width={200} radius={10} style={{ marginTop: 10 }} />
      <Skeleton height={190} radius={28} style={{ marginTop: 26 }} />
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Skeleton height={118} radius={22} />
        <Skeleton height={118} radius={22} />
      </div>
      <Skeleton height={150} radius={24} style={{ marginTop: 14 }} />
    </div>
  )
}

type TodayRoutine = {
  id: string
  title: string
  dayTitle: string
  exerciseCount: number
  dayId?: string
  readiness?: number
  focus?: string[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  const [username, setUsername] = useState('')
  const [weightKg, setWeightKg] = useState<number | null>(null)
  const [heightCm, setHeightCm] = useState<number | null>(null)
  const [bicepCm, setBicepCm] = useState<number | null>(null)
  const [streak, setStreak] = useState(0)
  const [last7, setLast7] = useState<{ label: string; trained: boolean }[]>([])
  const [latestRoutine, setLatestRoutine] = useState<TodayRoutine | null>(null)
  const [recovery, setRecovery] = useState<RecoveryMap | null>(null)
  const [variant, setVariant] = useState<BodyVariant>('male')
  const [stepsToday, setStepsToday] = useState<number | null>(null)
  const [stepGoal, setStepGoal] = useState(8000)
  const [tipOfDay, setTipOfDay] = useState(TIPS[0])
  const [hello, setHello] = useState('Hola')

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, weight_kg, height_cm, gender')
      .eq('id', user.id)
      .single()

    setUsername(profile?.username || '')
    setWeightKg(profile?.weight_kg ?? null)
    setHeightCm(profile?.height_cm ?? null)

    // Última medida de brazo registrada (ignora registros que solo traen el peso)
    const { data: metric } = await supabase
      .from('body_metrics')
      .select('bicep_cm')
      .eq('user_id', user.id)
      .not('bicep_cm', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()
    setBicepCm(metric?.bicep_cm ?? null)

    // Racha de días consecutivos (un día con carrera también cuenta como entrenado)
    const [{ data: logs }, { data: runDays }] = await Promise.all([
      supabase.from('progress_logs').select('date').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('runs').select('started_at').eq('user_id', user.id).order('started_at', { ascending: false }).limit(400),
    ])

    const uniqueDates = Array.from(
      new Set([...(logs || []).map((l) => l.date as string), ...(runDays || []).map((r) => (r.started_at as string).slice(0, 10))])
    ).sort().reverse()
    let currentStreak = 0
    let checkDate = new Date()
    for (const dateStr of uniqueDates) {
      const logDate = new Date(dateStr)
      const diffDays = Math.floor((checkDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays <= 1) {
        currentStreak++
        checkDate = logDate
      } else break
    }
    setStreak(currentStreak)

    // Últimos 7 días: qué días entrenó
    const week: { label: string; trained: boolean }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      week.push({ label: DAY_LABELS[d.getDay()], trained: uniqueDates.includes(dateStr) })
    }
    setLast7(week)

    // "Tu rutina de hoy": el día de tus rutinas cuyos músculos están más recuperados
    const [{ data: routines }, recentLogs, variantPref, steps, goal] = await Promise.all([
      supabase
        .from('routines')
        .select('id, title, routine_days(id, day_number, title, routine_exercises(id, sets, exercises(name, muscle_group)))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      loadRecentLogs(user.id).catch(() => []),
      preferredVariant(profile?.gender),
      loadStepHistory(user.id, 1).catch(() => []),
      loadStepGoal(),
    ])
    const recoveryMap = computeRecovery(recentLogs)
    setRecovery(recoveryMap)
    setVariant(variantPref)

    // Los pasos los cuenta la app móvil; en la web se muestran si ya llegaron los de hoy
    setStepsToday(steps.find((d) => d.date === localDate(new Date()))?.steps ?? null)
    setStepGoal(goal)

    const recommended = recommendDay(routines || [], recoveryMap)
    if (recommended) {
      setLatestRoutine({
        id: recommended.routineId,
        title: recommended.routineTitle,
        dayId: recommended.dayId,
        dayTitle: recommended.dayTitle,
        exerciseCount: recommended.exerciseCount,
        readiness: recommended.readiness,
        focus: recommended.focus,
      })
    } else if (routines?.[0]) {
      const routine: any = routines[0]
      const firstDay: any = [...(routine.routine_days || [])].sort((a: any, b: any) => a.day_number - b.day_number)[0]
      setLatestRoutine({ id: routine.id, title: routine.title, dayTitle: firstDay?.title || routine.title, exerciseCount: firstDay?.routine_exercises?.length || 0 })
    } else {
      setLatestRoutine(null)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    setHello(greeting())
    setTipOfDay(TIPS[new Date().getDate() % TIPS.length])
    loadData()
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadData()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadData])

  const trainedDays = last7.filter((d) => d.trained).length
  const weekPercent = Math.round((trainedDays / 7) * 100)

  if (loading) return <DashboardSkeleton />

  const routineHref = latestRoutine
    ? `/rutinas/${latestRoutine.id}/entrenar${latestRoutine.dayId ? `?dayId=${latestRoutine.dayId}` : ''}`
    : '/rutinas'

  return (
    <div className="relative overflow-hidden">
      <Aurora height={480} />
      <div className="relative max-w-5xl mx-auto px-4 py-8">
        {/* Encabezado: el avatar abre el perfil */}
        <FadeIn className="flex items-center justify-between mb-6">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-green-500 text-xs font-bold uppercase" style={{ letterSpacing: 2 }}>{hello}</p>
            <h1 className="text-white text-3xl font-extrabold mt-1 truncate">{(username || 'Atleta') + ' 👋'}</h1>
            <p className="text-[#9ca8a5] text-sm mt-1">Tu progreso es el resultado de tus hábitos.</p>
          </div>
          <Link href="/perfil" aria-label="Editar perfil" className="press rounded-full p-[2.5px] flex-shrink-0" style={{ width: 52, height: 52, background: gradientCss(gradients.brand), ...glow(colors.primary, 14, 0.5) }}>
            <span className="w-full h-full rounded-full bg-[#0a0f0d] flex items-center justify-center text-green-500 font-extrabold text-lg">
              {username?.[0]?.toUpperCase() || 'U'}
            </span>
          </Link>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Tu rutina de hoy: tarjeta 3D flotante */}
          <FadeIn delay={90}>
            <TiltCard
              float
              glare
              radius={28}
              maxTilt={7}
              onClick={() => router.push(routineHref)}
              ariaLabel={latestRoutine ? 'Iniciar ' + latestRoutine.dayTitle : 'Crear rutina'}
              style={glow(colors.primary, 26, 0.35)}
            >
              <div className="relative overflow-hidden p-[22px] min-h-[190px]" style={{ borderRadius: 28, background: gradientCss(['#16a34a', '#047857', '#022c22']) }}>
                {/* Anillos decorativos */}
                <svg width={220} height={220} className="absolute pointer-events-none" style={{ right: -70, top: -50 }}>
                  <circle cx={110} cy={110} r={100} stroke="rgba(255,255,255,0.10)" strokeWidth={2} fill="none" />
                  <circle cx={110} cy={110} r={72} stroke="rgba(255,255,255,0.08)" strokeWidth={2} fill="none" />
                  <circle cx={110} cy={110} r={44} stroke="rgba(255,255,255,0.06)" strokeWidth={2} fill="none" />
                </svg>
                <div className="absolute pointer-events-none opacity-[0.12]" style={{ right: 18, bottom: 14 }}>
                  <Dumbbell color="#ffffff" size={96} />
                </div>

                <p className="relative text-white/70 text-[11px] font-bold uppercase" style={{ letterSpacing: 2 }}>Tu rutina de hoy</p>
                {latestRoutine ? (
                  <div className="relative">
                    <p className="text-white text-2xl font-extrabold mt-2 line-clamp-2">{latestRoutine.dayTitle}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="bg-white/15 rounded-full px-2.5 py-1 text-white text-xs font-semibold whitespace-nowrap">{latestRoutine.exerciseCount + ' ejercicios'}</span>
                      <span className="text-white/70 text-xs truncate">{latestRoutine.title}</span>
                    </div>
                    {latestRoutine.readiness !== undefined ? (
                      <div className="flex items-center gap-1.5 mt-2.5">
                        <BatteryCharging color="#bbf7d0" size={14} className="flex-shrink-0" />
                        <p className="text-white/90 text-xs font-semibold truncate">
                          {'Elegida por tu recuperación: ' + (latestRoutine.focus?.join(' y ') || 'músculos') + ' al ' + latestRoutine.readiness + '%'}
                        </p>
                      </div>
                    ) : null}
                    <div className="inline-flex items-center bg-white rounded-full pl-3 pr-4 py-2.5 mt-5 gap-2">
                      <span className="bg-green-500 rounded-full p-1"><Play color="#04120a" size={12} fill="#04120a" /></span>
                      <span className="text-black font-bold text-sm">Iniciar rutina</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <p className="text-white text-2xl font-extrabold mt-2">Aún no tienes una rutina</p>
                    <p className="text-white/70 text-sm mt-1">Genera una con IA o créala a tu medida.</p>
                    <div className="inline-flex items-center bg-white rounded-full pl-3 pr-4 py-2.5 mt-5 gap-2">
                      <Plus color="#04120a" size={16} />
                      <span className="text-black font-bold text-sm">Crear rutina</span>
                    </div>
                  </div>
                )}
              </div>
            </TiltCard>
          </FadeIn>

          <div className="flex flex-col gap-4">
            {/* Recuperación muscular */}
            {recovery ? (
              <FadeIn delay={140}>
                <RecoveryCard map={recovery} variant={variant} />
              </FadeIn>
            ) : null}

            {/* Correr y pasos del día */}
            <FadeIn delay={160} className="flex gap-3 flex-1">
              <Link href="/correr" aria-label="Salir a correr" className="press flex-1 rounded-3xl p-4 min-h-[132px]" style={{ background: gradientCss(gradients.run) }}>
                <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Zap color="#ffffff" size={20} fill="#ffffff" />
                </span>
                <span className="block text-white font-extrabold mt-3">Salir a correr</span>
                <span className="block text-white/80 text-xs mt-0.5">Km y ritmo con GPS</span>
              </Link>
              {stepsToday !== null ? (
                <Link href="/progreso?tab=Cardio" aria-label="Ver mis pasos" className="press flex-1 card-dark card-dark-hover rounded-3xl p-4 min-h-[132px] flex flex-col items-center">
                  <AnimatedRing progress={Math.min(100, (stepsToday / stepGoal) * 100)} size={64} stroke={7} colors={gradients.ocean} delay={200}>
                    <Footprints color={colors.sky} size={18} />
                  </AnimatedRing>
                  <CountUp value={stepsToday} className="text-white text-lg font-extrabold mt-2" />
                  <span className="text-[#9ca8a5] text-[11px]">{'de ' + stepGoal.toLocaleString('es-CO') + ' pasos'}</span>
                </Link>
              ) : null}
            </FadeIn>
          </div>
        </div>

        {/* Estadísticas en tarjetas 3D */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <FadeIn delay={170}>
            <StatCard icon={<Weight color="#04120a" size={17} />} colors={gradients.brand} label="Peso actual">
              {weightKg ? (
                <>
                  <CountUp value={Number(weightKg)} decimals={Number.isInteger(Number(weightKg)) ? 0 : 1} className="text-white text-2xl font-extrabold" />
                  <span className="text-[#9ca8a5] text-xs mb-1 ml-1">kg</span>
                </>
              ) : (
                <span className="text-white text-2xl font-extrabold">--</span>
              )}
            </StatCard>
          </FadeIn>
          <FadeIn delay={230}>
            <StatCard icon={<Ruler color="#04120a" size={17} />} colors={gradients.ocean} label="Altura">
              {/* La altura debe guardarse en cm (ej: 181). Si algún dato viejo quedó en metros (ej: 1.81), se muestra bien igual. */}
              {heightCm ? (
                <>
                  <CountUp value={Number(heightCm)} decimals={heightCm > 3 ? 0 : 2} className="text-white text-2xl font-extrabold" />
                  <span className="text-[#9ca8a5] text-xs mb-1 ml-1">{heightCm > 3 ? 'cm' : 'm'}</span>
                </>
              ) : (
                <span className="text-white text-2xl font-extrabold">--</span>
              )}
            </StatCard>
          </FadeIn>
          <FadeIn delay={290}>
            <StatCard icon={<Dumbbell color="#ffffff" size={17} />} colors={gradients.violet} label="Brazo">
              {bicepCm ? (
                <>
                  <CountUp value={Number(bicepCm)} decimals={Number.isInteger(Number(bicepCm)) ? 0 : 1} className="text-white text-2xl font-extrabold" />
                  <span className="text-[#9ca8a5] text-xs mb-1 ml-1">cm</span>
                </>
              ) : (
                <span className="text-white text-2xl font-extrabold">--</span>
              )}
            </StatCard>
          </FadeIn>
          <FadeIn delay={350}>
            <StatCard icon={<Flame color="#ffffff" size={17} />} colors={gradients.ember} label="Racha actual">
              <CountUp value={streak} className="text-white text-2xl font-extrabold" />
              <span className="text-[#9ca8a5] text-xs mb-1 ml-1">{streak === 1 ? 'día' : 'días'}</span>
            </StatCard>
          </FadeIn>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Progreso semanal */}
          <FadeIn delay={420}>
            <div className="card-dark rounded-3xl p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <p className="text-white font-bold">Progreso semanal</p>
                <span className="bg-green-500/15 text-green-500 rounded-full px-2.5 py-1 text-xs font-bold">{trainedDays + '/7 días'}</span>
              </div>
              <div className="flex items-center">
                <AnimatedRing progress={weekPercent} size={104} stroke={11} delay={300}>
                  <CountUp value={weekPercent} suffix="%" delay={300} className="text-white text-xl font-extrabold" />
                  <span className="text-[9px] text-[#9ca8a5]">completado</span>
                </AnimatedRing>
                <WeekBars days={last7} />
              </div>
            </div>
          </FadeIn>

          {/* Consejo del día */}
          <FadeIn delay={460}>
            <div className="card-dark rounded-3xl p-5 h-full">
              <div className="flex items-center gap-3 mb-3">
                <IconBadge colors={gradients.ocean} size={34} radius={11}>
                  <Droplet color="#04120a" size={16} />
                </IconBadge>
                <p className="text-white font-bold text-sm">Consejo del día</p>
              </div>
              <p className="text-[#9ca8a5] text-sm leading-5">{tipOfDay}</p>
            </div>
          </FadeIn>

          {/* Finnets Wrapped */}
          <FadeIn delay={490} className="lg:col-span-2">
            <TiltCard glare radius={24} maxTilt={8} onClick={() => router.push('/wrapped')} ariaLabel="Ver mi resumen del mes">
              <div className="flex items-center gap-3 p-[18px]" style={{ borderRadius: 24, background: gradientCss(['#7e22ce', '#c2410c', '#ca8a04']) }}>
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                  <Sparkles color="#ffffff" size={24} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-white/80 text-[11px] font-bold uppercase" style={{ letterSpacing: 2 }}>Finnets Wrapped</span>
                  <span className="block text-white font-extrabold text-lg">Tu mes en Finnets</span>
                  <span className="block text-white/80 text-xs">Tus números del mes, listos para compartir</span>
                </span>
                <ChevronRight color="#ffffff" size={20} className="flex-shrink-0" />
              </div>
            </TiltCard>
          </FadeIn>

          {/* Logros */}
          <FadeIn delay={510}>
            <RowLink
              href="/logros"
              label="Ver logros e insignias"
              title="Logros e insignias"
              subtitle="Mira lo que has desbloqueado y lo que te falta"
              badge={<IconBadge colors={gradients.gold} size={42} radius={14}><Trophy color="#422006" size={20} /></IconBadge>}
            />
          </FadeIn>

          {/* Mapa muscular */}
          <FadeIn delay={530}>
            <RowLink
              href="/cuerpo"
              label="Abrir mi mapa muscular"
              title="Tu mapa muscular 3D"
              subtitle="Mira qué músculos dominas y compárate con tus amigos"
              badge={<IconBadge colors={gradients.violet} size={42} radius={14}><PersonStanding color="#ffffff" size={20} /></IconBadge>}
              chevron={colors.violet}
              className=""
              style={{ background: gradientCss(['#1e1b4b', '#141b19'], 'horizontal'), border: '1px solid rgba(167,139,250,0.35)' }}
            />
          </FadeIn>
        </div>
      </div>
    </div>
  )
}
