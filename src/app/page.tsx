import { redirect } from 'next/navigation'

// La entrada es la app: sin sesión, (main) manda al login
export default function Home() {
  redirect('/dashboard')
}
