import { useState, useRef, useEffect } from 'react';
import { supabaseClient } from '../../lib/supabase';
import type { Announcement, AnnouncementAttachment, AttachmentInput } from '../../lib/types';

interface Group { id: string; name: string; }

interface Props {
  groups: Group[];
  editingAnnouncement?: (Announcement & { attachments: AnnouncementAttachment[] }) | null;
  onSaved: (ann: Announcement & { attachments: AnnouncementAttachment[] }) => void;
  onCancel?: () => void;
}

export default function AnnouncementEditor({ groups, editingAnnouncement, onSaved, onCancel }: Props) {
  const isEditing = !!editingAnnouncement;

  const [title, setTitle]           = useState('');
  const [subtitle, setSubtitle]     = useState('');
  const [selectedGroups, setSelected] = useState<string[]>([]);
  const [pinned, setPinned]         = useState(false);
  const [important, setImportant]   = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [files, setFiles]           = useState<File[]>([]);
  const [existingAtts, setExistingAtts] = useState<AnnouncementAttachment[]>([]);
  const [removedAttIds, setRemovedAttIds] = useState<string[]>([]);
  const [preview, setPreview]       = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  // Poblar campos al editar
  useEffect(() => {
    if (editingAnnouncement) {
      setTitle(editingAnnouncement.title);
      setSubtitle(editingAnnouncement.subtitle ?? '');
      setSelected(editingAnnouncement.group_ids);
      setPinned(editingAnnouncement.pinned);
      setImportant(editingAnnouncement.important);
      setScheduledAt(
        editingAnnouncement.scheduled_at
          ? editingAnnouncement.scheduled_at.slice(0, 16)
          : ''
      );
      setExistingAtts(editingAnnouncement.attachments ?? []);
      setRemovedAttIds([]);
      setFiles([]);
      setError('');
      setPreview(false);
      if (editorRef.current) {
        editorRef.current.innerHTML = editingAnnouncement.content;
      }
    } else {
      resetForm();
    }
  }, [editingAnnouncement]);

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setSelected([]);
    setPinned(false);
    setImportant(false);
    setScheduledAt('');
    setFiles([]);
    setExistingAtts([]);
    setRemovedAttIds([]);
    setError('');
    setPreview(false);
    if (editorRef.current) editorRef.current.innerHTML = '';
  };

  const applyFormat = (cmd: string) => {
    document.execCommand(cmd, false);
    editorRef.current?.focus();
  };

  const applyBlock = (tag: string) => {
    document.execCommand('formatBlock', false, tag);
    editorRef.current?.focus();
  };

  const toggleGroup = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      e.target.value = '';
    }
  };

  const removeNewFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const removeExistingAtt = (id: string) => {
    setExistingAtts(prev => prev.filter(a => a.id !== id));
    setRemovedAttIds(prev => [...prev, id]);
  };

  const handlePreview = () => {
    setPreviewHtml(editorRef.current?.innerHTML ?? '');
    setPreview(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = editorRef.current?.innerHTML?.trim() ?? '';

    if (!title.trim())                 { setError('El título es obligatorio.');          return; }
    if (!content || content === '<br>') { setError('El contenido es obligatorio.');        return; }
    if (selectedGroups.length === 0)    { setError('Selecciona al menos un grupo.');        return; }

    setLoading(true);
    setError('');

    try {
      // Subir nuevos archivos
      const newAttachments: AttachmentInput[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${Date.now()}_${safeName}`;
        const { error: uploadErr } = await supabaseClient.storage
          .from('attachments')
          .upload(path, file);
        if (uploadErr) throw new Error(`Error subiendo "${file.name}": ${uploadErr.message}`);
        newAttachments.push({
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
        });
      }

      const payload = {
        title:        title.trim(),
        subtitle:     subtitle.trim() || null,
        content,
        group_ids:    selectedGroups,
        pinned,
        important,
        scheduled_at: scheduledAt || null,
        attachments:  newAttachments,
        ...(isEditing && { removedAttachmentIds: removedAttIds }),
      };

      const url    = isEditing ? `/api/announcements/${editingAnnouncement!.id}` : '/api/announcements';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar el anuncio.');
      }

      const saved = await res.json();
      setSuccess(isEditing ? 'Anuncio actualizado.' : '¡Anuncio publicado!');
      onSaved(saved);
      if (!isEditing) resetForm();
      setTimeout(() => setSuccess(''), 2500);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  // ── MODO PREVIEW ──────────────────────────────────────────
  if (preview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Vista previa</span>
          <button
            onClick={() => setPreview(false)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Seguir editando
          </button>
        </div>

        <div className="border border-dashed border-gray-300 rounded-xl p-5 bg-gray-50/50">
          {(pinned || important) && (
            <div className="flex gap-2 mb-3">
              {pinned    && <span className="text-xs text-primary-600 font-semibold uppercase tracking-wide">Fijado</span>}
              {important && <span className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Importante</span>}
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{title || '(sin título)'}</h2>
          {subtitle && <p className="text-sm text-gray-500 mb-3">{subtitle}</p>}
          <div
            className="text-sm text-gray-700 rich-content leading-relaxed"
            dangerouslySetInnerHTML={{ __html: previewHtml || '<span class="text-gray-400 italic">(sin contenido)</span>' }}
          />
          {files.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-400 mb-2">{files.length} archivo{files.length !== 1 ? 's' : ''} adjunto{files.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        {selectedGroups.length > 0 && (
          <p className="text-xs text-gray-500">
            Para: {selectedGroups.map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(', ')}
            {scheduledAt && ` · Programado para ${new Date(scheduledAt).toLocaleString('es-CO')}`}
          </p>
        )}

        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full justify-center py-2.5">
          {loading ? 'Publicando...' : isEditing ? 'Guardar cambios' : 'Publicar anuncio'}
        </button>

        {error   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>}
      </div>
    );
  }

  // ── MODO EDITOR ───────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Título */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Título *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ej: Recordatorio importante"
          className="input"
        />
      </div>

      {/* Subtítulo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Subtítulo <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          value={subtitle}
          onChange={e => setSubtitle(e.target.value)}
          placeholder="Breve descripción"
          className="input"
        />
      </div>

      {/* Editor enriquecido */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contenido *</label>
        <div className="border border-gray-300 rounded-lg overflow-hidden
                        focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500
                        transition-all">
          {/* Toolbar */}
          <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
            <ToolBtn onClick={() => applyFormat('bold')}      title="Negrita"   className="font-bold">B</ToolBtn>
            <ToolBtn onClick={() => applyFormat('italic')}    title="Cursiva"   className="italic">I</ToolBtn>
            <ToolBtn onClick={() => applyFormat('underline')} title="Subrayado" className="underline">U</ToolBtn>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <ToolBtn onClick={() => applyBlock('h2')}         title="Título" className="text-xs font-bold">T1</ToolBtn>
            <ToolBtn onClick={() => applyBlock('h3')}         title="Subtítulo" className="text-xs font-semibold">T2</ToolBtn>
            <ToolBtn onClick={() => applyBlock('p')}          title="Párrafo normal" className="text-xs">P</ToolBtn>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <ToolBtn onClick={() => applyFormat('insertUnorderedList')} title="Lista" className="text-xs">
              ≡ Lista
            </ToolBtn>
            <ToolBtn onClick={() => applyFormat('insertOrderedList')} title="Lista numerada" className="text-xs">
              1. Lista
            </ToolBtn>
          </div>

          {/* Área editable */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Escribe el contenido del comunicado..."
            className="editor-area min-h-[120px] max-h-[280px] overflow-y-auto px-3 py-2.5
                       text-sm text-gray-900 focus:outline-none leading-relaxed"
          />
        </div>
      </div>

      {/* Grupos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Grupos *</label>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            <a href="/teacher/grupos" className="text-primary-600 hover:underline">Crea grupos primero.</a>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groups.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGroup(g.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selectedGroups.includes(g.id)
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Adjuntos existentes (solo en edición) */}
      {isEditing && existingAtts.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Adjuntos actuales</label>
          <ul className="space-y-1.5">
            {existingAtts.map(att => (
              <li key={att.id}
                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-700 truncate mr-2">{att.file_name}</span>
                <button type="button" onClick={() => removeExistingAtt(att.id)}
                  className="text-gray-400 hover:text-red-500 flex-shrink-0 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nuevos archivos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isEditing ? 'Agregar archivos' : 'Archivos adjuntos'}
        </label>
        <label className="btn-secondary text-sm cursor-pointer">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          Adjuntar archivos
          <input type="file" multiple onChange={handleFiles} className="sr-only" />
        </label>
        {files.length > 0 && (
          <ul className="mt-2.5 space-y-1.5">
            {files.map((f, i) => (
              <li key={i}
                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-700 truncate mr-2">{f.name}</span>
                <button type="button" onClick={() => removeNewFile(i)}
                  className="text-gray-400 hover:text-red-500 flex-shrink-0 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Programar publicación */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Programar para <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={e => setScheduledAt(e.target.value)}
          className="input"
          min={new Date().toISOString().slice(0, 16)}
        />
        {scheduledAt && (
          <p className="text-xs text-gray-400 mt-1">
            Se publicará el {new Date(scheduledAt).toLocaleString('es-CO', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {/* Opciones: Fijado + Importante */}
      <div className="flex flex-col gap-2.5 pt-1">
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer" />
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
            Fijar al principio del feed
          </span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input type="checkbox" checked={important} onChange={e => setImportant(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400 cursor-pointer" />
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
            Marcar como importante
          </span>
        </label>
      </div>

      {/* Mensajes */}
      {error   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>}

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handlePreview}
          className="btn-secondary flex-1 justify-center py-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Previsualizar
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-2">
          {loading
            ? 'Guardando...'
            : scheduledAt
              ? 'Programar'
              : isEditing
                ? 'Guardar'
                : 'Publicar'}
        </button>
      </div>

      {isEditing && onCancel && (
        <button type="button" onClick={onCancel}
          className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-1">
          Cancelar edición
        </button>
      )}

    </form>
  );
}

function ToolBtn({
  onClick, title, className = '', children,
}: {
  onClick: () => void;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded
                  hover:bg-white text-gray-600 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
