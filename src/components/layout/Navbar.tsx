'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Dumbbell, LogOut } from 'lucide-react'
import { createClient } from '@/core/supabase/client'

const links = [
  { href: '/dashboard', label: 'Inicio' },
  { href: '/rutinas', label: 'Rutinas' },
  { href: '/progreso', label: 'Progreso' },
  { href: '/nutricion', label: 'Nutrición' },
  { href: '/social', label: 'Social' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="hidden md:flex items-center justify-between px-8 h-16 bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center gap-2 font-bold text-lg text-gray-900">
        <Dumbbell className="text-green-600" size={22} />
        Finnets
      </div>

      <div className="flex gap-6">
        {links.map(({ href, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition ${
                isActive ? 'text-green-600' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition"
      >
        <LogOut size={18} />
        Salir
      </button>
    </nav>
  )
}