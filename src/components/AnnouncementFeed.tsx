import { useState, useEffect } from 'react';
import type { Announcement, AnnouncementAttachment } from '../lib/types';

type Filter = 'all' | 'important' | 'recent';

interface Props {
  announcements: (Announcement & { attachments: AnnouncementAttachment[] })[];
  groupId: string;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function getFileUrl(path: string): string {
  return `${import.meta.env.PUBLIC_SUPABASE_URL}/storage/v1/object/public/attachments/${path}`;
}

export default function AnnouncementFeed({ announcements, groupId }: Props) {
  const [filter, setFilter]       = useState<Filter>('all');
  const [lastVisit, setLastVisit] = useState<Date | null>(null);

  const visitKey = `lg_visit_${groupId}`;
  const weekAgo  = new Date(Date.now() - WEEK_MS);

  useEffect(() => {
    const stored = localStorage.getItem(visitKey);
    if (stored) setLastVisit(new Date(stored));
    localStorage.setItem(visitKey, new Date().toISOString());
  }, [groupId]);

  const isNew = (ann: Announcement) =>
    lastVisit !== null && new Date(ann.created_at) > lastVisit;

  const newCount = announcements.filter(isNew).length;

  const filtered = announcements.filter(ann => {
    if (filter === 'important') return ann.pinned || ann.important;
    if (filter === 'recent')    return new Date(ann.created_at) >= weekAgo;
    return true;
  });

  const filters: { id: Filter; label: string }[] = [
    { id: 'all',       label: 'Todos' },
    { id: 'important', label: 'Importantes' },
    { id: 'recent',    label: 'Recientes' },
  ];

  return (
    <div>
      {/* Tabs de filtro */}
      <div className="flex items-center gap-1 mb-6 bg-white border border-gray-100 rounded-xl p-1">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg
                        text-sm font-medium transition-all ${
              filter === f.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.label}
            {f.id === 'all' && newCount > 0 && (
              <span className="bg-emerald-500 text-white text-xs font-semibold rounded-full
                               px-1.5 py-0.5 leading-none min-w-[18px] text-center">
                {newCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">
            {filter === 'important' ? 'No hay anuncios importantes.' :
             filter === 'recent'    ? 'No hay anuncios en los últimos 7 días.' :
             'No hay comunicados publicados aún.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(ann => (
            <AnnouncementCard
              key={ann.id}
              announcement={ann}
              isNew={isNew(ann)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({
  announcement: ann,
  isNew,
}: {
  announcement: Announcement & { attachments: AnnouncementAttachment[] };
  isNew: boolean;
}) {
  const hasBadge = ann.pinned || ann.important || isNew;

  return (
    <article className={`bg-white rounded-xl border p-5 sm:p-6 transition-shadow hover:shadow-sm ${
      ann.pinned    ? 'border-primary-200 shadow-sm' :
      ann.important ? 'border-amber-200' :
                      'border-gray-100'
    }`}>

      {/* Badges */}
      {hasBadge && (
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {ann.pinned && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 uppercase tracking-wide">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z" />
              </svg>
              Fijado
            </span>
          )}
          {ann.important && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 uppercase tracking-wide">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              Importante
            </span>
          )}
          {isNew && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
              Nuevo
            </span>
          )}
        </div>
      )}

      {/* Título */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 leading-snug">{ann.title}</h2>
        {ann.subtitle && (
          <p className="text-sm text-gray-500 mt-1">{ann.subtitle}</p>
        )}
      </div>

      {/* Contenido enriquecido */}
      <div
        className="text-sm text-gray-700 rich-content leading-relaxed"
        dangerouslySetInnerHTML={{ __html: ann.content }}
      />

      {/* Archivos adjuntos */}
      {ann.attachments && ann.attachments.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Archivos adjuntos
          </p>
          <div className="space-y-2">
            {ann.attachments.map(att => (
              <a
                key={att.id}
                href={getFileUrl(att.file_path)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-primary-50
                           border border-gray-200 hover:border-primary-200 rounded-lg transition-all group"
              >
                <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center
                                justify-center flex-shrink-0 group-hover:border-primary-300 transition-colors">
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-primary-700 truncate transition-colors">
                    {att.file_name}
                  </p>
                  {att.file_size && (
                    <p className="text-xs text-gray-400">{formatFileSize(att.file_size)}</p>
                  )}
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-primary-400 flex-shrink-0 transition-colors"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">{formatDate(ann.created_at)}</p>
    </article>
  );
}
