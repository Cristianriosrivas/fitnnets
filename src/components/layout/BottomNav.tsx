'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Dumbbell, TrendingUp, Users, Utensils } from 'lucide-react'
import { colors, glow, gradientCss, gradients } from '@/components/ui/theme'

const links = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/rutinas', label: 'Rutinas', icon: Dumbbell },
  { href: '/progreso', label: 'Progreso', icon: TrendingUp },
  { href: '/nutricion', label: 'Nutrición', icon: Utensils },
  { href: '/social', label: 'Social', icon: Users },
]

// Barra flotante inferior, como la de la app móvil
export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed left-3 right-3 z-50 glass-card rounded-[26px]" style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
      <div className="flex justify-around items-center h-16 px-1.5">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} aria-label={label} className="press flex flex-col items-center justify-center gap-0.5 flex-1 h-full">
              <span
                className="flex items-center justify-center w-11 h-7 rounded-full"
                style={isActive ? { background: gradientCss(gradients.brand, 'horizontal'), ...glow(colors.primary, 10, 0.45) } : undefined}
              >
                <Icon size={19} strokeWidth={isActive ? 2.5 : 2} color={isActive ? '#04120a' : colors.muted} />
              </span>
              <span className="text-[10px] font-semibold" style={{ color: isActive ? colors.primary : colors.muted }}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
