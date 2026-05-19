"use client";

import { useMutation } from "@apollo/client/react";
import { ADD_TO_CART, GET_CART, AddToCartResponse } from "@/graphql/cart";
import { useUser } from "@clerk/nextjs"; 
import { ShoppingCartIcon, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface AddToCartButtonProps {
  productId: string;
  stock: number;
}

export default function AddToCartButton({ productId, stock }: AddToCartButtonProps) {
  // clerk is done loading yet ?
  const { user, isLoaded, isSignedIn } = useUser(); 

  const [addToCart, { loading }] = useMutation<AddToCartResponse>(ADD_TO_CART, {
    refetchQueries: [{ query: GET_CART, variables: { userId: user?.id || "" } }],
    
    onCompleted: (data) => {
      const newItem = data.addToCart;
      toast.success(`${newItem.product.title} added to cart `);
    },
    
    onError: (error) => {
      console.error("Add to cart error:", error);
      toast.error(error.message || "Failed to add to cart");
    },
  });

  const handleAdd = async () => {
    // wait until clerk is loading
    if (!isLoaded) return;

    if (!isSignedIn) {
      toast.error("Please sign in to add items to cart");
      return;
    }

    if (stock <= 0) {
      toast.error("Out of stock");
      return;
    }

    try {
      await addToCart({
        variables: {
          input: { productId, quantity: 1 },
        },
      });
    } catch {
      // Error handled in onError
    }
  };

  return (
    <button
      onClick={handleAdd}
      // btn is disabled as long as clerk is loading
      disabled={!isLoaded || loading || stock === 0}
      className={`btn btn-primary btn-lg w-full rounded-2xl gap-3 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${
        stock === 0 || !isLoaded ? "btn-disabled" : ""
      }`}
    >
      {!isLoaded || loading ? (
        <Loader2 className="size-6 animate-spin" />
      ) : stock > 0 ? (
        <>
          <ShoppingCartIcon className="size-6" />
          <span className="font-black uppercase tracking-widest">Add to Cart</span>
        </>
      ) : (
        "Out of Stock"
      )}
    </button>
  );
}