import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  imageUrl: string;
  quantity: number;
  stock: number;
}

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  setItems: (items: CartItem[]) => void;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  setLoading: (loading: boolean) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      
      setItems: (items) => set({ items }),
      
      addItem: (item) => {
        const { items } = get();
        const existing = items.find(i => i.productId === item.productId);
        
        if (existing) {
          set({
            items: items.map(i =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          });
        } else {
          set({ items: [...items, item] });
        }
      },
      
      removeItem: (id) => {
        set({ items: get().items.filter(i => i.id !== id) });
      },
      
      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        set({
          items: get().items.map(i =>
            i.id === id ? { ...i, quantity } : i
          )
        });
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
      
      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'cart-storage',
    }
  )
);

export const useCartItemsCount = () => {
  const items = useCartStore((state) => state.items);
  return items.reduce((sum, item) => sum + item.quantity, 0);
};