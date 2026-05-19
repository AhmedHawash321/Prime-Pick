"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { GET_CATEGORY_BY_SLUG } from "@/graphql/categories";
import LoadingSpinner from "@/components/LoadingSpinner";
import ProductCard from "@/components/ProductCard";
import { ArrowLeft, TagIcon, FilterIcon, XIcon, SearchXIcon } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
  createdAt?: string;
  user?: {
    id: string;
    name: string;
  };
}

interface CategoryData {
  getCategoryBySlug: {
    id: string;
    name: string;
    description?: string;
    products: Product[];
  };
}

export default function CategoryDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  // 1. Local Search State: Decoupled from global search to prevent triggering global search modal
  const [localSearch, setLocalSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data, loading, error } = useQuery<CategoryData>(GET_CATEGORY_BY_SLUG, {
    variables: { slug },
    skip: !slug,
  });

  // Stable reference for category data
  const category = useMemo(() => data?.getCategoryBySlug, [data]);

  // 2. Filter products using Local Search and Price Filters
  const filteredProducts = useMemo(() => {
    const products = category?.products || [];
    
    return products.filter((product) => {
      // Filter by the local search state instead of global store
      const matchesSearch = product.title.toLowerCase().includes(localSearch.toLowerCase());
      
      const min = minPrice !== "" ? Number(minPrice) : 0;
      const max = maxPrice !== "" ? Number(maxPrice) : Infinity;
      const matchesPrice = product.price >= min && product.price <= max;
      
      return matchesSearch && matchesPrice;
    });
  }, [category?.products, localSearch, minPrice, maxPrice]);

  const handleClearAll = () => {
    setLocalSearch(""); // Resets only local category search
    setMinPrice("");
    setMaxPrice("");
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="alert alert-error m-10">Error loading products</div>;

  if (!category) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h2 className="text-2xl font-black">Category not found</h2>
        <Link href="/categories" className="btn btn-primary mt-4">Back to Categories</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header & Breadcrumbs */}
      <Link href="/categories" className="btn btn-ghost btn-sm gap-2 mb-6 opacity-50 hover:opacity-100">
        <ArrowLeft className="size-4" /> All Departments
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <TagIcon className="size-5 text-primary" />
          <span className="text-xs font-black uppercase tracking-widest opacity-40">Department Collection</span>
        </div>
        <h1 className="text-6xl font-black tracking-tighter uppercase mb-4">
          {category.name}
        </h1>
        <p className="text-sm font-bold opacity-50 uppercase tracking-widest">
          {filteredProducts.length} Items Found
        </p>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-75 relative">
          <input
            type="text"
            placeholder={`Search in ${category.name}...`}
            value={localSearch} // Uses local state
            onChange={(e) => setLocalSearch(e.target.value)} // Updates only local state
            className="input input-bordered w-full rounded-2xl bg-base-300/50 border-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {localSearch && (
            <button onClick={() => setLocalSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50">
              <XIcon className="size-4" />
            </button>
          )}
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn rounded-2xl px-6 ${showFilters || minPrice || maxPrice ? 'btn-primary' : 'btn-outline'} gap-2`}
        >
          <FilterIcon className="size-4" />
          Price Filter
        </button>

        {(localSearch || minPrice || maxPrice) && (
          <button onClick={handleClearAll} className="btn btn-ghost text-xs opacity-50 uppercase font-black">
            Clear All
          </button>
        )}
      </div>

      {/* Price Filters UI */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 p-6 bg-base-300/50 rounded-3xl border border-base-content/5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase opacity-40 ml-2">Min Price</label>
            <input
              type="number"
              placeholder="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="input input-bordered w-full rounded-xl bg-base-100 border-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase opacity-40 ml-2">Max Price</label>
            <input
              type="number"
              placeholder="Any"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="input input-bordered w-full rounded-xl bg-base-100 border-none"
            />
          </div>
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-base-300/10 rounded-[3rem] border-2 border-dashed border-base-content/5">
          <SearchXIcon className="size-16 opacity-10 mb-4" />
          <h3 className="text-xl font-black opacity-30 uppercase tracking-widest">No matching products</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} isDashboard={false} />
          ))}
        </div>
      )}
    </div>
  );
}