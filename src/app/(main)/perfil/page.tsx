'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/core/supabase/client'
import { Save, Check } from 'lucide-react'

export default function PerfilPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [username, setUsername] = useState('')
  const [age, setAge] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [gender, setGender] = useState('')
  const [goal, setGoal] = useState('')
  const [activityLevel, setActivityLevel] = useState('')
  const [bodyType, setBodyType] = useState('')
  const [trainingPlace, setTrainingPlace] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUsername(profile.username || '')
        setAge(profile.age ? String(profile.age) : '')
        setWeightKg(profile.weight_kg ? String(profile.weight_kg) : '')
        setHeightCm(profile.height_cm ? String(profile.height_cm) : '')
        setGender(profile.gender || '')
        setGoal(profile.goal || '')
        setActivityLevel(profile.activity_level || '')
        setBodyType(profile.body_type || '')
        setTrainingPlace(profile.training_place || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username,
        age: age ? parseInt(age) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        gender,
        goal,
        activity_level: activityLevel,
        body_type: bodyType,
        training_place: trainingPlace,
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return <div className="p-8 text-center text-[#6b7876]">Cargando...</div>
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Editar perfil</h1>

      <div className="card-dark p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#9ca8a5] mb-1">Nombre de usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-dark w-full px-4 py-2.5 rounded-xl text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#9ca8a5] mb-1">Edad</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="input-dark w-full px-4 py-2.5 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#9ca8a5] mb-1">Genero</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="input-dark w-full px-4 py-2.5 rounded-xl text-sm"
            >
              <option value="">Selecciona</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#9ca8a5] mb-1">Peso (kg)</label>
            <input
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="input-dark w-full px-4 py-2.5 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#9ca8a5] mb-1">Altura (cm)</label>
            <input
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="input-dark w-full px-4 py-2.5 rounded-xl text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#9ca8a5] mb-1">Objetivo</label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="input-dark w-full px-4 py-2.5 rounded-xl text-sm"
          >
            <option value="">Selecciona</option>
            <option value="perder_grasa">Perder grasa</option>
            <option value="ganar_musculo">Ganar musculo</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="resistencia">Mejorar resistencia</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#9ca8a5] mb-1">Nivel de actividad</label>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
            className="input-dark w-full px-4 py-2.5 rounded-xl text-sm"
          >
            <option value="">Selecciona</option>
            <option value="sedentario">Sedentario</option>
            <option value="ligero">Ligero</option>
            <option value="moderado">Moderado</option>
            <option value="intenso">Intenso</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#9ca8a5] mb-1">Tipo de cuerpo (somatotipo)</label>
          <select
            value={bodyType}
            onChange={(e) => setBodyType(e.target.value)}
            className="input-dark w-full px-4 py-2.5 rounded-xl text-sm"
          >
            <option value="">Selecciona</option>
            <option value="ectomorfo">Ectomorfo</option>
            <option value="mesomorfo">Mesomorfo</option>
            <option value="endomorfo">Endomorfo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#9ca8a5] mb-1">Lugar de entrenamiento</label>
          <select
            value={trainingPlace}
            onChange={(e) => setTrainingPlace(e.target.value)}
            className="input-dark w-full px-4 py-2.5 rounded-xl text-sm"
          >
            <option value="">Selecciona</option>
            <option value="gym">Gimnasio</option>
            <option value="casa">En casa</option>
            <option value="calistenia">Calistenia</option>
          </select>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
            {error}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded-xl disabled:opacity-50"
        >
          {saving ? (
            'Guardando...'
          ) : saved ? (
            <>
              <Check size={16} /> Guardado
            </>
          ) : (
            <>
              <Save size={16} /> Guardar cambios
            </>
          )}
        </button>
      </div>
    </div>
  )
}