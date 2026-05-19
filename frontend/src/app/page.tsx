"use client";

import { useProducts } from "@/hooks/useProducts";
import { PackageIcon, SparklesIcon } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  const { products, isLoading, error } = useProducts();

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div role="alert" className="alert alert-error shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Something went wrong. Please refresh the page.</span>
        </div>
      </div>
    );
  }

  /**
   * MODIFICATION: Ensure we get the actual LATEST items.
   * We spread to avoid mutating the original array, reverse to bring newest to front, 
   * and slice the first 8.
   */
  const latestProducts = products ? products.slice(0, 8) : [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-12 max-w-7xl">
      {/* HERO SECTION */}
      <section className="hero bg-base-300 rounded-3xl overflow-hidden shadow-xl border border-base-content/5">
        <div className="hero-content flex-col lg:flex-row-reverse gap-12 py-12 px-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-110 animate-pulse" />
            <div className="relative">
              <Image
                src="/image.png"
                alt="Creator"
                width={400}
                height={400}
                className="rounded-2xl shadow-2xl object-contain border-4 border-base-100 relative w-auto h-auto"
                priority
              />
            </div>
          </div>

          <div className="text-center lg:text-left">
            <div className="badge badge-primary badge-outline mb-4 font-semibold tracking-wide">
              EST. 2026
            </div>
            <h1 className="text-3xl lg:text-5xl font-black tracking-tight leading-tight">
              Curated
              <span className="relative inline-block mx-2 group">
                <span className="relative z-10 bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent italic transition-all duration-300 group-hover:tracking-wider">
                  Products
                </span>
                <span className="absolute bottom-1 left-0 w-full h-2 bg-primary/10 -rotate-1 group-hover:bg-primary/20 transition-all"></span>
              </span>
              <br />
              <span className="text-2xl lg:text-3xl font-light opacity-80">
                From Our Trusted Markets.
              </span>
            </h1>
            <p className="py-6 text-base-content/70 text-lg max-w-lg leading-relaxed">
              Discover authentic tech, accessories, and local items. Support the
              creators and find deals you won&apos;t see elsewhere.
            </p>
            <Link href="/categories">
              <button className="btn btn-primary btn-lg px-8 shadow-lg hover:scale-105 transition-all duration-300 group">
                <SparklesIcon className="size-5 group-hover:animate-spin" />
                Start Shopping
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* PRODUCTS SECTION */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter">
            <PackageIcon className="size-6 text-primary" />
            New Arrivals
          </h2>
          <div className="h-px flex-1 bg-base-content/10 mx-6 hidden sm:block"></div>
          <p className="text-sm font-medium opacity-50">
            {(products && products.length) || 0} items found
          </p>
        </div>

        {latestProducts.length === 0 ? (
          <div className="card bg-base-200 border-2 border-dashed border-base-300">
            <div className="card-body items-center text-center py-24">
              <PackageIcon className="size-20 text-base-content/5 mb-4" />
              <h3 className="text-xl font-bold opacity-60">
                Market is Restocking
              </h3>
              <p className="text-base-content/40 text-sm max-w-xs">
                Our team is currently adding new stock to the shop. Please check
                back in a few minutes!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {/* Displaying reversed and sliced products for true latest arrivals */}
            {latestProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* FOOTER CALL-TO-ACTION */}
      <div className="bg-primary/5 rounded-2xl p-8 text-center border border-primary/10">
        <h3 className="font-bold text-lg">
          Don&apos;t see what you&apos;re looking for?
        </h3>
        <p className="text-sm opacity-60 mb-4">
          New products are added daily by our verified creators.
        </p>
        <Link href="/categories">
          <button className="btn btn-sm btn-ghost btn-outline">
            Browse Categories
          </button>
        </Link>
      </div>
    </div>
  );
}