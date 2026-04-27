// =====================================================
// Tipos TypeScript — IE La Gabriela
// =====================================================

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'teacher';
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  teacher_id: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  subtitle?: string | null;
  content: string;           // HTML enriquecido
  group_ids: string[];
  teacher_id: string;
  pinned: boolean;
  important: boolean;
  scheduled_at?: string | null; // null = publicado inmediatamente
  created_at: string;
  updated_at: string;
  attachments?: AnnouncementAttachment[];
}

export interface AnnouncementAttachment {
  id: string;
  announcement_id: string;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  file_type?: string | null;
  created_at: string;
}

export type CreateAnnouncementDTO = {
  title: string;
  subtitle?: string | null;
  content: string;
  group_ids: string[];
  pinned?: boolean;
  important?: boolean;
  scheduled_at?: string | null;
  attachments?: AttachmentInput[];
};

export type UpdateAnnouncementDTO = CreateAnnouncementDTO & {
  removedAttachmentIds?: string[];
};

export interface AttachmentInput {
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
}

export interface CreateGroupDTO {
  name: string;
  description?: string;
}
