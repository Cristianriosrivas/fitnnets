'use client'

import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, Trophy, Share2, Dumbbell } from 'lucide-react'
import { supabase } from '@/core/supabase/browser'
import { WrappedData, cardioEquivalence, loadWrapped, wrappedShareText } from '@/core/wrapped'
import Body3D from '@/components/body/Body3D'
import { BodyVariant, preferredVariant } from '@/components/body/BodyMap'
import GradientButton from '@/components/ui/GradientButton'
import IconBadge from '@/components/ui/IconBadge'
import CountUp from '@/components/ui/CountUp'
import FadeIn from '@/components/ui/FadeIn'
import Skeleton from '@/components/ui/Skeleton'
import { GlowOrb } from '@/components/ui/Aurora'
import { colors, gradientCss, gradients, GradientColors } from '@/components/ui/theme'

const SLIDE_MS = 6000

type Slide = { key: string; colors: GradientColors; glow: string; content: ReactNode }

const Kicker = ({ children }: { children: string }) => (
  <p className="text-white/70 text-xs font-extrabold text-center" style={{ letterSpacing: 3 }}>{children}</p>
)
const Big = ({ children }: { children: string }) => (
  <p className="text-white text-[34px] font-black text-center leading-10">{children}</p>
)
const Sub = ({ children }: { children: string }) => (
  <p className="text-white/75 text-base text-center leading-[22px] mt-2.5">{children}</p>
)
const Chip = ({ children }: { children: string }) => (
  <span className="rounded-full px-3.5 py-[7px] text-white text-[13px] font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>{children}</span>
)
const Chips = ({ children, className = 'mt-6' }: { children: ReactNode; className?: string }) => (
  <div className={`flex flex-wrap justify-center gap-2 ${className}`}>{children}</div>
)

// Barras de historias: las vistas llenas, la actual avanzando, las siguientes vacías
function StoryBars({ count, index }: { count: number; index: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex-1 h-[3px] rounded-sm overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
          {i < index ? (
            <div className="h-full bg-white" />
          ) : i === index ? (
            <div key={index} className="story-bar h-full bg-white" style={{ animationDuration: `${SLIDE_MS}ms` }} />
          ) : null}
        </div>
      ))}
    </div>
  )
}

