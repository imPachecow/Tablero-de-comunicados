import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  const groupId = url.searchParams.get('groupId');
  const supabase = createSupabaseServerClient(request, cookies);
  const now = new Date().toISOString();

  let query = supabase
    .from('announcements')
    .select('*, attachments:announcement_attachments(*)')
    // Solo anuncios ya publicados (para vista pública)
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .order('pinned',    { ascending: false })
    .order('important', { ascending: false })
    .order('created_at', { ascending: false });

  if (groupId) {
    query = query.contains('group_ids', [groupId]);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { title, subtitle, content, group_ids, pinned, important, scheduled_at, attachments } = body;

  if (!title?.trim()) {
    return new Response(JSON.stringify({ error: 'El título es obligatorio' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!content?.trim()) {
    return new Response(JSON.stringify({ error: 'El contenido es obligatorio' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!Array.isArray(group_ids) || group_ids.length === 0) {
    return new Response(JSON.stringify({ error: 'Selecciona al menos un grupo' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: ann, error: annError } = await supabase
    .from('announcements')
    .insert({
      title:        title.trim(),
      subtitle:     subtitle?.trim() || null,
      content:      content.trim(),
      group_ids,
      teacher_id:   user.id,
      pinned:       pinned    ?? false,
      important:    important ?? false,
      scheduled_at: scheduled_at || null,
    })
    .select()
    .single();

  if (annError) {
    return new Response(JSON.stringify({ error: annError.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (Array.isArray(attachments) && attachments.length > 0) {
    await supabase
      .from('announcement_attachments')
      .insert(attachments.map((a: {
        file_name: string; file_path: string;
        file_size?: number; file_type?: string;
      }) => ({
        announcement_id: ann.id,
        file_name: a.file_name,
        file_path: a.file_path,
        file_size: a.file_size ?? null,
        file_type: a.file_type ?? null,
      })));
  }

  // Devolver con adjuntos
  const { data: allAttachments } = await supabase
    .from('announcement_attachments')
    .select('*')
    .eq('announcement_id', ann.id);

  return new Response(JSON.stringify({ ...ann, attachments: allAttachments ?? [] }), {
    status: 201, headers: { 'Content-Type': 'application/json' },
  });
};
