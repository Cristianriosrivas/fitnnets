import AsyncStorage from './storage'
import { supabase } from './supabase/browser'

// Pasos del día. El navegador no tiene podómetro: la web muestra lo que la app móvil guardó en
// daily_steps. La meta diaria se guarda en cada dispositivo, igual que en el móvil.

export const DEFAULT_STEP_GOAL = 8000
const GOAL_KEY = 'finnets.stepGoal'

export type DaySteps = { date: string; steps: number }

// Fecha local del dispositivo (no UTC): es el "hoy" que entiende el usuario
export function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function loadStepGoal() {
  const raw = await AsyncStorage.getItem(GOAL_KEY)
  const value = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_STEP_GOAL
}

export async function saveStepGoal(goal: number) {
  await AsyncStorage.setItem(GOAL_KEY, String(goal))
}

export async function loadStepHistory(userId: string, days = 30): Promise<DaySteps[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data } = await supabase
    .from('daily_steps')
    .select('date, steps')
    .eq('user_id', userId)
    .gte('date', localDate(since))
    .order('date')
  return (data || []) as DaySteps[]
}
