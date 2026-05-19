"use client";

import { useQuery, useMutation } from "@apollo/client/react";
import { GET_CATEGORIES, DELETE_CATEGORY } from "@/graphql/categories";
import LoadingSpinner from "@/components/LoadingSpinner";
import { PlusIcon, LayoutGridIcon, Trash2Icon, Edit3Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import Image from "next/image";

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  createdAt?: string;
}

interface CategoriesResponse {
  getCategories: Category[];
}

export default function DashboardCategoriesPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<CategoriesResponse>(GET_CATEGORIES, {
    fetchPolicy: "cache-and-network",
  });

  const [deleteCategory, { loading: isDeleting }] = useMutation(DELETE_CATEGORY, {
    onCompleted: () => {
      toast.success("Category deleted successfully");
      refetch();
      (document.getElementById("delete_modal") as HTMLDialogElement)?.close();
    },
    onError: (error) => toast.error("Delete failed: " + error.message),
    // Ensures the cache is updated across the app
    refetchQueries: [{ query: GET_CATEGORIES }]
  });

  const openDeleteModal = (id: string) => {
    setSelectedCategoryId(id);
    (document.getElementById("delete_modal") as HTMLDialogElement)?.showModal();
  };

  if (loading) return <LoadingSpinner />;

  const categories = data?.getCategories || [];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-end bg-base-200/50 p-6 rounded-4xl border border-base-content/5">
        <div>
          <h1 className="text-2xl font-bold">Storage Categories</h1>
          <p className="text-[10px] font-bold opacity-50 uppercase tracking-[0.2em] mt-2">
            Organize your departments ({categories.length})
          </p>
        </div>
        <Link href="/dashboard/categories/create" className="btn btn-primary btn-sm gap-1">
          <PlusIcon className="size-4" /> Create Category
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-base-200/30 rounded-[3rem] border-2 border-dashed border-base-content/10">
          <LayoutGridIcon className="size-16 mx-auto opacity-10 mb-4" />
          <h3 className="text-xl font-black opacity-30 uppercase tracking-widest">No Categories Found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {categories.map((category) => (
            <div 
              key={category.id} 
              className="group relative aspect-4/5 rounded-[2.5rem] overflow-hidden bg-base-300 border border-base-content/5 transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] hover:-translate-y-2"
            >
              {/* Image with Parallax-like hover */}
              {category.imageUrl ? (
                <Image 
                  src={category.imageUrl} 
                  alt={category.name} 
                  fill 
                  className="object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-base-200">
                  <LayoutGridIcon className="size-20 opacity-5" />
                </div>
              )}

              {/* Glassmorphism Bottom Overlay */}
              <div className="absolute inset-x-4 bottom-4 p-5 rounded-4xl bg-base-300/60 backdrop-blur-md border border-white/5 flex justify-between items-center z-20 transition-all duration-500 group-hover:bg-base-300/90 group-hover:bottom-6">
                <div className="max-w-[60%]">
                  <h3 className="font-black uppercase tracking-tighter text-lg truncate leading-none mb-1">
                    {category.name}
                  </h3>
                  <p className="text-[9px] opacity-50 font-mono truncate uppercase tracking-widest">{category.slug}</p>
                </div>
                
                {/* Modern Action Buttons */}
                <div className="flex gap-2">
                  <Link 
                    href={`/dashboard/categories/edit/${category.slug}`}
                    className="btn btn-square btn-circle btn-sm bg-primary/20 border-none hover:bg-primary text-primary hover:text-primary-content transition-all duration-300"
                  >
                    <Edit3Icon className="size-4" />
                  </Link>
                  <button 
                    onClick={() => openDeleteModal(category.id)} 
                    className="btn btn-square btn-circle btn-sm bg-error/20 border-none hover:bg-error text-error hover:text-error-content transition-all duration-300"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              </div>

              {/* Visual Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <dialog id="delete_modal" className="modal modal-bottom sm:modal-middle backdrop-blur-md">
        <div className="modal-box border-t-8 border-error rounded-[3rem] bg-base-200 p-10 shadow-2xl">
            <h3 className="font-black text-2xl uppercase text-error tracking-tighter">Confirm Deletion</h3>
            <p className="py-6 opacity-70 font-medium leading-relaxed">
              Are you sure you want to delete this category? All products linked to it might lose their department assignment. This action is irreversible.
            </p>
            <div className="modal-action gap-4">
              <form method="dialog" className="flex gap-4 w-full">
                <button className="btn btn-ghost flex-1 font-bold rounded-2xl">Cancel</button>
                <button 
                  type="button" 
                  onClick={() => selectedCategoryId && deleteCategory({ variables: { id: selectedCategoryId } })}
                  className="btn btn-error flex-1 font-black rounded-2xl shadow-lg shadow-error/20"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Now"}
                </button>
              </form>
            </div>
        </div>
      </dialog>
    </div>
  );
}