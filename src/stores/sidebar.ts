import { create } from 'zustand';

interface SidebarState {
  collapsed: boolean;
  mobileOpen: boolean;
  isMobile: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setMobileOpen: (open: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  mobileOpen: false,
  isMobile: false,
  toggle: () => set((state) => ({ collapsed: !state.collapsed })),
  setCollapsed: (collapsed) => set({ collapsed }),
  setMobileOpen: (open) => set({ mobileOpen: open }),
  setIsMobile: (isMobile) => set({ isMobile }),
}));
