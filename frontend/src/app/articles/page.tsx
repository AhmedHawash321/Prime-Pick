import { GET_ARTICLES } from "@/graphql/articles";
import { getClient } from "@/lib/apollo-client";
import ArticlesClient from "./articlesClient"; 
import { Metadata } from "next";

// Exported Central Interface to be used by the Client Component
export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  imageUrl?: string; // Optional to handle potential nulls from DB
  readTime: number;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
  };
}

interface ArticlesData {
  getArticles: Article[];
}

// SEO Metadata for the Articles Listing page
export const metadata: Metadata = {
  title: "Insights & Articles | Prime Pick Store",
  description: "Explore deep dives into Web3, Rust development, and the latest tech trends at Prime Pick Store.",
  openGraph: {
    title: "Prime Pick Store Blog",
    description: "Technical insights and product updates.",
  },
};

// Set Incremental Static Regeneration (ISR) to 1 hour
export const revalidate = 3600; 

export default async function ArticlesPage() {
  // Fetch articles from GraphQL
  const { data } = await getClient().query<ArticlesData>({
    query: GET_ARTICLES,
    variables: { search: "" },
  });

  const articles = data?.getArticles || [];

  // JSON-LD Schema Markup for better SEO indexing (Rich Snippets)
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Prime Pick Store Articles",
    mainEntity: articles.map((article) => ({
      "@type": "BlogPosting",
      headline: article.title,
      image: article.imageUrl,
      author: article.author ? { "@type": "Person", name: article.author.name } : undefined,
      datePublished: article.createdAt,
    })),
  };

  return (
    <>
      {/* Injecting Schema.org script into the head */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />
      <ArticlesClient articles={articles} />
    </>
  );
}