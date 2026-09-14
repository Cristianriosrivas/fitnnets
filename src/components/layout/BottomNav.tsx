'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Dumbbell, TrendingUp, Users, Utensils } from 'lucide-react'

const links = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/rutinas', label: 'Rutinas', icon: Dumbbell },
  { href: '/progreso', label: 'Progreso', icon: TrendingUp },
  { href: '/nutricion', label: 'Nutrición', icon: Utensils },
  { href: '/social', label: 'Social', icon: Users },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition ${
                isActive ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}