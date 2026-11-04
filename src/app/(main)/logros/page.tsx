'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Trophy, Footprints, Dumbbell, Medal, CalendarCheck, Flame, Zap, Crown, Scale, Target,
  Pencil, Sparkles, Utensils, Salad, UserPlus, Users, Swords, Lock, Route, Timer, Mountain, MapPin,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '@/core/supabase/browser'
import { Badge, BadgeGroup, BadgeIcon, BADGE_GROUPS, computeBadges, loadAchievementStats, takeNewBadges } from '@/core/achievements'
import FadeIn from '@/components/ui/FadeIn'
import TiltCard from '@/components/ui/TiltCard'
import AnimatedRing from '@/components/ui/AnimatedRing'
import CountUp from '@/components/ui/CountUp'
import Skeleton from '@/components/ui/Skeleton'
import { GlowOrb } from '@/components/ui/Aurora'
import { colors, glow, gradientCss, gradients, GradientColors } from '@/components/ui/theme'

const ICONS: Record<BadgeIcon, LucideIcon> = {
  footprints: Footprints, dumbbell: Dumbbell, medal: Medal, calendar: CalendarCheck, flame: Flame, zap: Zap,
  crown: Crown, scale: Scale, target: Target, pencil: Pencil, sparkles: Sparkles, utensils: Utensils,
  salad: Salad, trophy: Trophy, 'user-plus': UserPlus, users: Users, swords: Swords,
  route: Route, timer: Timer, mountain: Mountain, 'map-pin': MapPin,
}

// 10000 -> 10.000 (la meta de pasos se lee mejor con separador de miles)
const fmt = (n: number) => n.toLocaleString('es-CO')

const GROUP_GRADIENTS: Record<BadgeGroup, GradientColors> = {
  Entrenamiento: gradients.brand,
  Constancia: gradients.ember,
  Cardio: ['#f97316', '#e11d48'],
  Progreso: gradients.ocean,
  Nutrición: gradients.gold,
  Social: gradients.violet,
}

function BadgeCard({ badge }: { badge: Badge }) {
  const Icon = ICONS[badge.icon]
  const gradient = GROUP_GRADIENTS[badge.group]
  const label = `${badge.title}. ${badge.description}. ${badge.unlocked ? 'Desbloqueada' : `${fmt(badge.progress)} de ${fmt(badge.goal)}`}`

  if (badge.unlocked) {
    return (
      <TiltCard glare radius={22} maxTilt={14} ariaLabel={label} style={glow(gradient[0], 16, 0.4)}>
        <div className="p-3.5 min-h-[156px]" style={{ borderRadius: 22, background: gradientCss(gradient) }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}>
            <Icon color="#0a0f0d" size={24} strokeWidth={2.3} />
          </div>
          <p className="text-sm font-extrabold" style={{ color: '#0a0f0d' }}>{badge.title}</p>
          <p className="text-[11px] mt-0.5 leading-[15px]" style={{ color: 'rgba(10,15,13,0.72)' }}>{badge.description}</p>
          <span className="inline-block rounded-full px-2 py-0.5 mt-2.5 text-white text-[10px] font-extrabold" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>✓ DESBLOQUEADA</span>
        </div>
      </TiltCard>
    )
  }

  return (
    <TiltCard radius={22} maxTilt={10} ariaLabel={label}>
      <div className="card-dark p-3.5 min-h-[156px] flex flex-col" style={{ borderRadius: 22 }}>
        <div className="w-12 h-12 rounded-2xl bg-[#1c2523] flex items-center justify-center mb-3">
          <Lock color={colors.muted} size={20} />
        </div>
        <p className="text-[#c9d1cf] font-bold text-sm">{badge.title}</p>
        <p className="text-[#6b7876] text-[11px] mt-0.5 leading-4">{badge.description}</p>
        <div className="mt-auto pt-2.5">
          <div className="h-1.5 rounded-full bg-[#1c2523] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(badge.progress / badge.goal) * 100}%`, background: gradientCss(gradient, 'horizontal') }} />
          </div>
          <p className="text-[#6b7876] text-[11px] mt-1">{fmt(badge.progress) + ' / ' + fmt(badge.goal)}</p>
        </div>
      </div>
    </TiltCard>
  )
}

