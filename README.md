# Tablero de Comunicados — IE La Gabriela

Plataforma educativa de comunicados para la Institución Educativa La Gabriela. Permite a los docentes publicar anuncios para sus grupos y a los estudiantes consultarlos sin necesidad de crear una cuenta.

---

## Características

### Vista estudiante (pública)
- Selección de grupo con persistencia en `localStorage`
- Feed de comunicados con filtros: Todos / Importantes / Recientes
- Indicador de comunicados nuevos desde la última visita
- Anuncios destacados e importantes con badges visuales
- Descarga de archivos adjuntos

### Vista docente (autenticada)
- Inicio de sesión seguro vía Supabase Auth
- Panel con estadísticas de grupos y anuncios
- Editor de comunicados con formato enriquecido (negrita, cursiva, subrayado, listas, títulos)
- Vista previa antes de publicar
- Programación de publicaciones en fecha futura
- Marcar anuncios como fijados o importantes
- Adjuntar archivos (PDF, imágenes, documentos)
- Publicar para uno o varios grupos simultáneamente
- Editar y eliminar anuncios existentes
- Gestión de grupos (crear, editar, eliminar)

---

## Tecnologías

| Capa       | Tecnología                          |
|------------|-------------------------------------|
| Framework  | [Astro 4](https://astro.build) + SSR |
| UI         | [React 18](https://react.dev) (islands) |
| Estilos    | [Tailwind CSS 3](https://tailwindcss.com) |
| Base datos | [Supabase](https://supabase.com) (PostgreSQL + Storage) |
| Auth       | Supabase Auth |
| Deploy     | [Vercel](https://vercel.com) |

---

## Requisitos previos

- Node.js 18 o superior
- Una cuenta en [Supabase](https://supabase.com) con un proyecto activo
- Una cuenta en [Vercel](https://vercel.com) (solo para despliegue)

---

## Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/la-gabriela.git
cd la-gabriela

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores de tu proyecto Supabase

# 4. Configurar la base de datos
# Ejecutar supabase/schema.sql en el SQL Editor de Supabase

# 5. Iniciar el servidor de desarrollo
npm run dev
```

---

## Variables de entorno

| Variable                  | Descripción                                        |
|---------------------------|----------------------------------------------------|
| `PUBLIC_SUPABASE_URL`     | URL del proyecto Supabase (Project Settings → API) |
| `PUBLIC_SUPABASE_ANON_KEY`| Clave anónima pública (Project Settings → API)     |
| `SUPABASE_SERVICE_ROLE_KEY`| Clave de servicio — solo para scripts de admin   |

> **Importante:** `SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse al navegador. Solo se usa en `scripts/`.

---

## Configuración de la base de datos

### Esquema inicial

Ejecutar en el **SQL Editor de Supabase** en este orden:

1. `supabase/schema.sql` — Crea las tablas, políticas RLS y triggers
2. *(Si migras desde una versión anterior)* `supabase/migrate-v2.sql`
3. *(Si migras desde v2)* `supabase/migrate-v3.sql`

### Bucket de almacenamiento

El script `schema.sql` crea el bucket `attachments` automáticamente. Si no existe, crearlo manualmente en **Storage → New bucket** con nombre `attachments` y acceso **público**.

### Crear usuario docente

```bash
# Crear usuario de prueba (requiere SUPABASE_SERVICE_ROLE_KEY en .env)
node scripts/seed-user.mjs
# Credenciales creadas: docente@prueba.com / docente123
```

---

## Scripts disponibles

| Comando         | Descripción                          |
|-----------------|--------------------------------------|
| `npm run dev`   | Servidor de desarrollo (puerto 4321) |
| `npm run build` | Compilar para producción             |
| `npm run preview`| Vista previa del build              |

---

## Estructura del proyecto

```
src/
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx          # Formulario de inicio de sesión
│   ├── teacher/
│   │   ├── AnnouncementEditor.tsx # Editor de comunicados (rich text)
│   │   ├── AnnouncementsPanel.tsx # Panel con lista + editor integrado
│   │   └── GroupManager.tsx       # CRUD de grupos
│   └── AnnouncementFeed.tsx       # Feed de comunicados (vista alumno)
├── layouts/
│   └── BaseLayout.astro           # Layout base con nav condicional
├── lib/
│   ├── auth.ts                    # Helpers de autenticación y formato
│   ├── supabase.ts                # Clientes Supabase (browser/server)
│   └── types.ts                   # Interfaces TypeScript
├── pages/
│   ├── api/
│   │   ├── announcements/         # GET/POST, PUT/DELETE por ID
│   │   ├── groups/                # GET/POST, PUT/DELETE por ID
│   │   └── auth/logout.ts         # Cierre de sesión
│   ├── grupo/[id].astro           # Feed público de un grupo
│   ├── teacher/
│   │   ├── dashboard.astro        # Panel principal del docente
│   │   ├── anuncios.astro         # Gestión de anuncios
│   │   └── grupos.astro           # Gestión de grupos
│   ├── index.astro                # Landing + selector de grupos
│   └── login.astro                # Inicio de sesión docente
├── middleware.ts                  # Protección de rutas /teacher/*
└── styles/
    └── global.css                 # Estilos globales y utilidades
supabase/
├── schema.sql                     # Esquema completo de la BD
├── migrate-v2.sql                 # Migración desde versión 1
└── migrate-v3.sql                 # Migración desde versión 2
scripts/
└── seed-user.mjs                  # Crea usuario docente de prueba
```

---

## Despliegue en Vercel

### Opción A — Desde la CLI de Vercel

```bash
npm install -g vercel
vercel
```

### Opción B — Desde el dashboard de Vercel

1. Hacer push del proyecto a GitHub
2. Ir a [vercel.com/new](https://vercel.com/new)
3. Importar el repositorio
4. En **Environment Variables**, agregar:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Hacer clic en **Deploy**

> El proyecto usa el adaptador `@astrojs/vercel` y está configurado para SSR con funciones serverless.

---

## Seguridad

- Las rutas `/teacher/*` están protegidas por middleware de Astro que verifica la sesión de Supabase
- Las políticas RLS de Supabase garantizan que:
  - Los estudiantes solo pueden **leer** grupos, anuncios y archivos
  - Los docentes solo pueden **modificar** sus propios grupos y anuncios
  - Ningún cliente puede saltarse estas restricciones, incluso con la clave anónima

---

## Licencia

Copyright © 2026 **Alejandro Pacheco Sepúlveda** — [Prydox Company](https://github.com/imPachecow)

Este software es de uso exclusivo para la Institución Educativa La Gabriela. Queda prohibida su copia, distribución o uso comercial sin autorización expresa del autor.

Ver el archivo [`LICENSE`](./LICENSE) para más detalles.
