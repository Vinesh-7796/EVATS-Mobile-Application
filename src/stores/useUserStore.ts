import { create } from 'zustand'

interface UserState {
  userName: string
  userId: string
  setUser: (name: string, id: string) => void
}

export const useUserStore = create<UserState>((set) => ({
  userName: 'Test User',
  userId: 'EV-001',
  setUser: (name: string, id: string) => set({ userName: name, userId: id }),
}))
