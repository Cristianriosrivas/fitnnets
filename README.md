# Finnets web

Web de Finnets (Next.js 16, Tailwind 4, Supabase). Comparte base de datos y lógica con la app móvil (`finnets-mobile`).

## Correr en local

Crea `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `GEMINI_API_KEY`, y luego:

```powershell
npm install
npm run dev
```

## Cómo está organizado

- `src/core/`: lógica sin interfaz. `training`, `gym`, `muscles`, `recovery`, `running`, `achievements` y `wrapped` son los mismos archivos de la app móvil; si cambias uno, cambia también el otro. Solo difieren las importaciones: `core/storage.ts` reemplaza a AsyncStorage y `core/supabase/browser.ts` da el cliente único.
- `src/components/ui/`: sistema de diseño animado (aurora, tarjetas 3D, anillos, confeti). Solo CSS y SVG, sin librerías nuevas.
- `src/components/body/`: mapa muscular 3D (modelos de hombre y mujer).
- `src/components/run/`: ruta de la carrera y pestaña Cardio.

## Diferencias con la app móvil

- **Pasos**: el navegador no tiene podómetro. La web muestra los pasos que guardó la app; al correr no cuenta pasos ni cadencia.
- **Correr**: usa el GPS del navegador y mantiene la pantalla encendida. Si bloqueas el teléfono o cambias de app, el navegador deja de recibir el GPS. La ruta se guarda solo en ese navegador; a la base de datos van totales.
- **Recordatorios**: no existen en la web, porque programar avisos con la página cerrada exige notificaciones push.
- **Avisos**: las insignias nuevas y las rutinas asignadas se muestran dentro de la página al entrar o volver a la pestaña.

## Páginas públicas

`/privacidad`, `/terminos` y `/eliminar-cuenta` (el enlace web de borrado de cuenta que exige Google Play) no piden sesión.