export default function LogrosPage() {
  const router = useRouter()
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    try {
      const computed = computeBadges(await loadAchievementStats(user.id))
      setBadges(computed)
      // Lo que ves aquí ya no se vuelve a avisar como insignia nueva
      await takeNewBadges(user.id, computed)
    } catch {
      setError('No pudimos cargar tus logros. Revisa tu conexión.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const unlockedCount = badges.filter((b) => b.unlocked).length
  const percent = badges.length ? Math.round((unlockedCount / badges.length) * 100) : 0
  // La insignia bloqueada a la que menos le falta (en proporción)
  const closest = badges
    .filter((b) => !b.unlocked)
    .sort((a, b) => b.progress / b.goal - a.progress / a.goal)[0]

  return (
    <div className="relative max-w-4xl mx-auto px-4 py-8 overflow-hidden">
      <GlowOrb color={colors.gold} size={360} style={{ top: -140, right: -120 }} intensity={0.25} />

      <div className="relative flex items-center gap-3 mb-5">
        <button type="button" onClick={() => router.back()} aria-label="Volver" className="text-[#9ca8a5] hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-3xl font-extrabold">Logros</h1>
      </div>

      {loading ? (
        <>
          <Skeleton height={150} radius={28} />
          <div className="grid grid-cols-2 gap-3 mt-5">
            <Skeleton height={156} radius={22} />
            <Skeleton height={156} radius={22} />
          </div>
        </>
      ) : error && badges.length === 0 ? (
        <div className="relative card-dark rounded-3xl p-6 text-center">
          <p className="text-[#9ca8a5]">{error}</p>
          <button type="button" onClick={load} className="btn-primary rounded-xl px-5 py-2.5 mt-4">Reintentar</button>
        </div>
      ) : (
        <>
          <FadeIn className="relative">
            <div className="card-dark rounded-3xl p-5 mb-6 flex items-center gap-5">
              <AnimatedRing progress={percent} size={112} stroke={12} colors={gradients.gold} delay={200}>
                <Trophy color={colors.gold} size={22} />
                <CountUp value={percent} suffix="%" delay={200} className="text-white text-lg font-extrabold mt-0.5" />
              </AnimatedRing>
              <div className="flex-1 min-w-0">
                <p>
                  <CountUp value={unlockedCount} className="text-white text-4xl font-extrabold" />
                  <span className="text-[#9ca8a5] text-sm ml-1">{'/ ' + badges.length}</span>
                </p>
                <p className="text-[#9ca8a5] text-xs">insignias desbloqueadas</p>
                {closest ? (
                  <div className="bg-[#1c2523] rounded-xl px-3 py-2 mt-3">
                    <p className="text-[#6b7876] text-[11px]">Te falta poco</p>
                    <p className="text-white text-xs font-semibold mt-0.5 truncate">{closest.title + ' · ' + fmt(closest.progress) + '/' + fmt(closest.goal)}</p>
                  </div>
                ) : (
                  <p className="text-green-500 text-xs font-semibold mt-3">¡Las tienes todas! 🏆</p>
                )}
              </div>
            </div>
          </FadeIn>

          {BADGE_GROUPS.map((group, g) => {
            const items = badges.filter((b) => b.group === group)
            return (
              <div key={group} className="relative mb-6">
                <FadeIn delay={120 + g * 60} className="flex items-center justify-between mb-3">
                  <p className="text-white font-bold">{group}</p>
                  <p className="text-[#6b7876] text-xs font-semibold">{items.filter((b) => b.unlocked).length + '/' + items.length}</p>
                </FadeIn>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {items.map((b, i) => (
                    <FadeIn key={b.id} delay={160 + g * 60 + i * 50}>
                      <BadgeCard badge={b} />
                    </FadeIn>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
