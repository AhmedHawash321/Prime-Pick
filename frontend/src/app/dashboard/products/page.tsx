"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ProductCard from "@/components/ProductCard";
import { PlusIcon, PackageIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { GET_MY_PRODUCTS, DELETE_PRODUCT } from "@/graphql/products";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Product {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  image_url?: string;
  price: number;
  stock: number;
}

interface ProductsResponse {
  getProductsByUserId: Product[];
}

export default function DashboardProductsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );

  const { data, loading, refetch, error } = useQuery<ProductsResponse>(
    GET_MY_PRODUCTS,
    {
      variables: { userId },
      skip: !isLoaded || !isSignedIn || !userId,
      fetchPolicy: "cache-and-network",
    },
  );

  const [deleteProduct, { loading: isDeleting }] = useMutation(DELETE_PRODUCT, {
    onCompleted: () => {
      toast.success("Product Deleted Successfully");
      refetch();
      const modal = document.getElementById(
        "delete_modal",
      ) as HTMLDialogElement;
      if (modal) modal.close();
    },
    onError: (error) => {
      console.error("Delete Error:", error);
      toast.error("Failed to Delete: " + error.message);
    },
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  const openDeleteModal = (id: string) => {
    setSelectedProductId(id);
    const modal = document.getElementById("delete_modal") as HTMLDialogElement;
    if (modal) modal.showModal();
  };

  if (!isLoaded || loading) return <LoadingSpinner />;

  if (error)
    return (
      <div className="alert alert-error m-4 shadow-lg rounded-2xl">
        <div className="flex flex-col">
          <span className="font-bold uppercase tracking-tighter">
            Connection Error
          </span>
          <span className="text-xs opacity-70">{error.message}</span>
        </div>
      </div>
    );

  const products = data?.getProductsByUserId || [];

  return (
    <div className="space-y-6">
      {/* Header Section - same as dashboard */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">My Products</h1>
          <p className="text-sm opacity-60">Manage your products, track stock levels, and update catalog information</p>
        </div>
        <Link
          href="/dashboard/products/create"
          className="btn btn-primary btn-sm gap-1"
        >
          <PlusIcon className="size-4" /> Create Product
        </Link>
      </div>

      {products.length === 0 ? (
        /* Empty State */
        <div className="card bg-base-200 text-center py-16">
          <PackageIcon className="size-16 mx-auto opacity-20" />
          <h3 className="text-lg font-semibold mt-4">No products yet</h3>
          <p className="text-sm opacity-60">Start by creating your first product</p>
          <Link href="/dashboard/products/create" className="btn btn-primary btn-sm mt-4">
            Create Your First Product
          </Link>
        </div>
      ) : (
        /* Products Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isDashboard={true}
              onDelete={openDeleteModal}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <dialog
        id="delete_modal"
        className="modal modal-bottom sm:modal-middle backdrop-blur-md"
      >
        <div className="modal-box border-t-8 border-error rounded-[2.5rem] bg-base-200 p-8">
          <div className="flex items-center gap-4 text-error mb-6">
            <div className="bg-error/10 p-4 rounded-2xl">
              <Trash2Icon className="size-8" />
            </div>
            <div>
              <h3 className="font-bold text-xl uppercase tracking-tighter">
                Confirm Deletion
              </h3>
              <p className="text-xs opacity-50 tracking-widest uppercase">
                Action is irreversible
              </p>
            </div>
          </div>

          <p className="font-medium opacity-70 leading-relaxed">
            Are you sure you want to remove this item? This will permanently
            delete the product from the marketplace and your inventory.
          </p>

          <div className="modal-action gap-3 mt-6">
            <form method="dialog" className="flex gap-4 w-full">
              <button className="btn btn-ghost flex-1 font-bold rounded-2xl">
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  selectedProductId &&
                  deleteProduct({ variables: { id: selectedProductId } })
                }
                className={`btn btn-error flex-2 font-bold rounded-2xl shadow-lg shadow-error/20 ${isDeleting ? "loading" : ""}`}
                disabled={isDeleting}
              >
                {isDeleting ? "Processing..." : "Confirm Delete"}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
}