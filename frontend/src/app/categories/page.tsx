"use client";

import { useQuery } from "@apollo/client/react";
import { GET_CATEGORIES } from "@/graphql/categories";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowRightIcon, LayoutGridIcon, ChevronLeftIcon, ChevronRightIcon, SearchXIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useMemo } from "react";
// Import the shared search store
import { useSearchStore } from '@/store/searchStore';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
}

interface CategoriesResponse {
  getCategories: Category[];
}

export default function CategoriesPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Connect to the global search state from the Navbar
  const searchQuery = useSearchStore((state) => state.searchQuery);

  const { data, loading, error } = useQuery<CategoriesResponse>(GET_CATEGORIES, {
    fetchPolicy: "network-only",
  });

  // FIX: Memoize the categories initialization to maintain a stable reference
  const categories = useMemo(() => {
    return data?.getCategories || [];
  }, [data]);

  // Filter categories based on the global search query
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  // Derive New Arrivals from the stable categories reference
  const newArrivals = useMemo(() => {
    return categories.slice(0, 5);
  }, [categories]);

  const maxIndex = newArrivals.length > 0 ? newArrivals.length - 1 : 0;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="container mx-auto mt-10 max-w-7xl px-4">
        <div className="alert alert-error shadow-lg">
          <span>Failed to load categories. Please try again later.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl overflow-x-hidden">
      {/* 1. NEW ARRIVALS SLIDER SECTION */}
      {!searchQuery && newArrivals.length > 0 && (
        <div className="mb-16 relative">
          <div className="flex items-center gap-2 mb-6">
            <span className="bg-primary size-2 rounded-full animate-pulse" />
            <h2 className="text-sm font-black uppercase tracking-[0.4em] opacity-70">
              Personalized Discovery
            </h2>
          </div>

          <div className="relative flex items-center group">
            <button 
              onClick={prevSlide}
              className="absolute left-2 lg:left-4 z-30 btn btn-circle btn-primary shadow-2xl border-none hover:scale-110 transition-all"
            >
              <ChevronLeftIcon className="size-6" />
            </button>

            <div className="w-full overflow-hidden px-10">
              <div 
                className="flex gap-6 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                style={{ 
                  transform: `translateX(-${currentIndex * (100 / (typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 2))}%)`,
                }}
              >
                {newArrivals.map((cat) => (
                  <div 
                    key={cat.id} 
                    className="min-w-full md:min-w-[calc(50%-12px)] shrink-0"
                  >
                    <div className="relative group overflow-hidden bg-base-300/30 rounded-4xl p-8 flex flex-col justify-end border border-base-content/5 min-h-65 transition-all duration-300 hover:bg-primary/10 hover:border-primary/20 hover:shadow-[0_0_40px_rgba(var(--p),0.15)]">
                      {cat.imageUrl && (
                        <Image
                          src={cat.imageUrl}
                          alt={cat.name}
                          fill
                          className="object-cover opacity-20 group-hover:scale-105 transition-transform duration-1000 -z-10"
                        />
                      )}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">New Arrival</span>
                        <h3 className="text-4xl font-black uppercase tracking-tighter italic leading-none">
                          {cat.name}
                        </h3>
                        <p className="text-xs opacity-70 font-bold max-w-xs mb-6 line-clamp-1">
                          {cat.description || "Discover our latest collection in this department."}
                        </p>
                        <Link
                          href={`/categories/${cat.slug}`}
                          className="btn btn-primary btn-sm w-fit rounded-full px-6 text-xs"
                        >
                          Explore {cat.name}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={nextSlide}
              className="absolute right-2 lg:right-4 z-30 btn btn-circle btn-primary shadow-2xl border-none hover:scale-110 transition-all"
            >
              <ChevronRightIcon className="size-6" />
            </button>
          </div>
        </div>
      )}

      {/* 2. DYNAMIC HEADER SECTION */}
      <div className="mb-10">
        <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">
          {searchQuery ? `Results for: ${searchQuery}` : "All Departments"}
        </h1>
        <p className="text-xs font-bold opacity-50 uppercase tracking-[0.2em] mt-3">
          {searchQuery 
            ? `Found ${filteredCategories.length} matching departments`
            : `Browse through our complete catalog (${categories.length} categories)`}
        </p>
      </div>

      {/* 3. FILTERED CATEGORIES GRID */}
      {filteredCategories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group relative overflow-hidden rounded-[2.5rem] bg-base-300/50 border border-base-content/5 aspect-4/3 transition-all hover:shadow-2xl"
            >
              <div className="absolute inset-0 z-0">
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    className="object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
                    <LayoutGridIcon className="size-12 opacity-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-base-300 via-transparent to-transparent opacity-90" />
              </div>

              <div className="absolute bottom-0 left-0 p-8 w-full flex justify-between items-end z-10">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase opacity-60 tracking-[0.3em] text-primary">Department</span>
                  <h2 className="text-3xl font-black tracking-tighter uppercase leading-none text-white">
                    {category.name}
                  </h2>
                </div>
                <ArrowRightIcon className="size-5 opacity-0 group-hover:opacity-100 transition-all duration-300 text-primary" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 bg-base-300/20 rounded-[3rem] border-2 border-dashed border-base-content/10">
          <SearchXIcon className="size-16 opacity-10 mb-4" />
          <h3 className="text-xl font-black opacity-30 uppercase tracking-widest">No categories match your search</h3>
        </div>
      )}
    </div>
  );
}