"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "@clerk/nextjs";
import { useState, use } from "react";
import { 
  GET_CATEGORY_BY_SLUG, 
  UPDATE_CATEGORY, 
  DELETE_CATEGORY, 
  GET_CATEGORIES 
} from "@/graphql/categories";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeftIcon, Trash2Icon, SaveIcon, ImageIcon, UploadIcon, LinkIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { UploadButton } from "@/utils/uploadthing";

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
}

interface CategoryResponse {
  getCategoryBySlug: Category;
}

// --- 1. Internal Form Component ---
function EditCategoryForm({ category, id }: { category: Category, id: string }) {
  const router = useRouter();
  // Fetch getToken to authorize the UploadThing request
  const { getToken } = useAuth();

  const [formData, setFormData] = useState({
    name: category.name || "",
    imageUrl: category.imageUrl || "",
  });

  const [updateCategory, { loading: isUpdating }] = useMutation(UPDATE_CATEGORY, {
    onCompleted: () => {
      toast.success("Category updated!");
      router.push("/dashboard/categories");
    },
    onError: (err) => toast.error(err.message),
    refetchQueries: [{ query: GET_CATEGORIES }],
  });

  const [deleteCategory, { loading: isDeleting }] = useMutation(DELETE_CATEGORY, {
    onCompleted: () => {
      toast.success("Category deleted");
      router.push("/dashboard/categories");
    },
    refetchQueries: [{ query: GET_CATEGORIES }],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.imageUrl) {
      toast.error("Category image is required.");
      return;
    }

    await updateCategory({
      variables: { 
        id, 
        input: {
          name: formData.name,
          imageUrl: formData.imageUrl
        } 
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8 flex justify-between items-center bg-base-300 p-4 rounded-xl shadow-sm border border-base-content/5">
        <Link href="/dashboard/categories" className="btn btn-ghost btn-sm gap-2 font-bold opacity-70 hover:opacity-100 transition-all">
          <ArrowLeftIcon className="size-4" /> Back to Categories
        </Link>
        <button 
          onClick={() => (document.getElementById('delete_modal') as HTMLDialogElement).showModal()}
          className="btn btn-error btn-outline btn-sm gap-2 font-bold"
          type="button"
        >
          <Trash2Icon className="size-4" /> Delete Category
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Preview & Upload Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card bg-base-300 shadow-xl border border-base-content/5">
            <div className="card-body p-4 space-y-4">
              <h3 className="text-xs uppercase font-black opacity-40 mb-2 tracking-widest text-center flex items-center justify-center gap-2">
                <ImageIcon className="size-4" /> Category Image
              </h3>
              
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-base-200 border border-base-content/10 shadow-inner">
                {formData.imageUrl ? (
                  <Image src={formData.imageUrl} alt="Preview" fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full opacity-20 text-xs">No Image</div>
                )}
              </div>

              <div className="divider text-[10px] opacity-40 uppercase font-bold tracking-widest">Update Image</div>

              {/* Method A: UploadThing */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold opacity-60 uppercase flex items-center gap-1">
                  <UploadIcon className="size-3" /> Option A: Upload New
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

              {/* Method B: Manual URL */}
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

        {/* Form Card */}
        <div className="lg:col-span-2">
          <div className="card bg-base-200 shadow-xl border border-base-content/5">
            <div className="card-body p-6 md:p-8">
              <h1 className="card-title text-2xl mb-6 font-black text-primary">Edit Category</h1>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="form-control">
                  <label className="label text-xs font-black uppercase opacity-60">Category Name</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    className="input input-bordered focus:input-primary font-bold" 
                    required 
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button type="submit" className="btn btn-primary flex-1 font-black gap-2" disabled={isUpdating}>
                    {isUpdating ? <span className="loading loading-spinner loading-xs"></span> : <SaveIcon className="size-4" />}
                    Save Changes
                  </button>
                  <Link href="/dashboard/categories" className="btn btn-ghost flex-1 font-bold">Cancel</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <dialog id="delete_modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box bg-base-300">
          <h3 className="font-black text-xl text-error">Confirm Deletion</h3>
          <p className="py-4 font-medium opacity-80">
            Are you sure you want to delete <span className="text-primary font-black">{category.name}</span>?
          </p>
          <div className="modal-action">
            <form method="dialog"><button className="btn btn-ghost font-bold">Cancel</button></form>
            <button 
              onClick={() => deleteCategory({ variables: { id } })} 
              className={`btn btn-error font-black ${isDeleting ? 'loading' : ''}`}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Yes, Delete It"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

// --- 2. Main Page Component ---
export default function EditCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { isLoaded, isSignedIn } = useAuth();
  
  const { data, loading } = useQuery<CategoryResponse>(GET_CATEGORY_BY_SLUG, { 
    variables: { slug }, 
    skip: !isLoaded || !isSignedIn || !slug 
  });

  const category = data?.getCategoryBySlug;

  if (!isLoaded || loading || !category) return <LoadingSpinner />;

  return <EditCategoryForm category={category} id={category.id} />;
}