// Almacenamiento del navegador con la misma forma que usa la app móvil.
// localStorage puede fallar en modo privado o con el almacenamiento lleno: nunca debe tumbar la app.
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return typeof window === 'undefined' ? null : window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Sin espacio o bloqueado: lo guardado aquí es solo una comodidad
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Igual que arriba
    }
  },
}

export default storage
