import type { User } from '@supabase/supabase-js'
import { POLICY_VERSION } from './content'

export type ConsentFields = {
  consent_version: string
  terms_accepted_at: string
  health_data_consent_at: string
}

// Mismos nombres que las columnas de profiles: se mandan como metadatos en signUp y se copian
// al perfil (el trigger handle_new_user solo copia el username)
export function buildConsent(): ConsentFields {
  const now = new Date().toISOString()
  return { consent_version: POLICY_VERSION, terms_accepted_at: now, health_data_consent_at: now }
}

// Consentimiento vigente que el usuario dio al registrarse y que aún no llegó a profiles
// (pasa cuando el registro exige confirmar el correo y no hubo sesión para guardarlo)
export function consentFromMetadata(user: User): ConsentFields | null {
  const meta = user.user_metadata || {}
  if (meta.consent_version !== POLICY_VERSION || !meta.terms_accepted_at || !meta.health_data_consent_at) {
    return null
  }
  return {
    consent_version: meta.consent_version,
    terms_accepted_at: meta.terms_accepted_at,
    health_data_consent_at: meta.health_data_consent_at,
  }
}
