'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const TOTAL_STEPS = 6
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    age: '',
    weight_kg: '',
    height_cm: '',
    gender: '',
    goal: '',
    activity_level: '',
    body_type: '',
    training_place: '',
    chest_cm: '',
    waist_cm: '',
    hip_cm: '',
    glute_cm: '',
    bicep_cm: '',
    thigh_cm: '',
  })

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('No se encontró tu sesión. Inicia sesión de nuevo.')
      setLoading(false)
      return
    }

    // upsert: crea la fila si no existe, o la actualiza si ya existe
    const { error: updateError } = await supabase
  .from('profiles')
  .update({
    age: parseInt(formData.age),
    weight_kg: parseFloat(formData.weight_kg),
    height_cm: parseFloat(formData.height_cm),
    gender: formData.gender,
    goal: formData.goal,
    activity_level: formData.activity_level,
    body_type: formData.body_type,
    training_place: formData.training_place,
  })
  .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    const hasMeasurements =
      formData.chest_cm || formData.waist_cm || formData.hip_cm ||
      formData.glute_cm || formData.bicep_cm || formData.thigh_cm

    if (hasMeasurements) {
      await supabase.from('body_metrics').insert({
        user_id: user.id,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        chest_cm: formData.chest_cm ? parseFloat(formData.chest_cm) : null,
        waist_cm: formData.waist_cm ? parseFloat(formData.waist_cm) : null,
        hip_cm: formData.hip_cm ? parseFloat(formData.hip_cm) : null,
        glute_cm: formData.glute_cm ? parseFloat(formData.glute_cm) : null,
        bicep_cm: formData.bicep_cm ? parseFloat(formData.bicep_cm) : null,
        thigh_cm: formData.thigh_cm ? parseFloat(formData.thigh_cm) : null,
      })
    }

    router.push('/dashboard')
    router.refresh()
  }

  const canGoNext = () => {
    if (step === 1) return formData.age && formData.gender
    if (step === 2) return formData.weight_kg && formData.height_cm
    if (step === 3) return formData.goal && formData.activity_level
    if (step === 4) return formData.body_type
    if (step === 5) return formData.training_place
    if (step === 6) return true
    return false
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-md">
        <div className="flex gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition ${
                s <= step ? 'bg-green-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <p className="text-xs text-gray-400 mb-1">Paso {step} de {TOTAL_STEPS}</p>

        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Cuéntanos sobre ti
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Edad
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => updateField('age', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="ej: 25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Género
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['masculino', 'femenino', 'otro'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => updateField('gender', g)}
                      className={`py-2 rounded-lg border text-sm capitalize transition ${
                        formData.gender === g
                          ? 'bg-green-600 text-white border-green-600'
                          : 'border-gray-300 text-gray-600'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Tus medidas actuales
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight_kg}
                  onChange={(e) => updateField('weight_kg', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="ej: 70"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Altura (cm)
                </label>
                <input
                  type="number"
                  value={formData.height_cm}
                  onChange={(e) => updateField('height_cm', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="ej: 175"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ¿Cuál es tu objetivo?
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta principal
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'perder_grasa', label: '🔥 Perder grasa' },
                    { value: 'ganar_musculo', label: '💪 Ganar músculo' },
                    { value: 'mantenimiento', label: '⚖️ Mantenimiento' },
                    { value: 'resistencia', label: '🏃 Mejorar resistencia' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField('goal', opt.value)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition ${
                        formData.goal === opt.value
                          ? 'bg-green-600 text-white border-green-600'
                          : 'border-gray-300 text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel de actividad actual
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'sedentario', label: 'Sedentario' },
                    { value: 'ligero', label: 'Ligero' },
                    { value: 'moderado', label: 'Moderado' },
                    { value: 'intenso', label: 'Intenso' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField('activity_level', opt.value)}
                      className={`py-2 rounded-lg border text-sm transition ${
                        formData.activity_level === opt.value
                          ? 'bg-green-600 text-white border-green-600'
                          : 'border-gray-300 text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              ¿Cuál es tu tipo de cuerpo?
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Esto se llama <strong>somatotipo</strong>. Conocerlo ayuda a nuestra IA a
              diseñar una rutina y un plan de alimentación más precisos para tu genética,
              ya que cada tipo de cuerpo responde diferente al entrenamiento y a la dieta.
              Elige el que más se parezca a ti (no tiene que ser exacto).
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => updateField('body_type', 'ectomorfo')}
                className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                  formData.body_type === 'ectomorfo'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                <p className="font-semibold text-sm">🧍 Ectomorfo</p>
                <p className={`text-xs mt-0.5 ${formData.body_type === 'ectomorfo' ? 'text-green-50' : 'text-gray-400'}`}>
                  Delgado, extremidades largas, le cuesta subir de peso o ganar músculo.
                </p>
              </button>

              <button
                type="button"
                onClick={() => updateField('body_type', 'mesomorfo')}
                className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                  formData.body_type === 'mesomorfo'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                <p className="font-semibold text-sm">💪 Mesomorfo</p>
                <p className={`text-xs mt-0.5 ${formData.body_type === 'mesomorfo' ? 'text-green-50' : 'text-gray-400'}`}>
                  Complexión atlética, gana músculo con relativa facilidad.
                </p>
              </button>

              <button
                type="button"
                onClick={() => updateField('body_type', 'endomorfo')}
                className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                  formData.body_type === 'endomorfo'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                <p className="font-semibold text-sm">🔵 Endomorfo</p>
                <p className={`text-xs mt-0.5 ${formData.body_type === 'endomorfo' ? 'text-green-50' : 'text-gray-400'}`}>
                  Complexión más robusta, tiende a acumular grasa con más facilidad.
                </p>
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ¿Dónde vas a entrenar?
            </h2>
            <div className="space-y-2">
              {[
                { value: 'gym', label: '🏋️ Gimnasio (con máquinas y pesas)' },
                { value: 'casa', label: '🏠 En casa (con o sin equipo básico)' },
                { value: 'calistenia', label: '🤸 Calistenia (peso corporal)' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('training_place', opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${
                    formData.training_place === opt.value
                      ? 'bg-green-600 text-white border-green-600'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Medidas detalladas
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Este paso es <strong>totalmente opcional</strong>. Si nos das estas medidas
              en centímetros, podremos hacer un seguimiento mucho más preciso de tu
              progreso corporal. Puedes dejar en blanco lo que no sepas o no quieras
              compartir ahora y agregarlo después desde tu perfil.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Pecho (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.chest_cm}
                  onChange={(e) => updateField('chest_cm', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cintura (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.waist_cm}
                  onChange={(e) => updateField('waist_cm', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cadera (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.hip_cm}
                  onChange={(e) => updateField('hip_cm', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Glúteos (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.glute_cm}
                  onChange={(e) => updateField('glute_cm', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Bíceps (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.bicep_cm}
                  onChange={(e) => updateField('bicep_cm', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Muslo (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.thigh_cm}
                  onChange={(e) => updateField('thigh_cm', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="Opcional"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm bg-red-50 p-2 rounded-lg mt-4">{error}</p>
        )}

        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium"
            >
              Atrás
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              disabled={!canGoNext()}
              onClick={() => setStep(step + 1)}
              className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-40"
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-40"
            >
              {loading ? 'Guardando...' : 'Finalizar 🎉'}
            </button>
          )}
        </div>

        {step === TOTAL_STEPS && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full text-center text-xs text-gray-400 mt-3 hover:underline"
          >
            Saltar medidas y finalizar
          </button>
        )}
      </div>
    </div>
  )
}