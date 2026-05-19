"use client";

import Link from "next/link";
import { Edit3Icon, Trash2Icon, LayersIcon } from "lucide-react";
import Image from "next/image";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  image_url?: string;
  _count?: {
    products: number;
  };
}

interface CategoryCardProps {
  category: Category;
  onDelete?: (id: string) => void;
  isDashboard?: boolean;
}

export default function CategoryCard({ category, onDelete, isDashboard = false }: CategoryCardProps) {
  // Support both camelCase and snake_case for image URLs
  const displayImage = category.imageUrl || category.image_url || "/placeholder-category.png";

  return (
    <div className="group relative bg-base-300 rounded-[2.5rem] overflow-hidden border border-base-content/5 hover:border-primary/30 transition-all duration-300 shadow-sm flex flex-col h-full">
      
      {/* Category Image Section */}
      <div className="relative aspect-16/10 p-3"> 
        <div className="relative h-full w-full overflow-hidden rounded-4xl bg-base-100">
          <Image
            src={displayImage}
            alt={category.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, 33vw"
          />

          {/* Action Overlay for Admin Dashboard */}
          {isDashboard ? (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
              <Link 
                href={`/dashboard/categories/edit/${category.slug}`} 
                className="btn btn-circle btn-sm btn-primary"
              >
                <Edit3Icon className="size-4" />
              </Link>
              {onDelete && (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(category.id);
                  }} 
                  className="btn btn-circle btn-sm btn-error"
                >
                  <Trash2Icon className="size-4" />
                </button>
              )}
            </div>
          ) : (
            /* Direct link to the department page for regular users */
            <Link href={`/categories/${category.slug}`} className="absolute inset-0 z-10" />
          )}
        </div>
      </div>

      {/* Category Details */}
      <div className="p-6 pt-2 space-y-2 flex flex-col flex-1 justify-between text-center">
        <div>
          <h2 className="font-black text-xl line-clamp-1 group-hover:text-primary transition-colors uppercase tracking-tight">
            {category.name}
          </h2>
          {category.description && (
            <p className="text-xs opacity-50 line-clamp-1 mt-1 font-medium italic">
              {category.description}
            </p>
          )}
        </div>

        {/* Stats Section: Displays product count in this category */}
        <div className="flex items-center justify-center pt-3 border-t border-base-content/10">
          <div className="flex items-center gap-2 bg-base-100/50 px-4 py-1 rounded-full">
            <LayersIcon className="size-3 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
              {category._count?.products || 0} Products
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}