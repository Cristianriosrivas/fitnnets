import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

// Llamadas a Gemini con rotación de modelos. La cuota gratuita y la saturación van por modelo:
// si uno falla o tarda demasiado, se pasa al siguiente y se deja descansar un rato.

// Los alias "latest" los mantiene Google; el resto de la lista se descubre en la API para no
// depender de nombres que Google retira. FALLBACK_MODELS solo se usa si esa consulta falla.
const PREFERRED_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest']
const FALLBACK_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']
const MAX_MODELS = 6

const ATTEMPT_TIMEOUT_MS = 45_000 // una rutina puede tardar casi eso en un modelo con razonamiento
const TOTAL_BUDGET_MS = 100_000 // por debajo del maxDuration de las rutas
const SLOW_RESPONSE_MS = 30_000
const MODEL_LIST_TTL_MS = 60 * 60_000

const COOLDOWN_MS = { overloaded: 60_000, quota: 10 * 60_000, not_found: 60 * 60_000, slow: 2 * 60_000 }

export type AiErrorCode = 'no_key' | 'bad_key' | 'overloaded' | 'quota' | 'failed'
type FailureKind = 'overloaded' | 'quota' | 'not_found' | 'bad_key' | 'bad_output' | 'other'
type Attempt = { model: string; status: number | null; kind: FailureKind }

export class AiError extends Error {
  constructor(public code: AiErrorCode, public attempts: Attempt[]) {
    super(code)
  }
}

// En memoria de cada instancia: se pierde al reiniciar, lo cual solo hace probar de nuevo el orden normal
const cooldowns = new Map<string, number>()
let discovered: { models: string[]; at: number } | null = null

function versionOf(name: string) {
  const match = name.match(/gemini-(\d+(?:\.\d+)?)/)
  return match ? parseFloat(match[1]) : 0
}

// Modelos de texto "flash" que esta clave puede usar, del más nuevo al más viejo; los "lite" y las
// vistas previas van después
async function discoverModels(apiKey: string): Promise<string[]> {
  if (discovered && Date.now() - discovered.at < MODEL_LIST_TTL_MS) return discovered.models
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) return FALLBACK_MODELS
    const { models } = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] }
    const names = (models || [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => m.name.replace('models/', ''))
      .filter((n) => n.includes('flash') && !/image|tts|audio|live|embedding|robotics|computer|latest/.test(n))
    const rank = (n: string) => (n.includes('lite') ? 1 : 0) + (/preview|exp/.test(n) ? 2 : 0)
    names.sort((a, b) => rank(a) - rank(b) || versionOf(b) - versionOf(a))
    if (names.length === 0) return FALLBACK_MODELS
    discovered = { models: names, at: Date.now() }
    return names
  } catch {
    return FALLBACK_MODELS
  }
}

// Primero los que están descansados, en orden de preferencia; los saturados quedan de último recurso
async function modelChain(apiKey: string) {
  const all = [...new Set([...PREFERRED_MODELS, ...(await discoverModels(apiKey))])].slice(0, MAX_MODELS)
  const now = Date.now()
  const rested = all.filter((m) => (cooldowns.get(m) ?? 0) <= now)
  const tired = all.filter((m) => (cooldowns.get(m) ?? 0) > now)
  return [...rested, ...tired]
}

function classify(err: unknown): { status: number | null; kind: FailureKind } {
  const e = err as { status?: number; message?: string; name?: string }
  const status = typeof e?.status === 'number' ? e.status : null
  const message = String(e?.message || '').toLowerCase()

  if (status === 401 || status === 403 || message.includes('api key') || message.includes('api_key')) return { status, kind: 'bad_key' }
  if (status === 429 || message.includes('quota') || message.includes('resource_exhausted')) return { status, kind: 'quota' }
  if (status === 404) return { status, kind: 'not_found' }
  if ((status !== null && status >= 500) || e?.name === 'AbortError' || /timeout|timed out|aborted|overloaded|fetch failed/.test(message)) {
    return { status, kind: 'overloaded' }
  }
  return { status, kind: 'other' }
}

