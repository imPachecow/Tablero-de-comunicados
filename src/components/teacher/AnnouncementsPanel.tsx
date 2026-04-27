import { useState } from 'react';
import type { Announcement, AnnouncementAttachment, Group } from '../../lib/types';
import AnnouncementEditor from './AnnouncementEditor';

type FullAnnouncement = Announcement & { attachments: AnnouncementAttachment[] };

interface Props {
  initialAnnouncements: FullAnnouncement[];
  groups: Group[];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function isScheduled(ann: Announcement): boolean {
  return !!ann.scheduled_at && new Date(ann.scheduled_at) > new Date();
}

export default function AnnouncementsPanel({ initialAnnouncements, groups }: Props) {
  const [announcements, setAnnouncements] = useState<FullAnnouncement[]>(initialAnnouncements);
  const [editingAnn, setEditingAnn]       = useState<FullAnnouncement | null>(null);
  const [deleting, setDeleting]           = useState<string | null>(null);

  const groupMap = new Map(groups.map(g => [g.id, g.name]));

  const handleSaved = (saved: FullAnnouncement) => {
    if (editingAnn) {
      setAnnouncements(prev => prev.map(a => a.id === saved.id ? saved : a));
      setEditingAnn(null);
    } else {
      setAnnouncements(prev => [saved, ...prev]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este anuncio? Esta acción no se puede deshacer.')) return;
    setDeleting(id);
    const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      if (editingAnn?.id === id) setEditingAnn(null);
    }
    setDeleting(null);
  };

  const handleEdit = (ann: FullAnnouncement) => {
    setEditingAnn(ann);
    // Scroll al editor en móvil
    setTimeout(() => {
      document.getElementById('announcement-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

      {/* Editor */}
      <div className="lg:col-span-2" id="announcement-editor">
        <div className="bg-white rounded-xl border border-gray-100 p-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">
              {editingAnn ? 'Editar anuncio' : 'Nuevo anuncio'}
            </h2>
            {editingAnn && (
              <button
                onClick={() => setEditingAnn(null)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕ Cancelar
              </button>
            )}
          </div>
          <AnnouncementEditor
            groups={groups}
            editingAnnouncement={editingAnn}
            onSaved={handleSaved}
            onCancel={() => setEditingAnn(null)}
          />
        </div>
      </div>

      {/* Lista */}
      <div className="lg:col-span-3">
        <h2 className="font-semibold text-gray-900 mb-4">
          Publicados
          <span className="ml-1.5 text-sm font-normal text-gray-400">
            ({announcements.length})
          </span>
        </h2>

        {announcements.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 text-center py-16">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Aún no has publicado anuncios.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(ann => {
              const scheduled = isScheduled(ann);
              const isActiveEdit = editingAnn?.id === ann.id;
              const groupNames = ann.group_ids
                .map(id => groupMap.get(id))
                .filter(Boolean)
                .join(', ');

              return (
                <article
                  key={ann.id}
                  className={`bg-white rounded-xl border p-4 transition-all ${
                    isActiveEdit  ? 'border-primary-300 ring-1 ring-primary-200' :
                    ann.pinned    ? 'border-primary-100' :
                    ann.important ? 'border-amber-100' :
                                    'border-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {scheduled && (
                          <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-medium">
                            Programado
                          </span>
                        )}
                        {ann.pinned && (
                          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                            Fijado
                          </span>
                        )}
                        {ann.important && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            Importante
                          </span>
                        )}
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{ann.title}</h3>
                      </div>

                      {ann.subtitle && (
                        <p className="text-xs text-gray-500 mb-1.5">{ann.subtitle}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                        <span>
                          {scheduled
                            ? `Programado: ${new Date(ann.scheduled_at!).toLocaleString('es-CO', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}`
                            : formatDate(ann.created_at)}
                        </span>
                        {groupNames && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857" />
                            </svg>
                            {groupNames}
                          </span>
                        )}
                        {(ann.attachments?.length ?? 0) > 0 && (
                          <span>{ann.attachments!.length} adjunto{ann.attachments!.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(ann)}
                        disabled={isActiveEdit}
                        className="text-xs text-gray-500 hover:text-primary-600 hover:bg-primary-50
                                   px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-40"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(ann.id)}
                        disabled={deleting === ann.id}
                        className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50
                                   px-2.5 py-1.5 rounded-md transition-colors border border-transparent
                                   hover:border-red-200 disabled:opacity-50"
                      >
                        {deleting === ann.id ? '...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
