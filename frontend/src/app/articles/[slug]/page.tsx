import { GET_ARTICLE_BY_SLUG } from "@/graphql/articles";
import { getClient } from "@/lib/apollo-client";
import { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ClockIcon, CalendarIcon, UserIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Article } from "../page";
import DOMPurify from "isomorphic-dompurify";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

interface ArticleResponse {
  getArticleBySlug: Article & { content?: string };
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await getClient().query<ArticleResponse>({
    query: GET_ARTICLE_BY_SLUG,
    variables: { slug },
  });

  const article = data?.getArticleBySlug;
  if (!article) return { title: "Article Not Found" };

  return {
    title: `${article.title} | Prime Pick`,
    description: article.summary,
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = await params;

  const { data } = await getClient().query<ArticleResponse>({
    query: GET_ARTICLE_BY_SLUG,
    variables: { slug },
  });

  const article = data?.getArticleBySlug;

  if (!article) notFound();

  return (
    <article className="min-h-screen bg-base-100 pb-20">
      {/* --- HERO SECTION --- */}
      <header className="container mx-auto px-4 pt-8">
        <div className="relative w-full h-[55vh] lg:h-[65vh] rounded-[2.5rem] lg:rounded-[4rem] overflow-hidden shadow-2xl border border-base-content/5">
          <Image
            src={article.imageUrl || "/placeholder-blog.jpg"}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-1000 hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-end p-8 lg:p-20">
            <Link
              href="/articles"
              className="w-fit flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-8 hover:text-primary transition-colors"
            >
              <ArrowLeftIcon className="size-4" /> Back to Insights
            </Link>

            <div className="max-w-4xl space-y-6">
              <h1 className="text-4xl lg:text-7xl font-black tracking-tight text-white leading-none uppercase">
                {article.title}
              </h1>

              <div className="flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/20">
                  <UserIcon className="size-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    {article.author?.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/70">
                  <CalendarIcon className="size-4 opacity-60" />
                  {new Date(article.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/70">
                  <ClockIcon className="size-4 opacity-60" />
                  {article.readTime} min read
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* --- CONTENT LAYOUT --- */}
      <main className="container mx-auto px-6 max-w-4xl mt-20">
        {/* Modern Abstract Card */}
        <div className="relative p-10 lg:p-14 rounded-[3rem] bg-base-200/50 border border-base-content/5 mb-24 overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
          <p className="text-2xl lg:text-4xl font-semibold opacity-90 leading-tight text-base-content italic tracking-tight">
            &ldquo;{article.summary}&rdquo;
          </p>
        </div>

        {/* Organized Body Content - Using DOMPurify to safely render HTML content */}
        {/* Added whitespace-pre-line to ensure text breaks and spacing are respected */}
        <div
          className="prose prose-xl prose-invert max-w-none 
          whitespace-pre-line
          prose-p:text-base-content/80 prose-p:leading-[1.8] prose-p:mb-10
          prose-headings:text-base-content prose-headings:font-black prose-headings:uppercase prose-headings:mt-16 prose-headings:mb-8
          prose-strong:text-primary prose-strong:font-black
          prose-img:rounded-[2rem] prose-img:shadow-2xl prose-img:my-16
          prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-4 prose-blockquote:rounded-r-2xl"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(article.content || ""),
          }}
        />

        {/* --- FOOTER SECTION --- */}
        <footer className="mt-10 pt-16 border-t border-base-content/10">
          <div className="flex flex-col md:flex-row items-center justify-between bg-linear-to-br from-base-200 to-base-300 p-10 lg:p-14 rounded-[4rem] border border-base-content/5 shadow-inner">
            <div className="flex items-center gap-6">
              <div className="size-15 rounded-3xl bg-linear-to-tr from-primary to-secondary p-1 rotate-3">
                <div className="bg-base-200 size-full rounded-[1.2rem] flex items-center justify-center overflow-hidden -rotate-3">
                  <Image
                    src={`https://ui-avatars.com/api/?name=${article.author?.name || "A"}&background=0D0D0D&color=fff`}
                    alt="Author"
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2">
                  Written By
                </p>
                <h4 className="text-3xl font-black uppercase italic tracking-tighter text-base-content">
                  {article.author?.name}
                </h4>
                <p className="text-xs opacity-50 font-bold uppercase mt-1">
                  Lead Developer @ Prime-Pick
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-10 md:mt-0">
              <Link
                href="//localhost:3000"
                className="btn btn-primary btn-lg rounded-full px-12 shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all text-xs font-black uppercase tracking-widest"
              >
                Explore Shop
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </article>
  );
}
