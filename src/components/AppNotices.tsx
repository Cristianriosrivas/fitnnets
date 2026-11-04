'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { AppNotice, checkAssignedRoutines, checkNewBadges } from '@/core/appChecks'

// Avisos dentro de la web: rutinas que te asignó un amigo e insignias nuevas.
// Se revisan al entrar y cada vez que vuelves a la pestaña.
export default function AppNotices() {
  const [notices, setNotices] = useState<AppNotice[]>([])

  const check = useCallback(async () => {
    const [routines, badges] = await Promise.all([checkAssignedRoutines().catch(() => []), checkNewBadges()])
    const fresh = [...routines, ...badges]
    if (fresh.length) setNotices((current) => [...current, ...fresh.filter((n) => !current.some((c) => c.id === n.id))])
  }, [])

  useEffect(() => {
    const first = setTimeout(check, 1500)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(first)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [check])

  if (notices.length === 0) return null

  const dismiss = (id: string) => setNotices((current) => current.filter((n) => n.id !== id))

  return (
    <div className="fixed z-[70] top-4 right-4 left-4 md:left-auto md:w-80 space-y-2">
      {notices.map((notice) => (
        <div key={notice.id} className="fade-in glass-card rounded-2xl p-3.5 flex items-start gap-2">
          <Link href={notice.href} onClick={() => dismiss(notice.id)} className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold">{notice.title}</p>
            <p className="text-[#9ca8a5] text-xs mt-0.5">{notice.body}</p>
          </Link>
          <button type="button" onClick={() => dismiss(notice.id)} aria-label="Cerrar aviso" className="text-[#6b7876] hover:text-white p-1">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
