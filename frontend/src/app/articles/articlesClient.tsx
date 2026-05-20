"use client";

import {
  ArrowUpRightIcon,
  ClockIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import type { Article } from "./page";

export default function ArticlesClient({ articles }: { articles: Article[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Prepare the top 3 articles for the Hero Slider
  const featuredArticles = articles.slice(0, 3);

  /**
   * Logic to move to the next slide.
   * Wrapped in useCallback to provide a stable reference for useEffect.
   */
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) =>
      prev === featuredArticles.length - 1 ? 0 : prev + 1
    );
  }, [featuredArticles.length]);

  /**
   * Logic to move to the previous slide.
   */
  const prevSlide = () =>
    setCurrentIndex((prev) =>
      prev === 0 ? featuredArticles.length - 1 : prev - 1
    );

  /**
   * Auto-scroll Effect.
   * Runs every 5 seconds. Inclusion of 'nextSlide' in dependencies
   * is now safe due to useCallback.
   */
  useEffect(() => {
    if (featuredArticles.length <= 1) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 5000); // 5-second interval

    // Clear interval on unmount to prevent memory leaks and unexpected behavior
    return () => clearInterval(interval);
  }, [nextSlide, featuredArticles.length]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl overflow-x-hidden space-y-16">
      {/* 1. HERO SLIDER SECTION */}
      {featuredArticles.length > 0 && (
        <section className="relative group">
          <div className="flex items-center gap-2 mb-6">
            <span className="bg-primary size-2 rounded-full animate-pulse" />
            <h2 className="text-sm font-black uppercase tracking-[0.4em] opacity-70">
              Featured Editorial
            </h2>
          </div>

          <div className="relative overflow-hidden rounded-[3rem] bg-base-300 min-h-125 border border-base-content/5">
            {/* Slider Navigation Controls */}
            <button
              onClick={prevSlide}
              className="absolute left-6 top-1/2 z-20 btn btn-circle btn-primary opacity-0 group-hover:opacity-100 transition-all shadow-xl"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-6 top-1/2 z-20 btn btn-circle btn-primary opacity-0 group-hover:opacity-100 transition-all shadow-xl"
            >
              <ChevronRightIcon />
            </button>

            {/* Horizontal sliding container */}
            <div
              className="flex transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] h-full"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {featuredArticles.map((article) => (
                <div
                  key={article.id}
                  className="min-w-full relative flex flex-col justify-end p-8 lg:p-16 min-h-125"
                >
                  <Image
                    src={article.imageUrl || "/placeholder-blog.jpg"}
                    alt={article.title}
                    fill
                    className="object-cover opacity-40 -z-10"
                    priority
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-base-300 via-base-300/20 to-transparent -z-10" />
                  
                  <div className="max-w-2xl space-y-4">
                    <div className="flex gap-4 text-xs font-bold uppercase tracking-widest opacity-60">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="size-3" /> {article.readTime} Min Read
                      </span>
                      <span className="flex items-center gap-1">
                        <UserIcon className="size-3" /> {article.author?.name || "Author"}
                      </span>
                    </div>
                    <h1 className="text-4xl lg:text-6xl font-black tracking-tighter uppercase italic leading-none">
                      {article.title}
                    </h1>
                    <p className="text-lg opacity-70 line-clamp-2 font-medium">
                      {article.summary}
                    </p>
                    <Link
                      href={`/articles/${article.slug}`}
                      className="btn btn-primary rounded-full px-8 gap-2 w-fit"
                    >
                      Read Full Article <ArrowUpRightIcon className="size-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 2. THE LATEST ARTICLES GRID (FEED) */}
      <section className="space-y-10">
        <h2 className="text-5xl font-black tracking-tighter uppercase">
          Latest Stories
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="group flex flex-col space-y-4"
            >
              <div className="relative aspect-video rounded-4xl overflow-hidden bg-base-300 border border-base-content/5">
                <Image
                  src={article.imageUrl || "/placeholder-blog.jpg"}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-80"
                />
                <div className="absolute top-4 left-4 badge badge-primary font-bold">
                  {article.readTime} min
                </div>
              </div>
              <div className="px-2 space-y-2">
                <h3 className="text-2xl font-black tracking-tight group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                <p className="text-sm opacity-60 line-clamp-2">
                  {article.summary}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
