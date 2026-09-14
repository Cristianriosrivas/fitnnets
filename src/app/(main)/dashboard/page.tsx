import { createClient } from '@/core/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Calcular racha de días consecutivos
  const { data: allDates } = await supabase
    .from('progress_logs')
    .select('date')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })

  let streak = 0
  if (allDates && allDates.length > 0) {
    const uniqueDates = Array.from(new Set(allDates.map((d) => d.date))).sort().reverse()
    let checkDate = new Date()

    for (const dateStr of uniqueDates) {
      const logDate = new Date(dateStr)
      const diffDays = Math.floor(
        (checkDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (diffDays <= 1) {
        streak++
        checkDate = logDate
      } else {
        break
      }
    }
  }

  // Contar rutinas activas
  const { count: routinesCount } = await supabase
    .from('routines')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user!.id)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">
        ¡Hola de nuevo! 👋
      </h1>
      <p className="text-gray-500 mt-1">{user?.email}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400">Racha actual</p>
          <p className="text-2xl font-bold text-gray-900">{streak} días</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400">Rutinas activas</p>
          <p className="text-2xl font-bold text-gray-900">{routinesCount || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400">Amigos</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400">Retos activos</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </div>
      </div>
    </div>
  )
}