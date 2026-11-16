import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  NoteItem,
  NoteListResponse,
  CreateNoteRequest,
  UpdateNoteRequest,
} from '@shared/api.interface';

export async function getNotes(params: {
  page?: number;
  pageSize?: number;
  category?: string;
  keyword?: string;
  sortBy?: string;
}): Promise<NoteListResponse> {
  const { data } = await axiosForBackend.get('/api/note', { params });
  return data;
}

export async function getNoteDetail(id: string): Promise<NoteItem> {
  const { data } = await axiosForBackend.get(`/api/note/${id}`);
  return data;
}

export async function createNote(payload: CreateNoteRequest): Promise<NoteItem> {
  const { data } = await axiosForBackend.post('/api/note', payload);
  return data;
}

export async function updateNote(
  id: string,
  payload: UpdateNoteRequest,
): Promise<NoteItem> {
  const { data } = await axiosForBackend.patch(`/api/note/${id}`, payload);
  return data;
}

export async function deleteNote(id: string): Promise<void> {
  await axiosForBackend.delete(`/api/note/${id}`);
}

export async function getCategories(): Promise<{
  categories: { name: string; count: number }[];
}> {
  const { data } = await axiosForBackend.get('/api/note/categories/list');
  return data;
}
