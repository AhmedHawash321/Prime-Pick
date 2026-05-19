"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { GET_PRODUCT_BY_ID } from "@/graphql/products";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  PackageIcon,
  UserIcon,
  ArrowLeft,
  MapPinIcon,
  StarIcon,
  MessageSquareIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import AddToCartButton from "@/components/AddToCartButton";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  userId: string;
  category?: {
    name: string;
    slug: string;
  };
  comments?: {
    id: string;
    content: string;
    rating: number;
    createdAt: string;
    user: {
      name: string;
    };
  }[];
  user?: {
    id: string;
    name: string;
  };
}

interface ProductResponse {
  getProductById: Product;
}

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params?.id as string;

  /**
   * Apollo Query Configuration
   * fetchPolicy: "no-cache" ensures the client never stores this data.
   * Every time the component mounts or requests data, it goes to the network,
   * making it impossible for "ghost" deleted comments to appear from the local cache.
   */
  const { data, loading, error } = useQuery<ProductResponse>(
    GET_PRODUCT_BY_ID,
    {
      variables: { id: productId },
      skip: !productId || productId === "undefined",
      fetchPolicy: "no-cache", 
      nextFetchPolicy: "no-cache",
      errorPolicy: "all", 
      context: {
        headers: {
          "Cache-Control": "no-cache",
        }
      }
    },
  );

  const product = data?.getProductById;

  const totalComments = product?.comments?.length || 0;
  const avgRating =
    totalComments > 0
      ? (
          product!.comments!.reduce((acc, curr) => acc + curr.rating, 0) /
          totalComments
        ).toFixed(1)
      : null;

  const backPath = product?.category?.slug
    ? `/categories/${product.category.slug}`
    : "/categories";

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="alert alert-error shadow-lg">
          <span>Error loading product: {error.message}</span>
        </div>
        <Link href="/categories" className="btn btn-primary mt-8">
          <ArrowLeft className="size-4 mr-2" /> Back to Catalog
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <PackageIcon className="size-16 mx-auto opacity-10 mb-4" />
        <h2 className="text-2xl font-black">Product Not Found</h2>
        <p className="opacity-60 mb-6">
          The item may have been removed or the ID is invalid.
        </p>
        <Link href="/categories" className="btn btn-primary">
          Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link
        href={backPath}
        className="btn btn-ghost btn-sm gap-2 mb-8 hover:bg-base-300 transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to{" "}
        {product.category?.name || "Department"}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-base-300/50 border border-base-content/5 p-6 md:p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-md mb-12">
        <div className="relative aspect-square rounded-3xl overflow-hidden bg-base-100 ring-1 ring-base-content/10">
          <Image
            src={product.imageUrl || "/placeholder.jpg"}
            alt={product.title || "Product Image"}
            fill
            className="object-cover hover:scale-105 transition-transform duration-700"
            priority
          />
        </div>

        <div className="flex flex-col h-full">
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={`badge ${product.stock > 0 ? "badge-success" : "badge-error"} font-bold p-3`}
                >
                  {product.stock > 0 ? "AVAILABLE" : "OUT OF STOCK"}
                </div>
                {avgRating && (
                  <div className="flex items-center gap-1 bg-yellow-400 text-black font-black text-[10px] px-3 py-1 rounded-full shadow-sm">
                    <StarIcon className="size-3 fill-current" />
                    {avgRating} ({totalComments})
                  </div>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
                {product.title}
              </h1>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-primary tracking-tighter">
                  {product.price.toLocaleString()}
                </span>
                <span className="text-xl font-bold opacity-40">EGP</span>
              </div>
            </div>

            <div className="divider opacity-10"></div>

            <div className="space-y-4">
              <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2 opacity-60">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <p className="size-4 text-primary">📦</p>
                </div>
                Item Details
              </h3>
              <p className="text-lg text-base-content/80 leading-relaxed font-medium">
                {product.description ||
                  "A premium curated item from our trusted sellers in Egypt."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-base-100 p-4 rounded-2xl border border-base-content/5">
                <div className="flex items-center gap-2 mb-1">
                  <UserIcon className="size-4 text-secondary" />
                  <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">
                    Seller
                  </span>
                </div>
                <p className="font-bold truncate">
                  {product.user?.name || "Verified Trader"}
                </p>
              </div>
              <div className="bg-base-100 p-4 rounded-2xl border border-base-content/5">
                <div className="flex items-center gap-2 mb-1">
                  <MapPinIcon className="size-4 text-accent" />
                  <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">
                    Location
                  </span>
                </div>
                <p className="font-bold">Cairo, EG</p>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <AddToCartButton productId={product.id} stock={product.stock} />
            <p className="text-center text-[10px] opacity-40 mt-4 font-bold uppercase tracking-widest">
              Secure Transaction Guaranteed
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12 space-y-8">
        <h2 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <MessageSquareIcon className="size-8 text-primary" />
          Customer Reviews ({totalComments})
        </h2>

        {totalComments > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {product.comments?.map((comment) => (
              <div
                key={comment.id}
                className="bg-base-200 p-6 rounded-3xl border border-base-content/5 shadow-inner"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary uppercase">
                      {comment.user?.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{comment.user.name}</p>
                      <p className="text-[10px] opacity-40 uppercase font-black">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-400/10 text-yellow-500 px-2 py-1 rounded-lg text-xs font-black border border-yellow-400/20">
                    <StarIcon className="size-3 fill-current" />
                    {comment.rating}
                  </div>
                </div>
                <p className="text-base-content/80 text-sm leading-relaxed italic">
                  &quot;{comment.content}&quot;
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-base-200/50 rounded-3xl p-10 text-center border border-dashed border-base-content/10">
            <p className="opacity-40 font-bold italic text-sm">
              No reviews yet. Be the first to share your thoughts!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}