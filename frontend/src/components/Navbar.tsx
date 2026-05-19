"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useAuth, useUser } from "@clerk/nextjs";
import { 
  ShoppingBagIcon, 
  UserCircleIcon, 
  ShoppingCartIcon, 
  LayoutDashboardIcon,
  HelpCircleIcon,
  BookOpenTextIcon,
  SearchIcon,
  XIcon
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useSearchStore } from "@/store/searchStore";
import { useQuery } from "@apollo/client/react";
import { GET_CART } from "@/graphql/cart";
import { useEffect, useSyncExternalStore, useMemo } from "react";
import SearchModal from "./SearchModal";

// Custom Hook to prevent hydration mismatch
function useHasMounted() {
  return useSyncExternalStore(
    () => () => {}, 
    () => true,      
    () => false      
  );
}

// Interfaces for Cart Data
interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    price: number;
    imageUrl: string;
    stock: number;
  };
}

interface CartResponse {
  getCartByUserId: CartItem[];
}

interface FormattedCartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  imageUrl: string;
  quantity: number;
  stock: number;
}

function Navbar() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser(); // Get user object to check metadata/roles
  const hasMounted = useHasMounted(); 
  
  // Search state management
  const searchQuery = useSearchStore((state) => state.searchQuery);
  const setSearchQuery = useSearchStore((state) => state.setSearchQuery);
  const clearSearch = useSearchStore((state) => state.clearSearch);

  const { data } = useQuery<CartResponse>(GET_CART, {
    variables: { userId: userId || "" },
    skip: !isSignedIn || !userId,
  });

  const setStoreItems = useCartStore((state) => state.setItems);
  const localCartCount = useCartStore((state) => state.getTotalItems());

  // Determine if the user has admin privileges
  const isAdmin = user?.publicMetadata?.role === "admin";

  const serverCartCount = useMemo(() => {
    return data?.getCartByUserId?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  }, [data]);

  useEffect(() => {
    if (data?.getCartByUserId) {
      const formattedItems: FormattedCartItem[] = data.getCartByUserId.map((item) => ({
        id: item.id,
        productId: item.product.id,
        title: item.product.title,
        price: item.product.price,
        imageUrl: item.product.imageUrl,
        quantity: item.quantity,
        stock: item.product.stock,
      }));
      
      setStoreItems(formattedItems);
    }
  }, [data, setStoreItems]);

  const displayCount = serverCartCount > 0 ? serverCartCount : localCartCount;

  return (
    <div className="navbar bg-base-300 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto w-full px-4 flex justify-between items-center gap-4">
        
        {/* Logo Section */}
        <Link href="/" className="btn btn-ghost gap-2 px-0 shrink-0">
          <ShoppingBagIcon className="size-6 text-primary" />
          <span className="text-xl font-bold font-mono uppercase tracking-widest hidden md:inline">
            Prime-Pick
          </span>
        </Link>

        {/* Search Container */}
        <div className="flex-1 max-w-md relative hidden sm:block">
          <div className="relative flex items-center">
            <SearchIcon className="absolute left-3 size-4 opacity-30" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered input-sm w-full pl-10 pr-10 rounded-xl bg-base-100/50 border-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={clearSearch}
                className="absolute right-3 opacity-50 hover:opacity-100 transition-opacity"
              >
                <XIcon className="size-3" />
              </button>
            )}
          </div>
          <SearchModal />
        </div>

        {/* User Navigation Section */}
        <div className="flex gap-2 items-center shrink-0">
          {/* Only render Dashboard link if user is signed in AND is an admin */}
          {isSignedIn && isAdmin && (
            <Link href="/dashboard" className="btn btn-ghost btn-sm btn-circle relative group tooltip tooltip-bottom" data-tip="Dashboard">
              <LayoutDashboardIcon className="size-5 transition-transform group-hover:scale-110" />
            </Link>
          )}

          <Link href="/articles" className="btn btn-ghost btn-sm btn-circle relative group tooltip tooltip-bottom" data-tip="Articles">
            <BookOpenTextIcon className="size-5 transition-transform group-hover:scale-110" />
          </Link>

          <Link href="/cart" className="btn btn-ghost btn-sm btn-circle relative group tooltip tooltip-bottom" data-tip="Cart">
            <ShoppingCartIcon className="size-5 transition-transform group-hover:scale-110" />
            {hasMounted && displayCount > 0 && (
              <span className="badge badge-primary badge-xs absolute -top-1 -right-1 animate-in zoom-in duration-300 shadow-sm">
                {displayCount > 9 ? '9+' : displayCount}
              </span>
            )}
          </Link>

          <Link href="/help" className="btn btn-ghost btn-sm btn-circle relative group tooltip tooltip-bottom" data-tip="Help Center">
            <HelpCircleIcon className="size-5 transition-transform group-hover:scale-110" />
          </Link>

          <Link href="/profile" className="btn btn-ghost btn-sm gap-2 group tooltip tooltip-bottom" data-tip="My Orders">
            <UserCircleIcon className="size-5 transition-transform group-hover:scale-110" />
            <span className="hidden lg:inline">Profile</span>
          </Link>

          {isSignedIn ? (
            /* Fixed Type Error by removing deprecated afterSignOutUrl prop */
            <UserButton />
          ) : (
            <div className="flex gap-2">
              <SignInButton mode="modal">
                <button className="btn btn-ghost btn-sm">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="btn btn-primary btn-sm">Get Started</button>
              </SignUpButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Navbar;