import AsyncStorage from './storage'
import { supabase } from './supabase/browser'
import { computeBadges, loadAchievementStats, takeNewBadges } from './achievements'

// Revisiones que se hacen al entrar a la app o al volver a la pestaña. El móvil avisa con
// notificaciones; la web las muestra como avisos dentro de la página (ver components/AppNotices).

export type AppNotice = { id: string; title: string; body: string; href: string }

const ASSIGNED_KEY = (userId: string) => `finnets.assigned.lastSeen.${userId}`
let checkingRoutines = false
let checkingBadges = false

async function currentUserId() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

// Rutinas que un amigo te asignó desde la última revisión (assign_routine las crea con created_by)
export async function checkAssignedRoutines(): Promise<AppNotice[]> {
  if (checkingRoutines) return []
  checkingRoutines = true
  try {
    const userId = await currentUserId()
    if (!userId) return []

    const lastSeen = await AsyncStorage.getItem(ASSIGNED_KEY(userId))
    if (!lastSeen) {
      // Primera vez en este navegador: solo se avisa de lo que llegue desde ahora
      await AsyncStorage.setItem(ASSIGNED_KEY(userId), new Date().toISOString())
      return []
    }

    const { data, error } = await supabase
      .from('routines')
      .select('id, title, created_at, creator:profiles!routines_created_by_fkey(username)')
      .eq('user_id', userId)
      .not('created_by', 'is', null)
      .neq('created_by', userId)
      .gt('created_at', lastSeen)
      .order('created_at', { ascending: true })

    if (error || !data || data.length === 0) return []

    await AsyncStorage.setItem(ASSIGNED_KEY(userId), data[data.length - 1].created_at)
    return data.slice(-3).map((routine) => {
      const creator = (routine.creator as { username?: string } | null)?.username || 'Un amigo'
      return { id: routine.id, title: `${creator} te asignó una rutina`, body: `"${routine.title}" ya está en tu lista de rutinas.`, href: '/rutinas' }
    })
  } finally {
    checkingRoutines = false
  }
}

export async function checkNewBadges(): Promise<AppNotice[]> {
  if (checkingBadges) return []
  checkingBadges = true
  try {
    const userId = await currentUserId()
    if (!userId) return []
    const badges = computeBadges(await loadAchievementStats(userId))
    const fresh = await takeNewBadges(userId, badges)
    return fresh.slice(0, 3).map((badge) => ({ id: badge.id, title: '¡Nueva insignia! 🏆', body: `${badge.title}: ${badge.description}.`, href: '/logros' }))
  } catch {
    // Sin conexión: se vuelve a revisar la próxima vez
    return []
  } finally {
    checkingBadges = false
  }
}
