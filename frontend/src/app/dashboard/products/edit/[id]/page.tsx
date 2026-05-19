"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "@clerk/nextjs";
import { useState, use } from "react";
import { GET_PRODUCT_BY_ID, UPDATE_PRODUCT, DELETE_PRODUCT, GET_MY_PRODUCTS } from "@/graphql/products";
import { GET_CATEGORIES } from "@/graphql/categories";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeftIcon, Trash2Icon, SaveIcon, ImageIcon, UploadIcon, LinkIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { UploadButton } from "@/utils/uploadthing";

//  Interface for Category
interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
}

// Interface for Categories API response
interface CategoriesData {
  getCategories: Category[];
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  userId: string;
  categoryId?: string;
}

interface ProductResponse {
  getProductById: Product;
}

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

// --- 1. Internal Form Component ---
function EditProductForm({ product, id, userId }: { product: Product, id: string, userId: string | null | undefined }) {
  const router = useRouter();
  // Fetch getToken to authorize the UploadThing request
  const { getToken } = useAuth();

  // Fetch categories for the dropdown
  const { data: categoriesData } = useQuery<CategoriesData>(GET_CATEGORIES);
  
  const [formData, setFormData] = useState({
    title: product.title || "",
    description: product.description || "",
    price: product.price?.toString() || "",
    stock: product.stock?.toString() || "",
    imageUrl: product.imageUrl || "",
    categoryId: product.categoryId || "", 
  });

  const [updateProduct, { loading: isUpdating }] = useMutation(UPDATE_PRODUCT, {
    onCompleted: () => {
      toast.success("Product updated successfully!");
      router.push("/dashboard/products");
    },
    onError: (err: Error) => toast.error(`Update failed: ${err.message}`),
    refetchQueries: [
      { query: GET_MY_PRODUCTS, variables: { userId } },
      { query: GET_CATEGORIES } 
    ],
  });

  const [deleteProduct, { loading: isDeleting }] = useMutation(DELETE_PRODUCT, {
    onCompleted: () => {
      toast.success("Item Deleted successfully");
      router.push("/dashboard/products");
    },
    onError: (err: Error) => toast.error(err.message),
    refetchQueries: [{ query: GET_MY_PRODUCTS, variables: { userId } }],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.imageUrl) {
      toast.error("Product image is required.");
      return;
    }

    try {
      await updateProduct({
        variables: {
          id,
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

  const openDeleteModal = () => {
    const modal = document.getElementById('confirm_delete_modal') as HTMLDialogElement;
    if (modal) modal.showModal();
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8 flex justify-between items-center bg-base-300 p-4 rounded-xl shadow-sm border border-base-content/5">
        <Link href="/dashboard/products" className="btn btn-ghost btn-sm gap-2 font-bold opacity-70 hover:opacity-100 transition-all">
          <ArrowLeftIcon className="size-4" /> Back to Products
        </Link>
        
        <button 
          type="button"
          onClick={openDeleteModal}
          className="btn btn-error btn-outline btn-sm gap-2 font-bold"
          disabled={isDeleting}
        >
          <Trash2Icon className="size-4" /> Delete Product
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Preview & Upload Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card bg-base-300 shadow-xl border border-base-content/5">
            <div className="card-body p-4 space-y-4">
              <h3 className="text-xs uppercase font-black opacity-40 mb-2 tracking-widest text-center flex items-center justify-center gap-2">
                <ImageIcon className="size-4" /> Product Image
              </h3>
              
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-base-200 border border-base-content/10 shadow-inner">
                {formData.imageUrl ? (
                  <Image src={formData.imageUrl} alt="Preview" fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full opacity-20 text-xs">No Image Provided</div>
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
              <h1 className="card-title text-2xl mb-6 font-black text-primary">Edit Details</h1>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="form-control">
                  <label className="label text-xs font-black uppercase opacity-60">Category</label>
                  <select 
                    name="categoryId" 
                    value={formData.categoryId} 
                    onChange={handleChange} 
                    className="select select-bordered focus:select-primary font-bold"
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

                <div className="form-control">
                  <label className="label text-xs font-black uppercase opacity-60">Product Title</label>
                  <input type="text" name="title" value={formData.title} onChange={handleChange} className="input input-bordered focus:input-primary font-bold" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label text-xs font-black uppercase opacity-60">Price (EGP)</label>
                    <input type="number" name="price" value={formData.price} onChange={handleChange} className="input input-bordered focus:input-primary font-bold" step="0.01" required />
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-black uppercase opacity-60">Stock</label>
                    <input type="number" name="stock" value={formData.stock} onChange={handleChange} className="input input-bordered focus:input-primary font-bold" required />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label text-xs font-black uppercase opacity-60">Description</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} className="textarea textarea-bordered focus:textarea-primary min-h-30 leading-relaxed" required />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" className="btn btn-primary flex-1 font-black gap-2" disabled={isUpdating}>
                    {isUpdating ? <span className="loading loading-spinner loading-xs"></span> : <SaveIcon className="size-4" />}
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                  <Link href="/dashboard/products" className="btn btn-ghost flex-1 font-bold">Cancel</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <dialog id="confirm_delete_modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box bg-base-300 border border-error/20">
          <h3 className="font-black text-xl text-error">Confirm Deletion</h3>
          <p className="py-4 font-medium opacity-80">
            Are you sure you want to delete <span className="text-primary font-black">{product?.title}</span>? 
            This action is permanent.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-ghost font-bold">Cancel</button>
            </form>
            <button 
              onClick={() => deleteProduct({ variables: { id } })} 
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
export default function EditProductPage({ params }: EditProductPageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams?.id;
  const { isLoaded, isSignedIn, userId } = useAuth();

  const { data, loading } = useQuery<ProductResponse>(GET_PRODUCT_BY_ID, {
    variables: { id },
    skip: !isLoaded || !isSignedIn || !id,
  });

  const product = data?.getProductById;

  if (!isLoaded || loading || !product) return <LoadingSpinner />;

  return <EditProductForm product={product} id={id} userId={userId} />;
}