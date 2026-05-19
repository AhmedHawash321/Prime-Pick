"use client";

import { useQuery, useMutation } from "@apollo/client/react";
import { GET_ARTICLES, DELETE_ARTICLE, TOGGLE_ARTICLE_STATUS } from "@/graphql/articles"; 
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import { 
  PlusIcon, 
  BookOpenIcon, 
  Trash2Icon, 
  Edit3Icon, 
  ClockIcon, 
  EyeIcon, 
  EyeOffIcon 
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import Image from "next/image";

// Interface for Article data
interface Article {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  isPublished: boolean;
  readTime: number;
  summary: string;
}

interface ArticlesData {
  getArticles: Article[];
}

export default function DashboardArticlesPage() {
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Fetch articles with cache-and-network policy for fresh data
  const { data, loading, refetch } = useQuery<ArticlesData>(GET_ARTICLES, {
    variables: { search: "" },
    fetchPolicy: "cache-and-network",
  });

  // Delete Mutation
  const [deleteArticle, { loading: isDeleting }] = useMutation(DELETE_ARTICLE, {
    onCompleted: () => {
      toast.success("Article removed successfully");
      refetch();
      (document.getElementById("delete_modal") as HTMLDialogElement)?.close();
    },
    onError: (error) => toast.error("Delete failed: " + error.message),
  });

  // Toggle Publish Status Mutation
  const [toggleStatus] = useMutation(TOGGLE_ARTICLE_STATUS);

  const openDeleteModal = (id: string) => {
    setSelectedArticleId(id);
    (document.getElementById("delete_modal") as HTMLDialogElement)?.showModal();
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await toggleStatus({ 
        variables: { id, isPublished: !currentStatus },
        refetchQueries: [{ query: GET_ARTICLES, variables: { search: "" } }]
      });
      toast.success(currentStatus ? "Moved to Drafts" : "Article Published");
    } catch {
      toast.error("Failed to update status");
    }
  };

  if (loading) return <LoadingSpinner />;

  const articles = data?.getArticles || [];

  return (
    <div className="space-y-8">
      {/* Header Section: Connected to /create path */}
      <div className="flex justify-between items-end bg-base-200/50 p-6 rounded-4xl border border-base-content/5">
        <div>
          <h1 className="text-2xl font-bold">Editorial Content</h1>
          <p className="text-[10px] font-bold opacity-50 uppercase tracking-[0.2em] mt-2">
            Manage your technical insights ({articles.length})
          </p>
        </div>
        <Link href="/dashboard/articles/create" className="btn btn-primary btn-sm gap-1 rounded-xl">
          <PlusIcon className="size-4" /> New Article
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-base-200/30 rounded-[3rem] border-2 border-dashed border-base-content/10">
          <BookOpenIcon className="size-16 mx-auto opacity-10 mb-4" />
          <h3 className="text-xl font-black opacity-30 uppercase tracking-widest">No Stories Written</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {articles.map((article) => (
            <div 
              key={article.id} 
              className="group relative aspect-4/5 rounded-[2.5rem] overflow-hidden bg-base-300 border border-base-content/5 transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] hover:-translate-y-2"
            >
              {/* Cover Image */}
              {article.imageUrl ? (
                <Image 
                  src={article.imageUrl} 
                  alt={article.title} 
                  fill 
                  className="object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-base-200">
                  <BookOpenIcon className="size-20 opacity-5" />
                </div>
              )}

              {/* Status Badge (Top Left) */}
              <button 
                onClick={() => handleToggle(article.id, article.isPublished)}
                className={`absolute top-6 left-6 z-30 badge border-none font-black text-[9px] uppercase tracking-widest p-3 shadow-xl transition-all hover:scale-110 ${
                  article.isPublished ? "badge-success text-success-content" : "badge-ghost bg-white/10 backdrop-blur-md"
                }`}
              >
                {article.isPublished ? <EyeIcon className="size-3 mr-1" /> : <EyeOffIcon className="size-3 mr-1" />}
                {article.isPublished ? "Live" : "Draft"}
              </button>

              {/* Read Time (Top Right) */}
              <div className="absolute top-6 right-6 z-30 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/5 text-[9px] font-black uppercase flex items-center gap-1">
                <ClockIcon className="size-3" /> {article.readTime} min
              </div>

              {/* Glassmorphism Actions Overlay (Bottom) */}
              <div className="absolute inset-x-4 bottom-4 p-5 rounded-4xl bg-base-300/60 backdrop-blur-md border border-white/5 flex justify-between items-center z-20 transition-all duration-500 group-hover:bg-base-300/90 group-hover:bottom-6">
                <div className="max-w-[60%]">
                  <h3 className="font-black uppercase tracking-tighter text-lg truncate leading-none mb-1">
                    {article.title}
                  </h3>
                  <p className="text-[9px] opacity-50 font-mono truncate uppercase tracking-widest italic">{article.slug}</p>
                </div>
                
                {/* Actions: Connected to /edit/[id] path */}
                <div className="flex gap-2">
                  <Link 
                    href={`/dashboard/articles/edit/${article.id}`}
                    className="btn btn-square btn-circle btn-sm bg-primary/20 border-none hover:bg-primary text-primary hover:text-primary-content transition-all duration-300"
                  >
                    <Edit3Icon className="size-4" />
                  </Link>
                  <button 
                    onClick={() => openDeleteModal(article.id)} 
                    className="btn btn-square btn-circle btn-sm bg-error/20 border-none hover:bg-error text-error hover:text-error-content transition-all duration-300"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              </div>

              {/* Dark Gradient for Text Legibility */}
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-80" />
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <dialog id="delete_modal" className="modal modal-bottom sm:modal-middle backdrop-blur-md">
        <div className="modal-box border-t-8 border-error rounded-[3rem] bg-base-200 p-10 shadow-2xl text-center">
            <div className="bg-error/10 size-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2Icon className="size-10 text-error" />
            </div>
            <h3 className="font-black text-2xl uppercase text-error tracking-tighter">Discard Story?</h3>
            <p className="py-6 opacity-70 font-medium leading-relaxed">
              This will permanently delete your article from the platform. Readers will no longer be able to access this content.
            </p>
            <div className="modal-action gap-4">
              <form method="dialog" className="flex gap-4 w-full">
                <button className="btn btn-ghost flex-1 font-bold rounded-2xl">Cancel</button>
                <button 
                  type="button" 
                  onClick={() => selectedArticleId && deleteArticle({ variables: { id: selectedArticleId } })}
                  className="btn btn-error flex-1 font-black rounded-2xl shadow-lg shadow-error/20"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </form>
            </div>
        </div>
      </dialog>
    </div>
  );
}