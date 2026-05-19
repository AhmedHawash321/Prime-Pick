"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { CREATE_PRODUCT, GET_MY_PRODUCTS } from "@/graphql/products";
import { GET_CATEGORIES } from "@/graphql/categories";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeftIcon, ImageIcon, PlusIcon, LinkIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { UploadButton } from "@/utils/uploadthing";

// ✅ Interface for Category
interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
}

// ✅ Interface for Categories API response
interface CategoriesData {
  getCategories: Category[];
}

export default function CreateProductPage() {
  const router = useRouter();
  // Added getToken here to fetch the session token
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  
  // ✅ Fetch categories for the dropdown selector
  const { data: categoriesData } = useQuery<CategoriesData>(GET_CATEGORIES);

  const [createProduct, { loading }] = useMutation(CREATE_PRODUCT, {
    onCompleted: () => {
      toast.success("Product created successfully!");
      router.push("/dashboard/products");
    },
    onError: (err: Error) => { 
      toast.error(`Error: ${err.message}`);
    },
    refetchQueries: [{ query: GET_MY_PRODUCTS, variables: { userId } }],
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    stock: "",
    imageUrl: "", // Handled by both UploadThing and manual input
    categoryId: "",
  });

  if (!isLoaded || !isSignedIn) return <LoadingSpinner />;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.imageUrl) {
      toast.error("Please provide a product image (Upload or URL).");
      return;
    }

    try {
      await createProduct({
        variables: {
          input: {
            title: formData.title,
            description: formData.description,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock),
            imageUrl: formData.imageUrl,
            categoryId: formData.categoryId,
          },
        },
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/products" className="btn btn-ghost btn-sm gap-1 mb-2">
            <ArrowLeftIcon className="size-4" /> Back to Products
          </Link>
          <h1 className="text-2xl font-bold">Create New Product</h1>
          <p className="text-sm opacity-60">Add a new item to your inventory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image Preview & Methods */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card bg-base-300 shadow-md">
            <div className="card-body p-4 space-y-4">
              <h2 className="card-title text-base flex items-center gap-2">
                <ImageIcon className="size-5" /> Product Image
              </h2>
              
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-base-200 flex items-center justify-center border-2 border-dashed border-base-content/10">
                {formData.imageUrl ? (
                  <Image 
                    src={formData.imageUrl} 
                    alt="Preview" 
                    fill
                    className="object-cover" 
                    unoptimized={formData.imageUrl.startsWith("http") && !formData.imageUrl.includes("utfs.io")}
                  />
                ) : (
                  <div className="flex flex-col items-center opacity-30 text-center p-4">
                    <ImageIcon className="size-12 mb-2" />
                    <span className="text-xs">No image provided yet</span>
                  </div>
                )}
              </div>

              <div className="divider text-[10px] opacity-40 uppercase font-bold tracking-widest">Choose Method</div>

              {/* Method 1: Upload from Device */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold opacity-60 uppercase flex items-center gap-1">
                  <UploadIcon className="size-3" /> Option A: Upload File
                </label>
                <UploadButton
                  endpoint="productImage"
                  // ✅ FIXED: Added headers to send the Clerk token to the backend
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

              {/* Method 2: External URL */}
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

              <p className="text-[10px] opacity-40 text-center mt-2 italic">
                * Uploaded files take precedence if active
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Main Form */}
        <div className="lg:col-span-2 card bg-base-300 shadow-xl">
          <div className="card-body p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control md:col-span-2">
                <label className="label text-sm font-bold opacity-60 uppercase tracking-wider">Category</label>
                <select 
                  name="categoryId" 
                  value={formData.categoryId} 
                  onChange={handleChange} 
                  className="select select-bordered w-full font-medium"
                  required
                >
                  <option value="">Select Category</option>
                  {categoriesData?.getCategories?.map((category: Category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control md:col-span-2">
                <label className="label text-sm font-bold opacity-60 uppercase tracking-wider">Product Title</label>
                <input 
                  type="text" 
                  name="title" 
                  placeholder="e.g. Modern Leather Sofa"
                  value={formData.title} 
                  onChange={handleChange} 
                  className="input input-bordered font-medium" 
                  required 
                />
              </div>

              <div className="form-control">
                <label className="label text-sm font-bold opacity-60 uppercase tracking-wider">Price (EGP)</label>
                <input 
                  type="number" 
                  name="price" 
                  value={formData.price} 
                  onChange={handleChange} 
                  className="input input-bordered font-medium" 
                  step="0.01" 
                  required 
                />
              </div>

              <div className="form-control">
                <label className="label text-sm font-bold opacity-60 uppercase tracking-wider">Stock Quantity</label>
                <input 
                  type="number" 
                  name="stock" 
                  value={formData.stock} 
                  onChange={handleChange} 
                  className="input input-bordered font-medium" 
                  required 
                />
              </div>

              <div className="form-control md:col-span-2">
                <label className="label text-sm font-bold opacity-60 uppercase tracking-wider">Description</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  className="textarea textarea-bordered h-40 font-medium leading-relaxed" 
                  placeholder="Describe the product details, materials, and care instructions..."
                  required 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-base-content/5">
              <Link href="/dashboard/products" className="btn btn-ghost">
                Cancel
              </Link>
              <button 
                type="submit" 
                className={`btn btn-primary gap-2 min-w-40 ${loading ? "loading" : ""}`} 
                disabled={loading || !formData.imageUrl}
              >
                {!loading && <PlusIcon className="size-4" />}
                {loading ? "Publishing..." : "Publish Product"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}