import { create } from 'zustand';

interface SearchState {
  searchQuery: string;
  isSearchOpen: boolean;
  setSearchQuery: (query: string) => void;
  openSearch: () => void;
  closeSearch: () => void;
  clearSearch: () => void;
  resetSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchQuery: '',
  isSearchOpen: false,
  setSearchQuery: (query) => set({ searchQuery: query, isSearchOpen: query.length > 0 }),
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false, searchQuery: '' }),
  clearSearch: () => set({ searchQuery: '', isSearchOpen: false }),
  resetSearch: () => set({ searchQuery: '', isSearchOpen: false }),
}));