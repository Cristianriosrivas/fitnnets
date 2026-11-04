'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Users, Lock, Ruler, Dumbbell, Swords, BatteryCharging } from 'lucide-react'
import { supabase } from '@/core/supabase/browser'
import storage from '@/core/storage'
import {
  ALL_REGIONS, MapMode, MuscleProfile, Region, RegionTier, TIER_COLOR, TIER_ORDER, buildMuscleProfile,
  compareProfiles, heatColor, loadFriendExerciseStats, loadOwnExerciseStats, loadSizeChanges, regionValues, tierFor,
} from '@/core/muscles'
import { RecoveryMap, RegionRecovery, computeRecovery, loadRecentLogs, recoveryColor } from '@/core/recovery'
import Body3D from '@/components/body/Body3D'
import { BODY_VARIANT_KEY, BodyVariant, variantForGender } from '@/components/body/BodyMap'
import FadeIn from '@/components/ui/FadeIn'
import AnimatedRing from '@/components/ui/AnimatedRing'
import CountUp from '@/components/ui/CountUp'
import Skeleton from '@/components/ui/Skeleton'
import { GlowOrb } from '@/components/ui/Aurora'
import { colors, gradientCss, gradients, GradientColors } from '@/components/ui/theme'

// Además de los modos del mapa muscular, tu cuerpo tiene "Recuperación" (solo en tu propio mapa)
type ViewMode = MapMode | 'recuperacion'

const MODES: { value: ViewMode; label: string }[] = [
  { value: 'volumen', label: 'Volumen' },
  { value: 'progreso', label: 'Progreso' },
  { value: 'rango', label: 'Rango' },
  { value: 'recuperacion', label: 'Recuperación' },
]
const FRIEND_MODES = MODES.filter((m) => m.value !== 'recuperacion')

const MODE_HINT: Record<ViewMode, string> = {
  volumen: 'Lo que más entrenas (últimos 30 días)',
  progreso: 'Dónde subiste peso o ganaste centímetros',
  rango: 'El nivel de cada músculo, de Bronce a Diamante',
  recuperacion: 'Verde = listo para entrenar · rojo = necesita descanso',
}

const RECOVERY_LEGEND: GradientColors = ['#ef4444', '#f59e0b', '#facc15', '#a3e635', '#22c55e']
const HEAT_LEGEND: GradientColors = ['#2a3532', '#14b8a6', '#22c55e', '#a3e635', '#f59e0b', '#ef4444']

const tierColorFor = (_region: Region, value: number) => TIER_COLOR[tierFor(value * 100)]

function TierChip({ tier, small }: { tier: RegionTier; small?: boolean }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-extrabold whitespace-nowrap"
      style={{ backgroundColor: TIER_COLOR[tier] + '26', border: `1px solid ${TIER_COLOR[tier]}66`, color: tier === 'Sin entrenar' ? colors.muted : TIER_COLOR[tier], fontSize: small ? 10 : 11 }}
    >
      {tier}
    </span>
  )
}

