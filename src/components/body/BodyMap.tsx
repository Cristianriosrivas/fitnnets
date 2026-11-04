'use client'

import { useId } from 'react'
import storage from '@/core/storage'
import { heatColor, Region } from '@/core/muscles'
import maleBody from './bodyPaths.json'
import femaleBody from './bodyPathsFemale.json'

export type BodyVariant = 'male' | 'female'
export type BodySide = 'front' | 'back'

type BodyPaths = {
  viewBox: string
  head: { cx: number; cy: number; rx: number; ry: number }
  hair?: string
  neck: string
  silhouetteHalf: string[]
  front: Record<string, string>
  back: Record<string, string>
  frontLines: string[]
  backLines: string[]
}

const BODIES: Record<BodyVariant, BodyPaths> = { male: maleBody as BodyPaths, female: femaleBody as BodyPaths }

export const variantForGender = (gender: string | null | undefined): BodyVariant => (gender === 'femenino' ? 'female' : 'male')

// Modelo elegido a mano en "Tu cuerpo" (se guarda en este navegador); si no hay, el del género del perfil
export const BODY_VARIANT_KEY = 'finnets.bodyVariant'

export async function preferredVariant(gender: string | null | undefined): Promise<BodyVariant> {
  const saved = await storage.getItem(BODY_VARIANT_KEY)
  if (saved === 'male' || saved === 'female') return saved
  return variantForGender(gender)
}

// Las rutas describen la mitad izquierda; la derecha es su reflejo sobre x = 100
const MIRROR = 'translate(200, 0) scale(-1, 1)'

type Props = {
  variant: BodyVariant
  side: BodySide
  values: Partial<Record<Region, number>>
  width: number
  colorFor?: (region: Region, value: number) => string
  selected?: Region | null
  onSelect?: (region: Region) => void
  // Las zonas más calientes laten
  pulse?: boolean
}

// Cuerpo anatómico vectorial con mapa de calor, sombreado de volumen y músculos seleccionables
export default function BodyMap({ variant, side, values, width, colorFor, selected, onSelect, pulse = true }: Props) {
  const body = BODIES[variant]
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')

  const muscles = Object.entries(body[side]) as [Region, string][]
  const lines = side === 'front' ? body.frontLines : body.backLines
  const hot = muscles.filter(([region]) => (values[region] ?? 0) >= 0.75)
  const silhouette = body.silhouetteHalf.map((d, i) => <path key={i} d={d} />)
  const headAndNeck = (
    <>
      <ellipse cx={body.head.cx} cy={body.head.cy} rx={body.head.rx} ry={body.head.ry} />
      <path d={body.neck} />
    </>
  )

  return (
    <svg width={width} height={width * 2.2} viewBox={body.viewBox}>
      <defs>
        <linearGradient id={`shade${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.14} />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="1" stopColor="#000000" stopOpacity={0.38} />
        </linearGradient>
        <clipPath id={`clip${uid}`}>
          {silhouette}
          <g transform={MIRROR}>{silhouette}</g>
          {headAndNeck}
        </clipPath>
      </defs>

      {body.hair ? <path d={body.hair} fill="#26302d" /> : null}
      <g fill="#1c2523">
        {silhouette}
        <g transform={MIRROR}>{silhouette}</g>
        {headAndNeck}
      </g>

      {muscles.map(([region, d]) => {
        const value = values[region] ?? 0
        const fill = colorFor ? colorFor(region, value) : heatColor(value)
        const isSelected = selected === region
        const common = {
          d,
          fill,
          stroke: isSelected ? '#ffffff' : '#0a0f0d',
          strokeWidth: isSelected ? 2 : 1.2,
          onClick: onSelect ? () => onSelect(region) : undefined,
          style: onSelect ? { cursor: 'pointer' } : undefined,
        }
        return (
          <g key={region}>
            <path {...common} />
            <path {...common} transform={MIRROR} />
          </g>
        )
      })}

      {pulse && hot.length ? (
        <g className="pulse-soft" pointerEvents="none">
          {hot.map(([region, d]) => (
            <g key={region}>
              <path d={d} fill="#ffffff" />
              <path d={d} fill="#ffffff" transform={MIRROR} />
            </g>
          ))}
        </g>
      ) : null}

      {lines.map((d, i) => (
        <path key={i} d={d} stroke="#0a0f0d" strokeWidth={1} fill="none" opacity={0.7} pointerEvents="none" />
      ))}

      <rect x="0" y="0" width="200" height="440" fill={`url(#shade${uid})`} clipPath={`url(#clip${uid})`} pointerEvents="none" />
    </svg>
  )
}
