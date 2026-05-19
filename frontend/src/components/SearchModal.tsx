"use client";

import { useQuery } from "@apollo/client/react";
import { GET_PRODUCTS } from "@/graphql/products";
import { useSearchStore } from "@/store/searchStore";
import { PackageIcon } from "lucide-react";
import Image from "next/image";
import { useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Product type definition
interface Product {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  stock: number;
}

// GraphQL response type
interface ProductsResponse {
  getProducts: Product[];
}

export default function SearchModal() {
  const router = useRouter();
  
  // Get search state from Zustand store
  const searchQuery = useSearchStore((state) => state.searchQuery);
  const isSearchOpen = useSearchStore((state) => state.isSearchOpen);
  const closeSearch = useSearchStore((state) => state.closeSearch);
  const resetSearch = useSearchStore((state) => state.resetSearch);

  // Reference to the modal DOM element for outside click detection
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch products from GraphQL API
  const { data, loading } = useQuery<ProductsResponse>(GET_PRODUCTS, {
    variables: { limit: 50, offset: 0 },
    fetchPolicy: "cache-and-network",
  });

  // Memoize all products to prevent unnecessary re-renders
  const allProducts = useMemo(
    () => data?.getProducts || [],
    [data?.getProducts],
  );

  // Filter products based on search query - only re-calculate when dependencies change
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allProducts.filter((product) =>
      product.title.toLowerCase().includes(query),
    );
  }, [allProducts, searchQuery]);

  // Clean up search state when component unmounts (navigation happens)
  useEffect(() => {
    return () => {
      resetSearch();
    };
  }, [resetSearch]);

  // Listen to browser back/forward navigation to reset search state
  useEffect(() => {
    const handleRouteChange = () => {
      resetSearch();
    };
    
    // Add event listener for popstate (back/forward buttons)
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [resetSearch]);

  // Close modal when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeSearch();
      }
    };
    if (isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearchOpen, closeSearch]);

  // Close modal when pressing Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSearch();
      }
    };
    if (isSearchOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isSearchOpen, closeSearch]);

  // Handle product click: close modal, reset search, and navigate to product page
  const handleProductClick = (productId: string) => {
    closeSearch();      // Close the search modal
    resetSearch();      // Clear search state from store
    router.push(`/products/${productId}`); // Navigate to product detail page
  };

  // Don't render anything if modal is closed or no search query
  if (!isSearchOpen || !searchQuery) return null;

  return (
    <div
      className="absolute top-full left-0 w-full mt-1 z-100"
      ref={modalRef}
    >
      <div className="bg-base-200 rounded-xl shadow-2xl border border-base-content/10 overflow-hidden">
        <div className="max-h-100 overflow-y-auto">
          {loading ? (
            // Loading state while fetching products
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            // Empty state - no search results found
            <div className="flex flex-col items-center py-8 text-center">
              <PackageIcon className="size-8 opacity-20 mb-2" />
              <p className="text-xs opacity-50">
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : "Start typing to search..."}
              </p>
            </div>
          ) : (
            // Search results list
            <div className="flex flex-col">
              {/* Results header with count */}
              <div className="px-4 py-2 bg-base-300/30 border-b border-base-content/5">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {filteredProducts.length} Suggestions
                </p>
              </div>

              {/* Render each search result */}
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  className="flex items-center gap-3 p-3 hover:bg-base-100 transition-colors group cursor-pointer border-b border-base-content/5 last:border-none"
                >
                  {/* Product image */}
                  <div className="relative w-10 h-10 rounded bg-base-300 shrink-0 overflow-hidden">
                    <Image
                      src={product.imageUrl || "/placeholder.jpg"}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  
                  {/* Product details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                      {product.title}
                    </h4>
                    <p className="text-[10px] opacity-60 font-mono">
                      {product.price.toLocaleString()} EGP
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}