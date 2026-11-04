'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, FileText, LogOut, Mail, PersonStanding, ShieldCheck, Trash2 } from 'lucide-react'
import { supabase } from '@/core/supabase/browser'
import { LEGAL_INFO, POLICY_VERSION } from '@/core/legal/content'
import FadeIn from '@/components/ui/FadeIn'
import GradientButton from '@/components/ui/GradientButton'
import IconBadge from '@/components/ui/IconBadge'
import Skeleton from '@/components/ui/Skeleton'
import { GlowOrb } from '@/components/ui/Aurora'
import { colors, gradients } from '@/components/ui/theme'

type ConsentRecord = {
  consent_version: string | null
  terms_accepted_at: string | null
  health_data_consent_at: string | null
}

const CONFIRM_WORD = 'ELIMINAR'

function formatDate(iso: string | null) {
  if (!iso) return 'Sin registro'
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

function LinkRow({ icon, label, href, external = false }: { icon: ReactNode; label: string; href: string; external?: boolean }) {
  return (
    <Link href={href} target={external ? '_blank' : undefined} className="flex items-center gap-3 py-3 min-h-[44px] hover:opacity-80">
      {icon}
      <span className="text-white text-sm flex-1 min-w-0 truncate">{label}</span>
      <ChevronRight color={colors.muted} size={16} />
    </Link>
  )
}

export default function PrivacidadCuentaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [consent, setConsent] = useState<ConsentRecord | null>(null)

  const [shareMap, setShareMap] = useState<boolean | null>(null)
  const [savingShare, setSavingShare] = useState(false)
  const [shareError, setShareError] = useState('')

  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setAccountEmail(user.email || '')

    const { data, error } = await supabase
      .from('profiles')
      .select('consent_version, terms_accepted_at, health_data_consent_at, share_muscle_map')
      .eq('id', user.id)
      .single()

    if (error) {
      setLoadError('No pudimos cargar tu autorización.')
    } else {
      setConsent(data)
      setShareMap(!!data.share_muscle_map)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleShareMap = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || shareMap === null) return
    const value = !shareMap
    setShareMap(value)
    setSavingShare(true)
    setShareError('')
    const { error } = await supabase.from('profiles').update({ share_muscle_map: value }).eq('id', user.id)
    setSavingShare(false)
    if (error) {
      setShareMap(!value)
      setShareError('No se pudo guardar. Revisa tu conexión e intenta de nuevo.')
    }
  }

  const handleSignOut = async () => {
    if (!confirm('¿Quieres cerrar tu sesión en este navegador?')) return
    await supabase.auth.signOut({ scope: 'local' })
    router.replace('/login')
    router.refresh()
  }

  const handleDelete = async () => {
    if (!confirm('Se borrarán tu perfil, rutinas, progreso, planes de comida, amistades y retos. Esta acción no se puede deshacer.')) return
    setDeleting(true)
    setDeleteError('')

    const { error } = await supabase.rpc('delete_my_account')
    if (error) {
      setDeleteError(error.message)
      setDeleting(false)
      return
    }

    // El usuario ya no existe en el servidor: solo queda limpiar la sesión guardada en el navegador
    await supabase.auth.signOut({ scope: 'local' })
    router.replace('/login')
    router.refresh()
  }

  const canDelete = confirmText.trim() === CONFIRM_WORD && !deleting
  const isCurrent = consent?.consent_version === POLICY_VERSION

  return (
    <div className="relative max-w-xl mx-auto px-4 py-8 overflow-hidden">
      <GlowOrb color={colors.violet} size={340} style={{ top: -170, right: -130 }} intensity={0.24} />
      <FadeIn className="relative flex items-end gap-3 mb-5">
        <Link href="/perfil" aria-label="Volver al perfil" className="mb-1.5 text-[#9ca8a5] hover:text-white">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <p className="text-green-500 text-xs font-bold uppercase" style={{ letterSpacing: 2 }}>Tus datos, tu decisión</p>
          <h1 className="text-white text-3xl font-extrabold mt-1">Privacidad</h1>
        </div>
      </FadeIn>

      {/* Autorización */}
      <div className="relative card-dark rounded-3xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <IconBadge colors={gradients.violet} size={36} radius={12}>
            <ShieldCheck color="#ffffff" size={18} />
          </IconBadge>
          <p className="text-white font-bold">Tu autorización</p>
        </div>

        {loading ? (
          <Skeleton height={72} />
        ) : loadError ? (
          <div className="space-y-2">
            <p className="text-red-400 text-sm">{loadError}</p>
            <button type="button" onClick={load} className="btn-secondary rounded-lg px-3 py-2 text-xs">Reintentar</button>
          </div>
        ) : (
          <div className="space-y-1.5 text-sm text-[#9ca8a5]">
            <p>
              {'Versión aceptada: '}
              <span className="text-white">{consent?.consent_version || 'Sin registro'}</span>
              {isCurrent ? <span className="text-green-500"> (vigente)</span> : null}
            </p>
            <p>{'Términos y privacidad: '}<span className="text-white">{formatDate(consent?.terms_accepted_at ?? null)}</span></p>
            <p>{'Datos de salud: '}<span className="text-white">{formatDate(consent?.health_data_consent_at ?? null)}</span></p>
            {accountEmail ? <p className="text-[#6b7876] text-xs pt-1">{'Cuenta: ' + accountEmail}</p> : null}
          </div>
        )}

        <p className="text-[#6b7876] text-xs mt-3 leading-4">
          Puedes conocer, actualizar y rectificar tus datos desde tu perfil. Para revocar tu autorización y suprimir tus datos, elimina tu cuenta. Para cualquier otra solicitud, escríbenos.
        </p>
      </div>

      {/* Documentos y contacto */}
      <div className="relative card-dark rounded-3xl px-4 py-1 mb-4 divide-y divide-[#2a3532]">
        <LinkRow icon={<ShieldCheck color={colors.soft} size={16} />} label="Política de privacidad" href="/privacidad" external />
        <LinkRow icon={<FileText color={colors.soft} size={16} />} label="Términos y condiciones" href="/terminos" external />
        <LinkRow icon={<Mail color={colors.soft} size={16} />} label={LEGAL_INFO.email} href={'mailto:' + LEGAL_INFO.email} />
      </div>

      {/* Compartir el mapa muscular (opt-in) */}
      {shareMap !== null ? (
        <div className="relative card-dark rounded-3xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <IconBadge colors={gradients.violet} size={36} radius={12}>
              <PersonStanding color="#ffffff" size={18} />
            </IconBadge>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">Compartir mi mapa muscular</p>
              <p className="text-[#6b7876] text-xs mt-0.5 leading-4">
                Tus amigos podrán compararse con tu mapa (series y pesos por ejercicio). Nunca se comparten tus medidas corporales.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={shareMap}
              aria-label="Compartir mi mapa muscular con mis amigos"
              onClick={toggleShareMap}
              disabled={savingShare}
              className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors ${shareMap ? 'bg-green-500' : 'bg-[#2a3532]'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${shareMap ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          {shareError ? <p className="text-red-400 text-xs mt-2">{shareError}</p> : null}
        </div>
      ) : null}

      {/* Sesión */}
      <button type="button" onClick={handleSignOut} className="relative w-full card-dark rounded-3xl px-4 py-3 mb-6 flex items-center gap-3 min-h-[48px] hover:border-[#6b7876]">
        <LogOut color={colors.soft} size={16} />
        <span className="text-white text-sm font-medium">Cerrar sesión</span>
      </button>

      {/* Eliminar cuenta */}
      <div className="relative bg-red-500/5 border border-red-500/30 rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Trash2 color="#f87171" size={16} />
          <p className="text-red-300 font-semibold text-sm">Eliminar mi cuenta</p>
        </div>
        <p className="text-[#9ca8a5] text-xs leading-4 mb-3">
          Borra de inmediato tu perfil, tus datos de salud, rutinas, entrenamientos, planes de comida, amistades y los retos que creaste. Las rutinas que creaste para tus amigos se quedan en su cuenta, sin tu nombre.
        </p>

        <label className="block text-[#9ca8a5] text-xs mb-1">{'Escribe ' + CONFIRM_WORD + ' para confirmar'}</label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
          placeholder={CONFIRM_WORD}
          disabled={deleting}
          autoComplete="off"
          className="input-dark w-full rounded-lg px-3 py-2.5 mb-3"
        />

        {deleteError ? (
          <div className="bg-red-500/10 rounded-lg p-3 mb-3">
            <p className="text-red-400 text-sm">No se pudo eliminar la cuenta. Revisa tu conexión e intenta de nuevo.</p>
            <p className="text-red-400/70 text-xs mt-1">{deleteError}</p>
          </div>
        ) : null}

        <GradientButton
          title={deleting ? 'Eliminando...' : 'Eliminar cuenta'}
          onClick={handleDelete}
          disabled={!canDelete}
          loading={deleting}
          colors={['#fb7185', '#dc2626']}
          textColor="#ffffff"
          icon={<Trash2 color="#ffffff" size={17} />}
          className="w-full"
        />
      </div>
    </div>
  )
}
