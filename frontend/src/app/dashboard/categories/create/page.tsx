"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { CREATE_CATEGORY, GET_CATEGORIES } from "@/graphql/categories"; 
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeftIcon, ImageIcon, PlusIcon, LinkIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { UploadButton } from "@/utils/uploadthing";

export default function CreateCategoryPage() {
  const router = useRouter();
  // Fetch getToken to authorize the UploadThing request
  const { isLoaded, isSignedIn, getToken } = useAuth();
  
  const [createCategory, { loading }] = useMutation(CREATE_CATEGORY, {
    refetchQueries: [
      { query: GET_CATEGORIES, variables: { search: undefined } },
      { query: GET_CATEGORIES },
    ],
    onCompleted: () => {
      toast.success("Category created successfully!");
      router.push("/dashboard/categories");
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    imageUrl: "",
  });

  if (!isLoaded || !isSignedIn) return <LoadingSpinner />;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.imageUrl) {
      toast.error("Please provide a category image.");
      return;
    }

    // Generate slug automatically to match Schema/Validation requirements
    const generatedSlug = formData.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") 
      .replace(/[\s_-]+/g, "-") 
      .replace(/^-+|-+$/g, "");

    try {
      await createCategory({
        variables: {
          input: {
            name: formData.name,
            imageUrl: formData.imageUrl,
            slug: generatedSlug,
          },
        },
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/categories" className="btn btn-ghost btn-sm gap-1 mb-2">
          <ArrowLeftIcon className="size-4" /> Back to Categories
        </Link>
        <h1 className="text-2xl font-bold">Create New Category</h1>
        <p className="text-sm opacity-60">Organize your products with a new category</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Image Preview & Upload Methods */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card bg-base-300 shadow-md">
            <div className="card-body p-4 space-y-4">
              <h2 className="card-title text-base flex items-center gap-2">
                <ImageIcon className="size-5" /> Category Image
              </h2>
              
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-base-200 flex items-center justify-center border-2 border-dashed border-base-content/10">
                {formData.imageUrl ? (
                  <Image 
                    src={formData.imageUrl} 
                    alt="Preview" 
                    fill 
                    className="object-cover" 
                  />
                ) : (
                  <div className="flex flex-col items-center opacity-30 text-center p-4">
                    <ImageIcon className="size-12 mb-2" />
                    <span className="text-xs">No image provided yet</span>
                  </div>
                )}
              </div>

              <div className="divider text-[10px] opacity-40 uppercase font-bold tracking-widest">Choose Method</div>

              {/* Method 1: UploadThing */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold opacity-60 uppercase flex items-center gap-1">
                  <UploadIcon className="size-3" /> Option A: Upload File
                </label>
                <UploadButton
                  endpoint="productImage"
                  headers={async () => {
                    const token = await getToken();
                    return {
                      Authorization: `Bearer ${token}`,
                    };
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

              {/* Method 2: Manual URL */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold opacity-60 uppercase flex items-center gap-1">
                  <LinkIcon className="size-3" /> Option B: External URL
                </label>
                <input 
                  type="url" 
                  name="imageUrl" 
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl} 
                  onChange={handleChange} 
                  className="input input-bordered input-sm w-full font-medium" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Main Form Data */}
        <div className="lg:col-span-2 card bg-base-300 shadow-xl">
          <div className="card-body p-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="form-control">
                <label className="label text-sm font-bold opacity-60 uppercase tracking-wider">Category Name</label>
                <input 
                  type="text" 
                  name="name" 
                  placeholder="e.g. Smart Electronics"
                  value={formData.name} 
                  onChange={handleChange} 
                  className="input input-bordered font-medium" 
                  required 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-base-content/5">
              <Link href="/dashboard/categories" className="btn btn-ghost">
                Cancel
              </Link>
              <button 
                type="submit" 
                className={`btn btn-primary gap-2 min-w-40 ${loading ? "loading" : ""}`} 
                disabled={loading || !formData.imageUrl}
              >
                {!loading && <PlusIcon className="size-4" />}
                {loading ? "Creating..." : "Create Category"}
              </button>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}