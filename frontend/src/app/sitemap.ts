import { MetadataRoute } from "next";

// Define the URL of your website
const URL = "https://prime-pick.com";

// Define interfaces for your GraphQL data
interface Article {
  slug: string;
  updatedAt?: string;
  createdAt?: string;
}

interface Product {
  id: string;
  updatedAt?: string;
  createdAt?: string;
}

interface Category {
  slug: string;
  updatedAt?: string;
  createdAt?: string;
}

interface GraphQLResponse {
  data: {
    getArticles: Article[];
    getProducts: Product[];
    getCategories: Category[];
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Initialize data arrays
  let articles: Article[] = [];
  let products: Product[] = [];
  let categories: Category[] = [];
  
  try {
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/graphql";
    
    // 1. Fetch all dynamic routes from your GraphQL Backend
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query { 
            getArticles { slug updatedAt createdAt }
            getProducts { id updatedAt createdAt }
            getCategories { slug updatedAt createdAt }
          }
        `,
      }),
      next: { revalidate: 3600 },
    });
    
    const { data }: GraphQLResponse = await response.json();
    
    // Assign data to arrays
    articles = data?.getArticles || [];
    products = data?.getProducts || [];
    categories = data?.getCategories || [];
  } catch (error) {
    console.error("Sitemap fetch error:", error);
  }

  // 2. Map articles to the Sitemap format
  const articleEntries = articles.map((article: Article) => ({
    url: `${URL}/articles/${article.slug}`,
    lastModified: new Date(article.updatedAt || article.createdAt || new Date()),
    priority: 0.7,
    changeFrequency: "weekly" as const,
  }));

  // Map products to the Sitemap format
  const productEntries = products.map((p) => ({
    url: `${URL}/products/${p.id}`,
    lastModified: new Date(p.updatedAt || p.createdAt || new Date()),
    priority: 0.8,
    changeFrequency: "daily" as const,
  }));

  // Map categories to the Sitemap format
  const categoryEntries = categories.map((c) => ({
    url: `${URL}/categories/${c.slug}`,
    lastModified: new Date(c.updatedAt || c.createdAt || new Date()),
    priority: 0.7,
    changeFrequency: "weekly" as const,
  }));

  // 3. Static routes of your store
  const staticRoutes = [
    {
      url: URL,
      lastModified: new Date(),
      priority: 1.0,
      changeFrequency: "daily" as const,
    },
    {
      url: `${URL}/products`,
      lastModified: new Date(),
      priority: 0.9,
      changeFrequency: "daily" as const,
    },
    {
      url: `${URL}/articles`,
      lastModified: new Date(),
      priority: 0.8,
      changeFrequency: "weekly" as const,
    },
    {
      url: `${URL}/categories`,
      lastModified: new Date(),
      priority: 0.8,
      changeFrequency: "weekly" as const,
    },
  ];

  // Combine all entries into the final sitemap
  return [...staticRoutes, ...articleEntries, ...productEntries, ...categoryEntries];
}