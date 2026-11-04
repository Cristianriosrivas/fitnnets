import { createClient } from './client'

type Client = ReturnType<typeof createClient>

// Cliente único para la lógica de src/core: se crea al primer uso, nunca al importar el módulo,
// para que el prerender en el servidor no lo necesite.
let client: Client | null = null

export const supabase = new Proxy({} as Client, {
  get(_target, prop) {
    client ??= createClient()
    const value = Reflect.get(client, prop)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
