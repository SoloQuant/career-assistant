import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CalendarEventItem,
  CreateCalendarEventRequest,
} from '@shared/api.interface';

export async function getEvents(params: {
  startDate: string;
  endDate: string;
  eventType?: string;
  status?: string;
}): Promise<{ items: CalendarEventItem[] }> {
  const { data } = await axiosForBackend.get('/api/calendar', { params });
  return data;
}

export async function getUpcomingEvents(
  limit = 10,
): Promise<{ items: CalendarEventItem[] }> {
  const { data } = await axiosForBackend.get('/api/calendar/upcoming', {
    params: { limit },
  });
  return data;
}

export async function getEventDetail(id: string): Promise<CalendarEventItem> {
  const { data } = await axiosForBackend.get(`/api/calendar/${id}`);
  return data;
}

export async function createEvent(
  payload: CreateCalendarEventRequest,
): Promise<CalendarEventItem> {
  const { data } = await axiosForBackend.post('/api/calendar', payload);
  return data;
}

export async function updateEvent(
  id: string,
  payload: Partial<CreateCalendarEventRequest>,
): Promise<CalendarEventItem> {
  const { data } = await axiosForBackend.patch(`/api/calendar/${id}`, payload);
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  await axiosForBackend.delete(`/api/calendar/${id}`);
}

export async function getMonthStats(year: number, month: number): Promise<{
  year: number;
  month: number;
  totalEvents: number;
  typeBreakdown: { eventType: string; count: number }[];
  completedCount: number;
}> {
  const { data } = await axiosForBackend.get('/api/calendar/stats/month', {
    params: { year, month },
  });
  return data;
}
