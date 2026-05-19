"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { CREATE_ARTICLE, GET_ARTICLES } from "@/graphql/articles";
import LoadingSpinner from "@/components/LoadingSpinner";
import { 
  ArrowLeftIcon, 
  ImageIcon, 
  PlusIcon, 
  ClockIcon, 
  LayoutIcon,
  UploadIcon,
  LinkIcon
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { UploadButton } from "@/utils/uploadthing";

export default function CreateArticlePage() {
  const router = useRouter();
  // Fetch getToken to authorize the UploadThing request
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    content: "",
    imageUrl: "",
    readTime: 5,
  });

  const [createArticle, { loading }] = useMutation(CREATE_ARTICLE, {
    onCompleted: () => {
      toast.success("Article published successfully!");
      router.push("/dashboard/articles");
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
    refetchQueries: [{ query: GET_ARTICLES, variables: { search: "" } }],
  });

  if (!isLoaded || !isSignedIn) return <LoadingSpinner />;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ 
      ...formData, 
      [name]: name === "readTime" ? parseInt(value) || 0 : value 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.imageUrl) {
      toast.error("A cover image is required.");
      return;
    }
    
    // Generate slug automatically
    const slug = formData.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    try {
      await createArticle({
        variables: {
          input: {
            ...formData,
            slug,
            isPublished: true, // Default to true for this simplified flow
          },
        },
      });
    } catch (err) {
      console.error("Mutation Error:", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Background Soul Glow */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] -z-10" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/articles" className="btn btn-ghost btn-xs gap-2 mb-2 opacity-50 hover:opacity-100 transition-opacity">
            <ArrowLeftIcon className="size-3" /> Back to Blog
          </Link>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">Craft New Story</h1>
          <p className="text-sm opacity-50 font-medium">Share your technical insights with the world.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Editor (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="card bg-base-300/40 backdrop-blur-md border border-white/5 shadow-2xl">
            <div className="card-body p-6 space-y-6">
              
              <div className="form-control w-full">
                <label className="label uppercase text-[10px] font-black tracking-[0.2em] opacity-40">Article Title</label>
                <input 
                  type="text" 
                  name="title"
                  placeholder="e.g., Be The Owner of your Decision"
                  className="input input-ghost text-2xl font-bold border-b border-white/5 focus:border-primary transition-all px-0 rounded-none focus:outline-none"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-control w-full">
                <label className="label uppercase text-[10px] font-black tracking-[0.2em] opacity-40">Summary</label>
                <textarea 
                  name="summary"
                  placeholder="A brief hook for your readers..."
                  className="textarea textarea-ghost min-h-20 px-0 focus:outline-none border-b border-white/5 focus:border-primary transition-all resize-none font-medium text-white/70"
                  value={formData.summary}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-control w-full">
                <label className="label uppercase text-[10px] font-black tracking-[0.2em] opacity-40">Content (Markdown supported)</label>
                <textarea 
                  name="content"
                  placeholder="Start your deep dive here..."
                  className="textarea textarea-bordered min-h-100 bg-base-200/50 border-white/5 focus:border-primary/30 transition-all font-mono leading-relaxed"
                  value={formData.content}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Preview (4 Columns) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Metadata Card */}
          <div className="card bg-base-300/40 border border-white/5 shadow-xl">
            <div className="card-body p-6 space-y-4">
              <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                <LayoutIcon className="size-4" /> Publication Settings
              </h2>
              
              <div className="form-control">
                <label className="label text-[10px] font-bold opacity-40 uppercase">Read Time (Min)</label>
                <div className="relative">
                  <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-30" />
                  <input 
                    type="number" 
                    name="readTime"
                    className="input input-bordered w-full pl-10 bg-base-200/50 border-white/5"
                    value={formData.readTime}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Cover Image Selection */}
              <div className="divider text-[10px] opacity-40 uppercase font-bold tracking-widest">Cover Image</div>

              {/* Method A: UploadThing */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold opacity-40 uppercase flex items-center gap-1">
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
                      toast.success("Cover image uploaded!");
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

              {/* Method B: Manual URL */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold opacity-40 uppercase flex items-center gap-1">
                  <LinkIcon className="size-3" /> Option B: Image URL
                </label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-30" />
                  <input 
                    type="url" 
                    name="imageUrl"
                    placeholder="https://..."
                    className="input input-bordered w-full pl-10 bg-base-200/50 border-white/5 text-xs"
                    value={formData.imageUrl}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mini Preview Card */}
          <div className="card bg-[#050505] border border-white/5 overflow-hidden group">
            <div className="relative aspect-video bg-neutral-900 flex items-center justify-center">
              {formData.imageUrl ? (
                <Image src={formData.imageUrl} alt="Preview" fill className="object-cover opacity-60" />
              ) : (
                <div className="flex flex-col items-center opacity-20">
                  <ImageIcon className="size-8 mb-1" />
                  <span className="text-[10px] uppercase font-bold tracking-tighter">Preview Image</span>
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="badge badge-primary badge-xs text-[9px] font-black">{formData.readTime} MIN READ</div>
              <h3 className="font-bold text-sm uppercase italic line-clamp-1">{formData.title || "Untitled Masterpiece"}</h3>
              <p className="text-[10px] opacity-40 line-clamp-2">{formData.summary || "Your summary will appear here..."}</p>
            </div>
          </div>

          {/* Action Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary btn-block rounded-2xl h-16 shadow-[0_10px_30px_rgba(var(--p),0.2)] group"
          >
            {loading ? (
              <span className="loading loading-spinner"></span>
            ) : (
              <>
                <span className="font-black uppercase tracking-widest">Publish Article</span>
                <PlusIcon className="size-5 group-hover:rotate-90 transition-transform" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}