export default function WrappedPage() {
  const router = useRouter()
  const [data, setData] = useState<WrappedData | null>(null)
  const [username, setUsername] = useState('')
  const [variant, setVariant] = useState<BodyVariant>('male')
  const [error, setError] = useState('')
  const [index, setIndex] = useState(0)
  const [shareNote, setShareNote] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      try {
        const [{ data: profile }, wrapped] = await Promise.all([
          supabase.from('profiles').select('username, gender').eq('id', user.id).single(),
          loadWrapped(user.id),
        ])
        setUsername(profile?.username || '')
        setVariant(await preferredVariant(profile?.gender))
        setData(wrapped)
      } catch {
        setError('No pudimos armar tu resumen. Revisa tu conexión.')
      }
    }
    load()
  }, [])

  // El celular abre su menú de compartir; en el computador el texto se copia
  const handleShare = async () => {
    if (!data) return
    const text = wrappedShareText(data, username)
    try {
      if (navigator.share) {
        await navigator.share({ text })
        return
      }
      await navigator.clipboard.writeText(text)
      setShareNote('Copiado: pégalo donde quieras compartirlo')
    } catch {
      // Compartir cancelado: no hay nada que avisar
    }
  }

  const slides: Slide[] = useMemo(() => {
    if (!data) return []
    if (data.workouts === 0) {
      return [
        {
          key: 'vacio',
          colors: ['#052e16', '#14532d', '#0a0f0d'],
          glow: colors.primary,
          content: (
            <>
              <IconBadge colors={gradients.brand} size={72} radius={24}>
                <Dumbbell color="#04120a" size={34} />
              </IconBadge>
              <div className="h-6" />
              <Big>Tu Wrapped se arma entrenando</Big>
              <Sub>Completa entrenamientos este mes y vuelve: aquí verás tu resumen para presumir.</Sub>
              <div className="h-7" />
              <GradientButton title="Ir a mis rutinas" onClick={() => router.push('/rutinas')} className="w-full" />
            </>
          ),
        },
      ]
    }

    const list: Slide[] = [
      {
        key: 'intro',
        colors: ['#052e16', '#14532d', '#0a0f0d'],
        glow: colors.primary,
        content: (
          <>
            <IconBadge colors={gradients.brand} size={76} radius={26}>
              <Sparkles color="#04120a" size={36} />
            </IconBadge>
            <div className="h-6" />
            <Kicker>FINNETS WRAPPED</Kicker>
            <div className="h-2.5" />
            <Big>{(username || 'Atleta') + ', este fue tu mes'}</Big>
            <Sub>Tus últimos 30 días, en datos.</Sub>
            <p className="text-white/50 text-xs mt-10">Toca a la derecha para avanzar →</p>
          </>
        ),
      },
      {
        key: 'constancia',
        colors: ['#1e1b4b', '#3730a3', '#0a0f0d'],
        glow: colors.violet,
        content: (
          <>
            <Kicker>CONSTANCIA</Kicker>
            <Sub>Entrenaste</Sub>
            <CountUp value={data.workouts} duration={1400} className="text-white font-black" style={{ fontSize: 110, lineHeight: '120px' }} />
            <Big>{data.workouts === 1 ? 'día' : 'días'}</Big>
            <Chips>
              {data.totalMinutes ? <Chip>{'⏱️ ' + data.totalMinutes + ' min'}</Chip> : null}
              {data.totalSets ? <Chip>{'🏋️ ' + data.totalSets + ' series'}</Chip> : null}
              {data.bestStreak > 1 ? <Chip>{'🔥 ' + data.bestStreak + ' días seguidos'}</Chip> : null}
            </Chips>
          </>
        ),
      },
    ]

    if (data.volumeKg > 0) {
      list.push({
        key: 'volumen',
        colors: ['#7c2d12', '#c2410c', '#0a0f0d'],
        glow: colors.orange,
        content: (
          <>
            <Kicker>VOLUMEN</Kicker>
            <Sub>En total levantaste</Sub>
            <CountUp value={data.volumeKg} duration={1600} className="text-white font-black mt-1.5" style={{ fontSize: 64 }} />
            <Big>kilos</Big>
            <p className="mt-5" style={{ fontSize: 86 }}>{data.equivalence.emoji}</p>
            <Sub>{'Es como levantar ' + data.equivalence.amount + ' ' + data.equivalence.thing}</Sub>
          </>
        ),
      })
    }

    if (data.cardio && data.cardio.km > 0) {
      list.push({
        key: 'cardio',
        colors: ['#4c0519', '#be123c', '#0a0f0d'],
        glow: colors.orange,
        content: (
          <>
            <Kicker>CARDIO</Kicker>
            <Sub>Corriendo y caminando recorriste</Sub>
            <CountUp value={data.cardio.km} decimals={1} duration={1600} className="text-white font-black mt-1.5" style={{ fontSize: 86, lineHeight: '96px' }} />
            <Big>kilómetros</Big>
            <p className="mt-4" style={{ fontSize: 76 }}>🏃</p>
            <Sub>{cardioEquivalence(data.cardio.km)}</Sub>
            <Chips className="mt-4">
              <Chip>{data.cardio.outings + (data.cardio.outings === 1 ? ' salida' : ' salidas')}</Chip>
              {data.cardio.minutes ? <Chip>{'⏱️ ' + data.cardio.minutes + ' min'}</Chip> : null}
            </Chips>
          </>
        ),
      })
    }

    if (data.topMuscle) {
      list.push({
        key: 'musculo',
        colors: ['#083344', '#0e7490', '#0a0f0d'],
        glow: colors.sky,
        content: (
          <>
            <Kicker>TU MÚSCULO ESTRELLA</Kicker>
            <div className="h-3.5" />
            <Body3D variant={variant} values={data.heat} width={150} glowColor={colors.orange} showControls={false} />
            <div className="h-3.5" />
            <Big>{data.topMuscle.label}</Big>
            <Sub>{Math.round(data.topMuscle.share * 100) + '% de todo lo que entrenaste'}</Sub>
          </>
        ),
      })
    }

    list.push({
      key: 'mejora',
      colors: ['#422006', '#a16207', '#0a0f0d'],
      glow: colors.gold,
      content: data.bestProgress ? (
        <>
          <Kicker>TU MAYOR MEJORA</Kicker>
          <div className="h-3.5" />
          <IconBadge colors={gradients.gold} size={64} radius={22}>
            <Trophy color="#422006" size={30} />
          </IconBadge>
          <div className="h-4" />
          <Big>{data.bestProgress.name}</Big>
          <p className="text-white text-[40px] font-black mt-3 mb-3 text-center">{data.bestProgress.from + ' → ' + data.bestProgress.to + ' kg'}</p>
          <Chip>{'+' + Math.round(((data.bestProgress.to - data.bestProgress.from) / data.bestProgress.from) * 100) + '% en un mes'}</Chip>
        </>
      ) : (
        <>
          <Kicker>TU EJERCICIO FAVORITO</Kicker>
          <div className="h-4" />
          <IconBadge colors={gradients.gold} size={64} radius={22}>
            <Dumbbell color="#422006" size={30} />
          </IconBadge>
          <div className="h-4" />
          <Big>{data.topExercise?.name || '—'}</Big>
          <Sub>{(data.topExercise?.sets || 0) + ' series completadas'}</Sub>
        </>
      ),
    })

    if (data.timeOfDay) {
      list.push({
        key: 'horario',
        colors: ['#3b0764', '#7e22ce', '#0a0f0d'],
        glow: colors.violet,
        content: (
          <>
            <Kicker>TU PERSONALIDAD</Kicker>
            <p className="mt-4" style={{ fontSize: 96 }}>{data.timeOfDay.emoji}</p>
            <Big>{'Eres un atleta ' + data.timeOfDay.label}</Big>
            <Sub>{'Tu hora favorita para entrenar: ' + data.timeOfDay.hour + ':00'}</Sub>
            {data.weightChange !== null && data.weightChange !== 0 ? (
              <Chips className="mt-5">
                <Chip>{'⚖️ ' + (data.weightChange > 0 ? '+' : '') + data.weightChange + ' kg de peso este mes'}</Chip>
              </Chips>
            ) : null}
          </>
        ),
      })
    }

    list.push({
      key: 'final',
      colors: ['#052e16', '#166534', '#0a0f0d'],
      glow: colors.lime,
      content: (
        <>
          <Kicker>TU MES EN FINNETS</Kicker>
          <div className="h-3" />
          <Big>¡Vas con todo! 💪</Big>
          <Chips className="mt-5">
            <Chip>{'🗓️ ' + data.workouts + ' días'}</Chip>
            {data.volumeKg ? <Chip>{'🏋️ ' + data.volumeKg + ' kg'}</Chip> : null}
            {data.cardio ? <Chip>{'🏃 ' + String(data.cardio.km).replace('.', ',') + ' km'}</Chip> : null}
            {data.topMuscle ? <Chip>{'⭐ ' + data.topMuscle.label}</Chip> : null}
            {data.bestStreak > 1 ? <Chip>{'🔥 ' + data.bestStreak + ' días seguidos'}</Chip> : null}
          </Chips>
          <div className="h-7" />
          <GradientButton
            title="Compartir mi mes"
            onClick={(e) => { e.stopPropagation(); handleShare() }}
            icon={<Share2 color="#04120a" size={18} />}
            className="w-full"
          />
          {shareNote ? <p className="text-white/80 text-xs mt-3 text-center">{shareNote}</p> : null}
          <button type="button" onClick={(e) => { e.stopPropagation(); router.push('/dashboard') }} className="text-white/70 text-sm mt-4 p-2">Cerrar</button>
        </>
      ),
    })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, username, variant, shareNote])

  // Cada historia dura SLIDE_MS y pasa sola a la siguiente (la última se queda)
  useEffect(() => {
    if (slides.length === 0 || index >= slides.length - 1) return
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, slides.length - 1)), SLIDE_MS)
    return () => clearTimeout(timer)
  }, [index, slides.length])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8">
        <p className="text-[#9ca8a5] text-center">{error}</p>
        <button type="button" onClick={() => router.back()} className="btn-primary rounded-xl px-5 py-2.5 mt-4">Volver</button>
      </div>
    )
  }

  if (!data || slides.length === 0) {
    return (
      <div className="max-w-md mx-auto px-8 py-16">
        <Skeleton height={420} radius={30} />
      </div>
    )
  }

  const slide = slides[Math.min(index, slides.length - 1)]

  const handleTap = (e: MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    if (e.clientX - box.left < box.width * 0.3) setIndex((i) => Math.max(0, i - 1))
    else setIndex((i) => Math.min(slides.length - 1, i + 1))
  }

  return (
    // Pantalla completa, por encima de la navegación, como una historia del celular
    <div className="fixed inset-0 z-[55] bg-[#0a0f0d] flex justify-center">
      <div
        onClick={handleTap}
        className="relative w-full max-w-md h-full overflow-hidden flex flex-col cursor-pointer select-none"
        style={{ background: gradientCss(slide.colors, 'vertical') }}
      >
        <GlowOrb key={slide.key + '-glow'} color={slide.glow} size={420} style={{ top: '22%', left: 'calc(50% - 210px)' }} intensity={0.35} />

        <div className="relative pt-5 px-3.5">
          <StoryBars count={slides.length} index={index} />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5">
              <Sparkles color="#ffffff" size={14} />
              <span className="text-white font-extrabold text-[13px]">Finnets</span>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); router.push('/dashboard') }} aria-label="Cerrar resumen">
              <X color="#ffffff" size={22} />
            </button>
          </div>
        </div>

        <FadeIn key={slide.key} className="relative flex-1 flex flex-col items-center justify-center px-7 pb-10">
          {slide.content}
        </FadeIn>
      </div>
    </div>
  )
}
