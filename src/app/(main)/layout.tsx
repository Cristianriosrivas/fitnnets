import { createClient } from '@/core/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import BottomNav from '@/components/layout/BottomNav'

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

  // Verifica si el usuario ya completó su perfil físico
  const { data: profile } = await supabase
    .from('profiles')
    .select('age, goal')
    .eq('id', user.id)
    .single()

  if (!profile?.age || !profile?.goal) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pb-20 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  )
}
