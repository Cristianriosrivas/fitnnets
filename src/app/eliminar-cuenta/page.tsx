import Link from 'next/link'
import { LEGAL_INFO } from '@/core/legal/content'

export const metadata = { title: 'Eliminar tu cuenta · Finnets' }

// Página pública: Google Play exige un enlace web para pedir el borrado de la cuenta
export default function EliminarCuentaPage() {
  const mailto = `mailto:${LEGAL_INFO.email}?subject=${encodeURIComponent('Eliminar mi cuenta de Finnets')}`

  return (
    <div className="min-h-screen bg-[#0a0f0d]">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/" className="text-xs text-green-500 hover:underline">Volver a Finnets</Link>

        <h1 className="text-2xl font-bold text-white mt-4 mb-6">Eliminar tu cuenta de Finnets</h1>

        <section className="mb-7">
          <h2 className="text-base font-semibold text-white mb-2">Desde la app o la web</h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-[#9ca8a5] leading-relaxed">
            <li>Inicia sesión en Finnets.</li>
            <li>Entra a Perfil y luego a Privacidad y cuenta.</li>
            <li>En "Eliminar mi cuenta", escribe ELIMINAR y confirma.</li>
          </ol>
          <Link href="/perfil/privacidad" className="btn-primary inline-block rounded-xl px-5 py-2.5 text-sm mt-4">
            Ir a Privacidad y cuenta
          </Link>
        </section>

        <section className="mb-7">
          <h2 className="text-base font-semibold text-white mb-2">Si no puedes entrar</h2>
          <p className="text-sm text-[#9ca8a5] leading-relaxed">
            {'Escríbenos desde el correo de tu cuenta a '}
            <a href={mailto} className="text-green-500 hover:underline">{LEGAL_INFO.email}</a>
            {' y borraremos tu cuenta.'}
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white mb-2">Qué se borra</h2>
          <p className="text-sm text-[#9ca8a5] leading-relaxed">
            Se borran de inmediato tu perfil, tus datos de salud, rutinas, entrenamientos, carreras, pasos, planes de comida, amistades y los retos que creaste. Las rutinas que creaste para tus amigos se quedan en su cuenta, sin tu nombre.
          </p>
        </section>
      </div>
    </div>
  )
}
