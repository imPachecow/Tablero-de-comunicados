import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient, parseCookieHeader, serializeCookieHeader, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Cliente del navegador (para React islands) — usa cookies para que el middleware vea la sesión
export const supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Cliente del servidor con manejo de cookies (para páginas Astro y middleware)
export function createSupabaseServerClient(
  request: Request,
  cookies: AstroCookies
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options as Parameters<typeof cookies.set>[2]);
        });
      },
    },
  });
}

// Cliente de servicio para operaciones admin (solo servidor)
export function createSupabaseAdminClient() {
  return createClient(
    supabaseUrl,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Helper para parsear Set-Cookie en middleware
export function createSupabaseMiddlewareClient(
  request: Request,
  response: Response
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.headers.append(
            'Set-Cookie',
            serializeCookieHeader(name, value, options ?? {})
          );
        });
      },
    },
  });
}
