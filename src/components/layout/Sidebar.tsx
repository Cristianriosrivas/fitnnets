'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Dumbbell, TrendingUp, Utensils, Users, LogOut, User, Zap, PersonStanding, Trophy } from 'lucide-react'
import { createClient } from '@/core/supabase/client'
import { glow, gradientCss, gradients, colors } from '@/components/ui/theme'

const links = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/rutinas', label: 'Rutinas', icon: Dumbbell },
  { href: '/progreso', label: 'Progreso', icon: TrendingUp },
  { href: '/correr', label: 'Correr', icon: Zap },
  { href: '/cuerpo', label: 'Mi cuerpo', icon: PersonStanding },
  { href: '/nutricion', label: 'Nutrición', icon: Utensils },
  { href: '/social', label: 'Social', icon: Users },
  { href: '/logros', label: 'Logros', icon: Trophy },
  { href: '/perfil', label: 'Perfil', icon: User },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex flex-col w-56 h-screen sticky top-0 bg-[#0d1412] border-r border-[#1f2926] px-4 py-6">
      <div className="flex items-center gap-2.5 font-extrabold text-lg text-white px-2 mb-8" style={{ letterSpacing: 2 }}>
        <div className="p-1.5 rounded-lg" style={{ background: gradientCss(gradients.brand), ...glow(colors.primary, 10, 0.4) }}>
          <Dumbbell size={18} color="#04120a" />
        </div>
        FINNETS
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`press flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive ? 'text-[#052e14] font-bold' : 'text-[#9ca8a5] hover:bg-[#141b19] hover:text-white'
              }`}
              style={isActive ? { background: gradientCss(gradients.brand, 'horizontal') } : undefined}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#9ca8a5] hover:text-red-400 transition mt-1"
      >
        <LogOut size={18} />
        Salir
      </button>
    </aside>
  )
}
