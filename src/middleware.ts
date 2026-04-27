import { defineMiddleware } from 'astro:middleware';
import { createSupabaseMiddlewareClient } from './lib/supabase';

// Solo las rutas /teacher/* requieren autenticación
const TEACHER_ROUTES = /^\/teacher(\/.*)?$/;

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, redirect, url } = context;

  if (!TEACHER_ROUTES.test(url.pathname)) return next();

  const response = new Response(null, { status: 200 });
  const supabase = createSupabaseMiddlewareClient(request, response);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const nextResponse = await next();

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      nextResponse.headers.append(key, value);
    }
  });

  return nextResponse;
});