// Selector de modo con una píldora que se desliza
function ModeSwitch({ modes, mode, onChange }: { modes: { value: ViewMode; label: string }[]; mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const index = Math.max(0, modes.findIndex((m) => m.value === mode))
  return (
    <div role="tablist" className="relative flex card-dark rounded-2xl p-1 h-[46px]">
      <div
        aria-hidden
        className="absolute top-[3px] bottom-[3px] left-[3px] rounded-xl"
        style={{
          width: `calc((100% - 6px) / ${modes.length})`,
          transform: `translateX(${index * 100}%)`,
          transition: 'transform 0.28s cubic-bezier(0.34, 1.3, 0.64, 1)',
          background: gradientCss(gradients.brand, 'horizontal'),
        }}
      />
      {modes.map((m) => {
        const active = m.value === mode
        return (
          <button
            key={m.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m.value)}
            className="relative flex-1 min-w-0 truncate"
            style={{ color: active ? '#04120a' : colors.soft, fontWeight: active ? 800 : 600, fontSize: modes.length > 3 ? 12 : 13 }}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}

function Legend({ mode }: { mode: ViewMode }) {
  if (mode === 'rango') {
    return (
      <div className="flex flex-wrap justify-center gap-1.5 mt-4">
        {TIER_ORDER.slice(1).map((t) => (
          <TierChip key={t} tier={t} small />
        ))}
      </div>
    )
  }
  const recovery = mode === 'recuperacion'
  return (
    <div className="mt-4 px-6 w-full max-w-xs">
      <div className="h-2 rounded-full" style={{ background: gradientCss(recovery ? RECOVERY_LEGEND : HEAT_LEGEND, 'horizontal') }} />
      <div className="flex justify-between mt-1 text-[#6b7876] text-[11px]">
        <span>{recovery ? 'Cansado' : mode === 'progreso' ? 'Sin cambio' : 'Poco'}</span>
        <span>{recovery ? 'Recuperado' : mode === 'progreso' ? 'Gran mejora' : 'Mucho'}</span>
      </div>
    </div>
  )
}

function DetailTile({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="bg-[#1c2523] rounded-xl px-3 py-2">
      <p className="text-[#6b7876] text-[11px]">{label}</p>
      <p className={`font-bold ${highlight ? 'text-green-500' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function RegionDetail({ profile, region, recovery }: { profile: MuscleProfile; region: Region; recovery?: RegionRecovery }) {
  const r = profile.regions[region]
  return (
    <div className="card-dark rounded-3xl p-4 mt-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white font-extrabold text-lg">{r.label}</p>
        <TierChip tier={r.tier} />
      </div>
      {recovery ? (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-2" style={{ backgroundColor: recoveryColor(recovery.recovery) + '1f' }}>
          <BatteryCharging color={recoveryColor(recovery.recovery)} size={16} />
          <p className="text-white text-sm font-semibold flex-1">
            {Math.round(recovery.recovery * 100) + '% recuperado' + (recovery.hoursToFull ? ' · listo en ' + recovery.hoursToFull + ' h' : ' · listo para entrenar')}
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <DetailTile label="Series (30 días)" value={Math.round(r.recent)} />
        <DetailTile label="Series totales" value={Math.round(r.volume)} />
        <DetailTile label="Fuerza" value={r.strength === null ? '—' : (r.strength > 0 ? '+' : '') + Math.round(r.strength * 100) + '%'} highlight={!!r.strength && r.strength > 0} />
        {r.size ? <DetailTile label={r.size.label} value={(r.size.delta > 0 ? '+' : '') + r.size.delta + ' cm'} /> : null}
      </div>
      {r.topExercise ? (
        <div className="flex items-center gap-2 mt-3">
          <Dumbbell color={colors.primary} size={14} />
          <p className="text-[#9ca8a5] text-xs">{'Tu ejercicio principal: ' + r.topExercise}</p>
        </div>
      ) : (
        <p className="text-[#6b7876] text-xs mt-3">Todavía no entrenas este músculo. Agrega un ejercicio a tu rutina.</p>
      )}
    </div>
  )
}

function Cuerpo() {
  const router = useRouter()
  const params = useSearchParams()
  const friendId = params.get('friendId') || undefined
  const friendName = params.get('friendName') || 'tu amigo'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<ViewMode>(params.get('mode') === 'recuperacion' && !friendId ? 'recuperacion' : 'volumen')
  const [recoveryMap, setRecoveryMap] = useState<RecoveryMap | null>(null)
  const [selected, setSelected] = useState<Region | null>(null)
  const [variant, setVariant] = useState<BodyVariant>('male')
  const [mine, setMine] = useState<MuscleProfile | null>(null)
  const [sharing, setSharing] = useState<boolean | null>(null)
  const [friends, setFriends] = useState<{ id: string; username: string }[]>([])
  const [theirs, setTheirs] = useState<MuscleProfile | null>(null)
  const [theirVariant, setTheirVariant] = useState<BodyVariant>('male')
  const [friendStatus, setFriendStatus] = useState<'ok' | 'not_shared' | 'not_friends' | 'unavailable' | 'error' | null>(null)

  const load = useCallback(async () => {
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    try {
      const [stats, sizes, savedVariant, recentLogs] = await Promise.all([
        loadOwnExerciseStats(user.id, !friendId),
        loadSizeChanges(user.id),
        storage.getItem(BODY_VARIANT_KEY),
        loadRecentLogs(user.id).catch(() => []),
      ])
      const profile = buildMuscleProfile(stats, sizes)
      setMine(profile)
      setRecoveryMap(computeRecovery(recentLogs))
      setSelected((current) => current ?? (profile.ranked[0]?.score ? profile.ranked[0].region : 'chest'))

      const { data: myRow } = await supabase.from('profiles').select('gender, share_muscle_map').eq('id', user.id).single()
      setVariant(savedVariant === 'male' || savedVariant === 'female' ? savedVariant : variantForGender(myRow?.gender))
      setSharing(myRow ? !!myRow.share_muscle_map : null)

      if (friendId) {
        const [result, friendProfile] = await Promise.all([
          loadFriendExerciseStats(friendId),
          supabase.from('profiles').select('gender').eq('id', friendId).maybeSingle(),
        ])
        setTheirVariant(variantForGender(friendProfile.data?.gender))
        setFriendStatus(result.status)
        setTheirs(result.status === 'ok' ? buildMuscleProfile(result.stats) : null)
      } else {
        const [{ data: sent }, { data: received }] = await Promise.all([
          supabase.from('friendships').select('profiles!friendships_friend_id_fkey(id, username)').eq('user_id', user.id).eq('status', 'aceptado'),
          supabase.from('friendships').select('profiles!friendships_user_id_fkey(id, username)').eq('friend_id', user.id).eq('status', 'aceptado'),
        ])
        setFriends(
          [...(sent || []), ...(received || [])]
            .map((f: any) => f.profiles)
            .filter((p: any) => p?.id)
            .map((p: any) => ({ id: p.id, username: p.username }))
        )
      }
    } catch {
      setError('No pudimos cargar tu mapa muscular. Revisa tu conexión.')
    }
    setLoading(false)
  }, [friendId])

  useEffect(() => {
    load()
  }, [load])

  const changeVariant = (v: BodyVariant) => {
    setVariant(v)
    storage.setItem(BODY_VARIANT_KEY, v)
  }

  // Los modos del mapa muscular; en "Recuperación" los valores salen del mapa de recuperación
  const mapMode: MapMode = mode === 'recuperacion' ? 'volumen' : mode
  const colorFor =
    mode === 'rango' ? tierColorFor : mode === 'recuperacion' ? (_region: Region, value: number) => recoveryColor(value) : undefined
  const glowFor = (profile: MuscleProfile) => (mode === 'rango' ? TIER_COLOR[profile.overallTier] : mode === 'progreso' ? colors.lime : colors.primary)

  const header = (
    <div className="flex items-end gap-3 mb-5">
      <button type="button" onClick={() => router.back()} aria-label="Volver" className="mb-1.5 text-[#9ca8a5] hover:text-white">
        <ArrowLeft size={22} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-green-500 text-xs font-bold uppercase" style={{ letterSpacing: 2 }}>{friendId ? 'Comparación' : 'Mapa muscular'}</p>
        <h1 className="text-white text-3xl font-extrabold mt-1 truncate">{friendId ? 'Tú vs ' + friendName : 'Tu cuerpo'}</h1>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 flex flex-col items-center">
        <Skeleton height={46} radius={16} />
        <Skeleton height={480} width={220} radius={110} style={{ marginTop: 24 }} />
      </div>
    )
  }

  if (error || !mine) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        {header}
        <div className="card-dark rounded-3xl p-6 text-center">
          <p className="text-[#9ca8a5]">{error || 'Sin datos.'}</p>
          <button type="button" onClick={load} className="btn-primary rounded-xl px-5 py-2.5 mt-4">Reintentar</button>
        </div>
      </div>
    )
  }

  // ----- Comparación con un amigo -----
  if (friendId) {
    const comparison = theirs ? compareProfiles(mine, theirs) : null
    return (
      <div className="relative max-w-xl mx-auto px-4 py-8 overflow-hidden">
        <GlowOrb color={colors.sky} size={360} style={{ top: -160, right: -140 }} intensity={0.22} />
        <FadeIn className="relative">{header}</FadeIn>

        {friendStatus !== 'ok' || !theirs ? (
          <FadeIn delay={80} className="relative">
            <div className="card-dark rounded-3xl p-6 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#1c2523] flex items-center justify-center mb-3">
                <Lock color={colors.muted} size={24} />
              </div>
              <p className="text-white font-bold">
                {friendStatus === 'not_shared'
                  ? friendName + ' aún no comparte su mapa'
                  : friendStatus === 'unavailable'
                    ? 'Comparación aún no disponible'
                    : 'No pudimos cargar la comparación'}
              </p>
              <p className="text-[#9ca8a5] text-sm mt-1 leading-5">
                {friendStatus === 'not_shared'
                  ? 'Pídele que lo active en Perfil → Privacidad y cuenta → Compartir mi mapa muscular.'
                  : friendStatus === 'unavailable'
                    ? 'Falta aplicar la actualización de la base de datos del mapa muscular.'
                    : friendStatus === 'not_friends'
                      ? 'Solo puedes comparar con amigos aceptados.'
                      : 'Revisa tu conexión e intenta de nuevo.'}
              </p>
              {friendStatus === 'error' ? (
                <button type="button" onClick={load} className="btn-primary rounded-xl px-5 py-2.5 mt-4">Reintentar</button>
              ) : null}
            </div>
          </FadeIn>
        ) : (
          <div className="relative">
            <FadeIn delay={60}>
              <ModeSwitch modes={FRIEND_MODES} mode={mode} onChange={setMode} />
              <p className="text-[#6b7876] text-xs text-center mt-2">{MODE_HINT[mode]}</p>
            </FadeIn>

            <FadeIn delay={120}>
              <div className="grid grid-cols-2 gap-3 mt-5">
                {[
                  { label: 'Tú', profile: mine, v: variant },
                  { label: friendName, profile: theirs, v: theirVariant },
                ].map((side) => (
                  <div key={side.label} className="flex flex-col items-center min-w-0">
                    <Body3D variant={side.v} values={regionValues(side.profile, mapMode)} width={150} colorFor={colorFor} glowColor={glowFor(side.profile)} showControls={false} />
                    <p className="text-white font-bold mt-3 truncate max-w-full">{side.label}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <TierChip tier={side.profile.overallTier} small />
                      <span className="text-[#9ca8a5] text-xs">{side.profile.overallScore + ' pts'}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[#6b7876] text-[11px] text-center mt-3">Arrastra cada cuerpo de lado para verlo de espalda</p>
            </FadeIn>

            {comparison ? (
              <FadeIn delay={200}>
                <div className="card-dark rounded-3xl p-5 mt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Swords color={colors.orange} size={18} />
                    <p className="text-white font-bold">Quién domina</p>
                  </div>
                  <p className="text-[#c9d1cf] text-sm leading-5">
                    <span className="text-green-500 font-bold">{'Tú: '}</span>
                    {comparison.mineWins.length ? comparison.mineWins.slice(0, 4).map((r) => r.label).join(', ') : 'ningún músculo por ahora'}
                  </p>
                  <p className="text-[#c9d1cf] text-sm leading-5 mt-1.5">
                    <span className="text-sky-400 font-bold">{friendName + ': '}</span>
                    {comparison.theirWins.length ? comparison.theirWins.slice(0, 4).map((r) => r.label).join(', ') : 'ningún músculo por ahora'}
                  </p>
                </div>
              </FadeIn>
            ) : null}

            <FadeIn delay={260}>
              <div className="card-dark rounded-3xl p-5 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white font-bold">Músculo por músculo</p>
                  <div className="flex items-center gap-3 text-[#9ca8a5] text-[11px]">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />Tú</span>
                    <span className="flex items-center gap-1 min-w-0"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" /><span className="truncate">{friendName}</span></span>
                  </div>
                </div>
                {ALL_REGIONS.filter((r) => mine.regions[r].score > 0 || theirs.regions[r].score > 0)
                  .sort((a, b) => Math.max(mine.regions[b].score, theirs.regions[b].score) - Math.max(mine.regions[a].score, theirs.regions[a].score))
                  .map((r) => (
                    <div key={r} className="mb-3">
                      <p className="text-[#c9d1cf] text-xs font-semibold mb-1">{mine.regions[r].label}</p>
                      {[{ score: mine.regions[r].score, color: colors.primary }, { score: theirs.regions[r].score, color: colors.sky }].map((bar, i) => (
                        <div key={i} className={`flex items-center gap-2 ${i ? 'mt-1' : ''}`}>
                          <div className="flex-1 h-2 rounded-full bg-[#1c2523] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${bar.score}%`, backgroundColor: bar.color }} />
                          </div>
                          <span className="text-[#9ca8a5] text-[11px] w-7 text-right">{bar.score}</span>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </FadeIn>
          </div>
        )}
      </div>
    )
  }

  // ----- Tu cuerpo -----
  const values: Partial<Record<Region, number>> =
    mode === 'recuperacion' && recoveryMap
      ? (Object.fromEntries(Object.entries(recoveryMap).map(([region, r]) => [region, r.recovery])) as Record<Region, number>)
      : regionValues(mine, mapMode)
  const hasData = mine.ranked.some((r) => r.volume > 0)

  return (
    <div className="relative max-w-5xl mx-auto px-4 py-8 overflow-hidden">
      <GlowOrb color={glowFor(mine)} size={420} style={{ top: 120, left: 'calc(50% - 210px)' }} intensity={0.18} />
      <FadeIn className="relative">{header}</FadeIn>

      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-x-6">
        <div>
          {/* Rango corporal */}
          <FadeIn delay={60}>
            <div className="card-dark rounded-3xl p-4 mb-4 flex items-center gap-4">
              <AnimatedRing progress={mine.overallScore} size={84} stroke={9} colors={[TIER_COLOR[mine.overallTier], colors.primary]} delay={200}>
                <CountUp value={mine.overallScore} delay={200} className="text-white text-lg font-extrabold" />
              </AnimatedRing>
              <div className="flex-1 min-w-0">
                <p className="text-[#9ca8a5] text-xs">Rango corporal</p>
                <p className="text-white text-2xl font-extrabold mt-0.5">{mine.overallTier}</p>
                <p className="text-[#6b7876] text-[11px] mt-0.5">Promedio de tus 8 músculos más trabajados</p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <ModeSwitch modes={MODES} mode={mode} onChange={setMode} />
            <p className="text-[#6b7876] text-xs text-center mt-2">{MODE_HINT[mode]}</p>
          </FadeIn>

          <FadeIn delay={160} className="flex flex-col items-center mt-5">
            <Body3D variant={variant} values={values} width={230} colorFor={colorFor} selected={selected} onSelect={setSelected} glowColor={glowFor(mine)} />
            <div className="flex gap-2 mt-3">
              {(['male', 'female'] as BodyVariant[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => changeVariant(v)}
                  className={`px-3 py-1.5 rounded-full border text-xs ${variant === v ? 'bg-[#1c2523] border-green-500 text-green-500 font-bold' : 'bg-[#141b19] border-[#2a3532] text-[#9ca8a5]'}`}
                >
                  {v === 'male' ? 'Hombre' : 'Mujer'}
                </button>
              ))}
            </div>
            <Legend mode={mode} />
          </FadeIn>
        </div>

        <div>
          {!hasData ? (
            <div className="card-dark rounded-3xl p-5 mt-5 lg:mt-0 text-center">
              <p className="text-white font-bold">Tu mapa se enciende al entrenar</p>
              <p className="text-[#9ca8a5] text-sm mt-1">Completa entrenamientos y anota tus pesos: cada músculo trabajado se ilumina.</p>
            </div>
          ) : selected ? (
            <FadeIn key={selected} className="lg:-mt-5">
              <RegionDetail profile={mine} region={selected} recovery={mode === 'recuperacion' ? recoveryMap?.[selected] : undefined} />
            </FadeIn>
          ) : null}

          {hasData ? (
            <FadeIn delay={220}>
              <div className="card-dark rounded-3xl p-5 mt-4">
                <p className="text-white font-bold mb-3">Tus músculos más trabajados</p>
                {mine.ranked.filter((r) => r.score > 0).slice(0, 6).map((r) => (
                  <button key={r.region} type="button" onClick={() => setSelected(r.region)} className="block w-full text-left mb-3">
                    <span className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-semibold">{r.label}</span>
                      <span className="flex items-center gap-2">
                        {r.strength && r.strength > 0 ? <span className="text-green-500 text-[11px] font-bold">{'+' + Math.round(r.strength * 100) + '% fuerza'}</span> : null}
                        {r.size && r.size.delta > 0 && r.region !== 'abs' && r.region !== 'obliques' ? (
                          <span className="flex items-center gap-0.5 text-sky-400 text-[11px] font-bold">
                            <Ruler color={colors.sky} size={11} />
                            {'+' + r.size.delta + ' cm'}
                          </span>
                        ) : null}
                        <TierChip tier={r.tier} small />
                      </span>
                    </span>
                    <span className="block h-2 rounded-full bg-[#1c2523] overflow-hidden">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${r.score}%`, backgroundColor: mode === 'rango' ? TIER_COLOR[r.tier] : mode === 'recuperacion' && recoveryMap ? recoveryColor(recoveryMap[r.region].recovery) : heatColor(values[r.region] ?? 0) }}
                      />
                    </span>
                  </button>
                ))}
              </div>
            </FadeIn>
          ) : null}

          {/* Comparar con amigos */}
          <FadeIn delay={280}>
            <div className="card-dark rounded-3xl p-5 mt-4">
              <div className="flex items-center gap-2 mb-1">
                <Users color={colors.sky} size={18} />
                <p className="text-white font-bold">Compárate con un amigo</p>
              </div>
              <p className="text-[#9ca8a5] text-xs mb-3">
                {sharing ? 'Tu mapa está compartido con tus amigos.' : 'Tu mapa es privado. Actívalo en Privacidad y cuenta para que tus amigos te comparen.'}
              </p>
              {friends.length === 0 ? (
                <p className="text-[#6b7876] text-sm">Agrega amigos en Social para compararte.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {friends.map((f) => (
                    <Link
                      key={f.id}
                      href={`/cuerpo?friendId=${f.id}&friendName=${encodeURIComponent(f.username)}`}
                      aria-label={'Compararme con ' + f.username}
                      className="press flex items-center gap-1.5 bg-[#1c2523] border border-[#2a3532] rounded-full px-3 py-2"
                    >
                      <Swords color={colors.sky} size={13} />
                      <span className="text-white text-xs font-semibold">{f.username}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  )
}

// useSearchParams exige un límite Suspense en Next.js
export default function CuerpoPage() {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-8"><Skeleton height={46} radius={16} /></div>}>
      <Cuerpo />
    </Suspense>
  )
}
