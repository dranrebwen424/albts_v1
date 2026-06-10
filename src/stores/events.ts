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

export interface EventDetailCache {
  event: any;
  receipts: any[];
  forms: any[];
  report: any | null;
}

interface EventsState {
  events: EventWithFsStatus[];
  setEvents: (e: EventWithFsStatus[]) => void;
  eventDetailCache: Record<string, EventDetailCache | undefined>;
  fsDetailCache: Record<string, any | undefined>;
  setEventDetailCache: (id: string, data: EventDetailCache) => void;
  setFsDetailCache: (id: string, data: any) => void;
}

export const useEventsStore = create<EventsState>((set) => ({
  events: [],
  setEvents: (events) => set({ events }),
  eventDetailCache: {},
  fsDetailCache: {},
  setEventDetailCache: (id, data) =>
    set((state) => ({
      eventDetailCache: { ...state.eventDetailCache, [id]: data },
    })),
  setFsDetailCache: (id, data) =>
    set((state) => ({
      fsDetailCache: { ...state.fsDetailCache, [id]: data },
    })),
}));
