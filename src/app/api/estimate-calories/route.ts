import { aiErrorResponse, generateWithFallback } from '@/core/ai/gemini'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { description } = await request.json()

  if (!description || !description.trim()) {
    return NextResponse.json({ error: 'Descripción vacía' }, { status: 400 })
  }

  const prompt = `
Eres un nutricionista experto. Estima las calorías aproximadas de esta comida:
"${description}"

Responde ÚNICAMENTE con un número entero (las calorías totales aproximadas),
sin texto adicional, sin unidades, sin explicación. Solo el número.
Ejemplo de respuesta válida: 450
`.trim()

  try {
    // Extraer solo el número, por si la IA agrega algo de texto
    const { data: calories, model, attempts } = await generateWithFallback(prompt, (text) => {
      const match = text.match(/\d+/)
      if (!match) throw new Error('Respuesta sin número')
      return parseInt(match[0])
    })

    return NextResponse.json({ calories, model, attempts })
  } catch (err) {
    console.error('Error estimando calorías:', err)
    return aiErrorResponse(err, 'No se pudo estimar')
  }
}