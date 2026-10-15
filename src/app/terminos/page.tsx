import LegalDocument from '@/components/legal/LegalDocument'
import { TERMS_INTRO, TERMS_SECTIONS } from '@/core/legal/content'

export const metadata = { title: 'Términos de uso · Finnets' }

export default function TerminosPage() {
  const title = 'Términos de uso'
  return (
    <LegalDocument
      title={title}
      intro={TERMS_INTRO}
      sections={TERMS_SECTIONS}
      otherHref="/privacidad"
      otherLabel="Ver la Política de privacidad"
    />
  )
}