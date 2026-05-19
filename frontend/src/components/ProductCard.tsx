"use client";

import Link from "next/link";
import { Edit3Icon, Trash2Icon, EyeIcon, MapPinIcon, StarIcon, MessageSquareIcon } from "lucide-react";
import Image from "next/image";

/* Updated Interface to include comments for rating calculations */
interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  stock: number;
  imageUrl?: string;
  image_url?: string;
  comments?: { rating: number }[]; // Added to support rating display
  user?: {
    name?: string;
  };
}

interface ProductCardProps {
  product: Product;
  onDelete?: (id: string) => void;
  isDashboard?: boolean;
}

export default function ProductCard({ product, onDelete, isDashboard = false }: ProductCardProps) {
  /* Ensure the correct image source is used */
  const displayImage = product.imageUrl || product.image_url || "/placeholder.png";

  /* Logic to calculate average rating and comment count */
  const totalComments = product.comments?.length || 0;
  const avgRating = totalComments > 0 
    ? (product.comments!.reduce((acc, curr) => acc + curr.rating, 0) / totalComments).toFixed(1)
    : null;

  return (
    <div className="group relative bg-base-300 rounded-[2.5rem] overflow-hidden border border-base-content/5 hover:border-primary/30 transition-all duration-300 shadow-sm flex flex-col h-full">
      
      {/* Product Image Section */}
      <div className="relative aspect-square p-3">
        <div className="relative h-full w-full overflow-hidden rounded-4xl bg-base-100">
          <Image
            src={displayImage}
            alt={product.title || "Product Image"}
            fill
            className={`object-cover transition-transform duration-500 group-hover:scale-110 ${product.stock <= 0 ? "grayscale opacity-50" : ""}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />

          {/* Floating Rating Badge */}
          {avgRating && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-full text-[10px] font-black border border-white/10 shadow-lg">
              <StarIcon className="size-3 text-yellow-400 fill-current" />
              {avgRating}
            </div>
          )}

          {/* Out Of Stock Badge */}
          {product.stock <= 0 && (
            <div className="absolute top-4 left-4 z-20">
              <div className="badge badge-error font-black text-[10px] py-3 shadow-lg">OUT OF STOCK</div>
            </div>
          )}
          
          {/* Action Overlay */}
          {(onDelete || isDashboard) ? (
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
              <Link 
                href={`/products/${product.id}`}
                className="btn btn-circle btn-sm bg-white text-black border-none hover:bg-gray-200"
              >
                <EyeIcon className="size-4" />
              </Link>
              <Link 
                href={`/dashboard/products/edit/${product.id}`} 
                className="btn btn-circle btn-sm btn-primary"
              >
                <Edit3Icon className="size-4" />
              </Link>
              {onDelete && (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(product.id);
                  }} 
                  className="btn btn-circle btn-sm btn-error"
                >
                  <Trash2Icon className="size-4" />
                </button>
              )}
            </div>
          ) : (
            /* Link covering the image for normal users */
            <Link href={`/products/${product.id}`} className="absolute inset-0 z-10" />
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="p-6 pt-2 space-y-3 flex flex-col flex-1 justify-between">
        <div>
          <h2 className="font-black text-lg line-clamp-1 group-hover:text-primary transition-colors uppercase tracking-tight">
            {product.title}
          </h2>
          <p className="text-xs opacity-60 line-clamp-2 mt-1 font-medium">
            {product.description || "No description available."}
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-base-content/10">
          <div className="flex flex-col">
             <span className="text-2xl font-black text-primary leading-none">
                {Number(product.price).toLocaleString()} 
             </span>
             <span className="text-[10px] font-bold opacity-40 uppercase">EGP</span>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            {/* Show comment count if any exist */}
            {totalComments > 0 && (
              <div className="flex items-center gap-1 opacity-40 text-[9px] font-black uppercase mb-1">
                <MessageSquareIcon className="size-3" /> {totalComments} Review{totalComments !== 1 ? 's' : ''}
              </div>
            )}
            <div className="flex items-center gap-1 opacity-40 text-[9px] font-black uppercase">
              <MapPinIcon className="size-3" /> Cairo
            </div>
            {!isDashboard && (
               <div className="badge badge-ghost badge-xs opacity-30 font-bold truncate max-w-80px">
                 {product.user?.name || "Verified"}
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}