// Prueba los modelos hasta tener una respuesta que parse acepte. Si parse lanza un error, la
// respuesta no sirve y se pasa al siguiente modelo.
export async function generateWithFallback<T>(prompt: string, parse: (text: string) => T, options: { json?: boolean } = {}): Promise<{ data: T; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new AiError('no_key', [])

  const genAI = new GoogleGenerativeAI(apiKey)
  const started = Date.now()
  const attempts: Attempt[] = []
  const generationConfig = options.json ? { responseMimeType: 'application/json' } : undefined

  // Dos vueltas: si todos están saturados, a veces uno se libera a los pocos segundos
  for (let lap = 0; lap < 2; lap++) {
    if (lap > 0) await new Promise((resolve) => setTimeout(resolve, 1_500))

    for (const name of await modelChain(apiKey)) {
      const remaining = TOTAL_BUDGET_MS - (Date.now() - started)
      if (remaining < 3_000) break
      if (attempts.some((a) => a.model === name && (a.kind === 'not_found' || a.kind === 'quota'))) continue

      const attemptStart = Date.now()
      try {
        const model = genAI.getGenerativeModel({ model: name, generationConfig }, { timeout: Math.min(ATTEMPT_TIMEOUT_MS, remaining) })
        const result = await model.generateContent(prompt)
        let data: T
        try {
          data = parse(result.response.text())
        } catch {
          attempts.push({ model: name, status: null, kind: 'bad_output' })
          continue
        }
        // Funcionó, pero si tardó mucho se le da paso a otro en la siguiente petición
        if (Date.now() - attemptStart > SLOW_RESPONSE_MS) cooldowns.set(name, Date.now() + COOLDOWN_MS.slow)
        else cooldowns.delete(name)
        return { data, model: name }
      } catch (err) {
        const { status, kind } = classify(err)
        attempts.push({ model: name, status, kind })
        console.error(`Gemini ${name}: ${kind} (${status ?? 'sin estado'})`, err instanceof Error ? err.message : err)
        if (kind === 'bad_key') throw new AiError('bad_key', attempts)
        if (kind === 'overloaded' || kind === 'quota' || kind === 'not_found') cooldowns.set(name, Date.now() + COOLDOWN_MS[kind])
      }
    }
  }

  const kinds = attempts.map((a) => a.kind)
  throw new AiError(kinds.includes('overloaded') ? 'overloaded' : kinds.includes('quota') ? 'quota' : 'failed', attempts)
}

const JSON_FENCES = /```json|```/g

export function parseJson<T>(text: string): T {
  return JSON.parse(text.replace(JSON_FENCES, '').trim()) as T
}

const AI_MESSAGES: Record<AiErrorCode, string> = {
  no_key: 'La IA no está configurada en el servidor.',
  bad_key: 'La clave de Gemini del servidor no es válida o fue bloqueada.',
  overloaded: 'Los modelos de IA están saturados en este momento. Intenta de nuevo en unos minutos.',
  quota: 'Se agotó la cuota gratuita de IA por ahora. Intenta de nuevo más tarde.',
  failed: 'La IA no pudo responder. Intenta de nuevo.',
}

const AI_STATUS: Record<AiErrorCode, number> = { no_key: 500, bad_key: 500, overloaded: 503, quota: 429, failed: 502 }

// Respuesta de error de las rutas de IA: mensaje claro y qué pasó con cada modelo (sin datos privados)
export function aiErrorResponse(err: unknown, fallbackMessage: string) {
  if (err instanceof AiError) {
    return NextResponse.json({ error: AI_MESSAGES[err.code], code: err.code, attempts: err.attempts }, { status: AI_STATUS[err.code] })
  }
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}
