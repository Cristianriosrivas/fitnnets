import LegalDocument from '@/components/legal/LegalDocument'
import { PRIVACY_INTRO, PRIVACY_SECTIONS } from '@/core/legal/content'

export const metadata = { title: 'Política de privacidad · Finnets' }

export default function PrivacidadPage() {
  const title = 'Política de privacidad y tratamiento de datos personales'
  return (
    <LegalDocument
      title={title}
      intro={PRIVACY_INTRO}
      sections={PRIVACY_SECTIONS}
      otherHref="/terminos"
      otherLabel="Ver los Términos de uso"
    />
  )
}