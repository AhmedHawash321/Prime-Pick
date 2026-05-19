"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "@clerk/nextjs"; // Added to fetch getToken
import { GET_ARTICLE_BY_ID, UPDATE_ARTICLE, DELETE_ARTICLE, GET_ARTICLES } from "@/graphql/articles";
import { useState, useEffect } from "react"; 
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeftIcon, TrashIcon, LayoutIcon, ImageIcon, SaveIcon, ClockIcon, UploadIcon, LinkIcon } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import Image from "next/image";
import { UploadButton } from "@/utils/uploadthing";

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  readTime: number;
  isPublished: boolean;
}

interface ArticleResponse {
  getArticleById: Article;
}

export default function EditArticlePage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  // Fetch getToken to authorize the UploadThing request
  const { getToken } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    content: "",
    imageUrl: "",
    readTime: 5,
  });

  const [isSynced, setIsSynced] = useState(false);

  // 1. Fetch Data
  const { data, loading: queryLoading, error } = useQuery<ArticleResponse>(GET_ARTICLE_BY_ID, {
    variables: { id },
    fetchPolicy: "network-only",
  });

  const article = data?.getArticleById;

  // 2. Safe Sync Logic: Update local state once the article data is loaded
  useEffect(() => {
    if (article && !isSynced) {
      const timer = setTimeout(() => {
        setFormData({
          title: article.title || "",
          summary: article.summary || "",
          content: article.content || "",
          imageUrl: article.imageUrl || "",
          readTime: article.readTime || 5,
        });
        setIsSynced(true);
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [article, isSynced]);

  // 3. Update Mutation
  const [updateArticle, { loading: mutationLoading }] = useMutation(UPDATE_ARTICLE, {
    onCompleted: () => {
      toast.success("Article updated!");
      router.push("/dashboard/articles");
    },
    onError: (err) => toast.error(err.message),
    refetchQueries: [{ query: GET_ARTICLES, variables: { search: "" } }],
  });

  // 4. Delete Mutation
  const [deleteArticle] = useMutation(DELETE_ARTICLE, {
    onCompleted: () => {
      toast.success("Article deleted permanently");
      router.push("/dashboard/articles");
    },
    onError: (err) => toast.error(`Delete failed: ${err.message}`),
    refetchQueries: [{ query: GET_ARTICLES, variables: { search: "" } }],
  });

  const handleDelete = async () => {
    const doubleCheck = confirm("Are you sure? This action cannot be undone.");
    if (doubleCheck) {
      await deleteArticle({ variables: { id } });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      toast.error("An image is required.");
      return;
    }
    await updateArticle({ variables: { id, input: formData } });
  };

  if (queryLoading || (!isSynced && article)) return <LoadingSpinner />;
  if (error) return <div className="p-10 text-center text-error">Error: {error.message}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/articles" className="btn btn-ghost btn-sm gap-2">
            <ArrowLeftIcon className="size-4" /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Article</h1>
            <p className="text-sm opacity-60">Update your content and settings</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Fields - Left */}
        <div className="lg:col-span-8 space-y-6">
          <div className="form-control">
            <label className="label text-xs font-black uppercase opacity-60">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input input-bordered input-lg text-2xl font-black"
              required
            />
          </div>

          <div className="form-control">
            <label className="label text-xs font-black uppercase opacity-60">Summary</label>
            <input
              type="text"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className="input input-bordered"
              required
            />
          </div>

          <div className="form-control">
            <label className="label text-xs font-black uppercase opacity-60">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="textarea textarea-bordered min-h-100 font-mono"
              required
            />
          </div>
        </div>

        {/* Sidebar - Right */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card bg-base-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="size-4 text-primary" />
              <h3 className="font-bold text-sm uppercase tracking-widest">Featured Image</h3>
            </div>
            
            {/* Image Preview */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-base-300 mb-4 border border-white/5">
              {formData.imageUrl ? (
                <Image src={formData.imageUrl} alt={formData.title} fill className="object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full opacity-30">No Image</div>
              )}
            </div>

            <div className="divider text-[10px] opacity-40 uppercase font-bold tracking-widest">Update Photo</div>

            {/* Method A: UploadThing Integration */}
            <div className="space-y-2 mb-4">
              <label className="text-[11px] font-bold opacity-60 uppercase flex items-center gap-1">
                <UploadIcon className="size-3" /> Option A: Upload
              </label>
              <UploadButton
                endpoint="productImage"
                headers={async () => {
                  const token = await getToken();
                  return { Authorization: `Bearer ${token}` };
                }}
                onClientUploadComplete={(res) => {
                  if (res && res[0]) {
                    setFormData(prev => ({ ...prev, imageUrl: res[0].url }));
                    toast.success("Image uploaded!");
                  }
                }}
                onUploadError={(error: Error) => {
                  toast.error(`Upload Error: ${error.message}`);
                }}
                appearance={{
                  button: "btn btn-sm btn-primary w-full",
                  allowedContent: "hidden" 
                }}
              />
            </div>

            {/* Method B: Manual Image URL */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold opacity-60 uppercase flex items-center gap-1">
                <LinkIcon className="size-3" /> Option B: External URL
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
                className="input input-bordered input-sm w-full text-xs"
              />
            </div>
          </div>

          <div className="card bg-base-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <LayoutIcon className="size-4 text-primary" />
              <h3 className="font-bold text-sm uppercase tracking-widest">Meta Settings</h3>
            </div>
            <div className="form-control">
              <label className="label text-xs opacity-60">Read Time (minutes)</label>
              <div className="flex items-center gap-2">
                <ClockIcon className="size-4 opacity-40" />
                <input
                  type="number"
                  value={formData.readTime}
                  onChange={(e) => setFormData({ ...formData, readTime: parseInt(e.target.value) || 5 })}
                  className="input input-bordered w-24"
                  min="1"
                  max="60"
                />
                <span className="text-xs opacity-60">minutes</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button 
              type="submit" 
              disabled={mutationLoading} 
              className="btn btn-primary flex-1 rounded-2xl h-14 shadow-[0_10px_30px_rgba(var(--p),0.2)] font-black uppercase tracking-widest gap-2"
            >
              {mutationLoading ? <span className="loading loading-spinner loading-sm" /> : <SaveIcon className="size-4" />}
              {mutationLoading ? "Saving..." : "Save Changes"}
            </button>
            <button 
              type="button" 
              onClick={handleDelete} 
              className="btn btn-error btn-outline rounded-2xl px-6 h-14 hover:bg-error hover:text-white transition-all"
            >
              <TrashIcon className="size-5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}