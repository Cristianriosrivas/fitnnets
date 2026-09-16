import { createClient } from '@/core/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'

export const dynamic = 'force-dynamic'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('age, goal')
    .eq('id', user.id)
    .single()

  if (!profile?.age || !profile?.goal) {
    redirect('/onboarding')
  }

  return (
    <div className="flex min-h-screen bg-[#0a0f0d]">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <main className="pb-20 md:pb-0">{children}</main>
        <BottomNav />
      </div>
    </div>
  )
}
