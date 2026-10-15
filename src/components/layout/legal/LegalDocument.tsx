import Link from 'next/link'
import { LEGAL_INFO, POLICY_DATE, POLICY_VERSION, type LegalSection } from '@/core/legal/content'

type Props = {
  title: string
  intro?: string
  sections: LegalSection[]
  otherHref: string
  otherLabel: string
}

export default function LegalDocument({ title, intro, sections, otherHref, otherLabel }: Props) {
  const versionLabel = 'Versión ' + POLICY_VERSION + ' · Vigente desde el ' + POLICY_DATE
  const contactLabel = 'Contacto: ' + LEGAL_INFO.email

  return (
    <div className="min-h-screen bg-[#0a0f0d]">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/" className="text-xs text-green-500 hover:underline">
          Volver a Finnets
        </Link>

        <h1 className="text-2xl font-bold text-white mt-4">{title}</h1>
        <p className="text-xs text-[#6b7876] mt-1 mb-6">{versionLabel}</p>

        {intro && <p className="text-sm text-[#9ca8a5] leading-relaxed mb-8">{intro}</p>}

        <div className="space-y-7">
          {sections.map((section, index) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold text-white mb-2">
                {index + 1}. {section.title}
              </h2>
              {section.content.map((block, i) =>
                Array.isArray(block) ? (
                  <ul key={i} className="list-disc pl-5 space-y-1.5 mb-2">
                    {block.map((item, j) => (
                      <li key={j} className="text-sm text-[#9ca8a5] leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p key={i} className="text-sm text-[#9ca8a5] leading-relaxed mb-2">
                    {block}
                  </p>
                )
              )}
            </section>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-[#1f2926] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-[#6b7876]">{contactLabel}</p>
          <Link href={otherHref} className="text-xs text-green-500 hover:underline">
            {otherLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}