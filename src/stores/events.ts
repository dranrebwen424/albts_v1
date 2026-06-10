import { create } from 'zustand';

interface EventWithFsStatus {
  id: string;
  name: string;
  status: string;
  created_at: string;
  budget: number;
  officer?: { first_name: string; last_name: string } | null;
  formCount: number;
  pendingFormCount: number;
  canGenerateFs: boolean;
  hasFsRecord: boolean;
  [key: string]: unknown;
}

interface EventsState {
  events: EventWithFsStatus[];
  setEvents: (e: EventWithFsStatus[]) => void;
}

export const useEventsStore = create<EventsState>((set) => ({
  events: [],
  setEvents: (events) => set({ events }),
}));
