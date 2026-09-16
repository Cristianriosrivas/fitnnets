'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Dumbbell, TrendingUp, Utensils, Users, LogOut } from 'lucide-react'
import { createClient } from '@/core/supabase/client'

const links = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/rutinas', label: 'Rutinas', icon: Dumbbell },
  { href: '/progreso', label: 'Progreso', icon: TrendingUp },
  { href: '/nutricion', label: 'Nutrición', icon: Utensils },
  { href: '/social', label: 'Social', icon: Users },
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
      <div className="flex items-center gap-2 font-bold text-lg text-white px-2 mb-8">
        <div className="bg-green-500/15 text-green-500 p-1.5 rounded-lg">
          <Dumbbell size={18} />
        </div>
        Finnets
      </div>

      <nav className="flex-1 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-green-500 text-[#052e14]'
                  : 'text-[#9ca8a5] hover:bg-[#141b19] hover:text-white'
              }`}
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