import { MetadataRoute } from "next";

/**
 * Professional robots.txt configuration for Prime Pick Store.
 * This file helps search engines understand where to crawl and what to ignore.
 */
export default function robots(): MetadataRoute.Robots {
  // Replace with your actual production domain when you go live
  const baseUrl = "https://prime-pick.com";

  return {
    rules: [
      {
        userAgent: "*", // Applies to all search engine bots (Google, Bing, etc.)
        allow: "/",     // Allow crawling of the entire public site
        disallow: [
          "/dashboard/",    // Private admin area
          "/admin/",        // Legacy or alternative admin paths
          "/api/",          // Internal API routes
          "/login",         // Auth pages don't need indexing
          "/register",      // Auth pages don't need indexing
          "/checkout",      // Private user checkout sessions
          "/cart",          // Temporary user-specific data
        ],
      },
      {
        userAgent: "GPTBot", // Specific rule for OpenAI's crawler
        allow: ["/articles/"], // You might want AI to learn from your blog but not your products
        disallow: ["/dashboard/"],
      },
    ],
    // Points search engines to your dynamic sitemap for faster indexing
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}