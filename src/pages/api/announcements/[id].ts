import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  const supabase = createSupabaseServerClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const {
    title, subtitle, content, group_ids,
    pinned, important, scheduled_at,
    attachments, removedAttachmentIds,
  } = body;

  if (!title?.trim() || !content?.trim() || !Array.isArray(group_ids) || group_ids.length === 0) {
    return new Response(JSON.stringify({ error: 'Datos incompletos' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: ann, error } = await supabase
    .from('announcements')
    .update({
      title:        title.trim(),
      subtitle:     subtitle?.trim() || null,
      content:      content.trim(),
      group_ids,
      pinned:       pinned  ?? false,
      important:    important ?? false,
      scheduled_at: scheduled_at || null,
    })
    .eq('id', params.id!)
    .eq('teacher_id', user.id)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Eliminar adjuntos quitados (scope restringido al anuncio actual)
  if (Array.isArray(removedAttachmentIds) && removedAttachmentIds.length > 0) {
    await supabase
      .from('announcement_attachments')
      .delete()
      .eq('announcement_id', params.id!)
      .in('id', removedAttachmentIds);
  }

  // Insertar nuevos adjuntos
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

  // Devolver anuncio con adjuntos actualizados
  const { data: allAttachments } = await supabase
    .from('announcement_attachments')
    .select('*')
    .eq('announcement_id', ann.id)
    .order('created_at');

  return new Response(JSON.stringify({ ...ann, attachments: allAttachments ?? [] }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request, cookies, params }) => {
  const supabase = createSupabaseServerClient(request, cookies);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', params.id!)
    .eq('teacher_id', user.id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(null, { status: 204 });
};
