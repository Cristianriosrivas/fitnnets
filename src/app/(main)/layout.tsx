import { createClient } from '@/core/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import AppNotices from '@/components/AppNotices'
import { POLICY_VERSION } from '@/core/legal/content'
import { consentFromMetadata } from '@/core/legal/consent'

export const dynamic = 'force-dynamic'

// Orden de los filtros: sesión -> autorización vigente -> perfil completo (onboarding)
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('age, goal, consent_version')
    .eq('id', user.id)
    .single()

  // Sin perfil no se puede decidir: un fallo de red no debe mandar a nadie al onboarding
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex flex-col items-center justify-center px-8 text-center">
        <p className="text-white font-semibold">No pudimos cargar tu perfil</p>
        <p className="text-[#9ca8a5] text-sm mt-1">Revisa tu conexión e intenta de nuevo.</p>
        <Link href="/dashboard" className="btn-primary rounded-xl px-6 py-3 mt-5">Reintentar</Link>
      </div>
    )
  }

  if (profile.consent_version !== POLICY_VERSION) {
    // Autorización dada en el registro que aún no se había copiado al perfil
    const fromSignUp = consentFromMetadata(user)
    if (!fromSignUp) {
      redirect('/consent')
    }
    await supabase.from('profiles').update(fromSignUp).eq('id', user.id)
  }

  if (!profile.age || !profile.goal) {
    redirect('/onboarding')
  }

  return (
    <div className="flex min-h-screen bg-[#0a0f0d]">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <main className="pb-24 md:pb-0">{children}</main>
        <BottomNav />
      </div>
      <AppNotices />
    </div>
  )
}
