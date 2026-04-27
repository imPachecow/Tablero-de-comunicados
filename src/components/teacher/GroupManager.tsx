import { useState } from 'react';
import { supabaseClient } from '../../lib/supabase';
import type { Group } from '../../lib/types';

interface Props {
  initialGroups: Group[];
  teacherId: string;
}

export default function GroupManager({ initialGroups, teacherId }: Props) {
  const [groups, setGroups]     = useState<Group[]>(initialGroups);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Group | null>(null);
  const [name, setName]         = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError]       = useState('');

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setError('');
    setShowForm(true);
  };

  const openEdit = (g: Group) => {
    setEditing(g);
    setName(g.name);
    setDescription(g.description ?? '');
    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');

    if (editing) {
      const { data, error: err } = await supabaseClient
        .from('groups')
        .update({ name: name.trim(), description: description.trim() || null })
        .eq('id', editing.id)
        .select()
        .single();

      if (err) { setError('Error al actualizar el grupo.'); setSaving(false); return; }
      setGroups(prev => prev.map(g => g.id === editing.id ? { ...g, ...data } : g));
    } else {
      const { data, error: err } = await supabaseClient
        .from('groups')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          teacher_id: teacherId,
        })
        .select()
        .single();

      if (err) { setError('Error al crear el grupo.'); setSaving(false); return; }
      setGroups(prev => [...prev, data]);
    }

    setSaving(false);
    closeForm();
  };

  const handleDelete = async (g: Group) => {
    if (!confirm(`¿Eliminar el grupo "${g.name}"?\nLos anuncios dirigidos a este grupo seguirán existiendo.`)) return;
    setDeleting(g.id);
    const { error: err } = await supabaseClient.from('groups').delete().eq('id', g.id);
    if (!err) setGroups(prev => prev.filter(gr => gr.id !== g.id));
    setDeleting(null);
  };

  return (
    <div className="space-y-4">

      <div className="flex justify-end">
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo grupo
        </button>
      </div>

      {showForm && (
        <div className="card border border-primary-200 bg-primary-50/20">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">
            {editing ? 'Editar grupo' : 'Nuevo grupo'}
          </h3>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nombre del grupo *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="input"
                placeholder="Ej: Grado 10A, Matemáticas 9B"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Descripción{' '}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="input resize-none"
                rows={2}
                placeholder="Breve descripción del grupo..."
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear grupo'}
              </button>
              <button type="button" onClick={closeForm} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm mb-2">No tienes grupos creados.</p>
          <button onClick={openCreate} className="text-sm text-primary-600 hover:underline">
            Crear primer grupo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(g => (
            <div
              key={g.id}
              className="card border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">{g.name}</h3>
                  {g.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{g.description}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => openEdit(g)}
                  className="btn-secondary text-xs flex-1 justify-center py-1.5"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(g)}
                  disabled={deleting === g.id}
                  className="btn-danger text-xs px-3 py-1.5"
                >
                  {deleting === g.id ? '...' : 'Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
