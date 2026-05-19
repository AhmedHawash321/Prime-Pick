"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { GET_CART, REMOVE_FROM_CART, CLEAR_CART, UPDATE_CART_ITEM } from "@/graphql/cart";
import { CREATE_CHECKOUT_SESSION, CheckoutResponse } from "@/graphql/orders"; 
import { useCartStore } from "@/store/cartStore";
import LoadingSpinner from "@/components/LoadingSpinner";
import { 
  TrashIcon, 
  PlusIcon, 
  MinusIcon, 
  ArrowLeftIcon, 
  ShoppingBag,
  CreditCardIcon,
  ShieldCheckIcon
} from "lucide-react";
import toast from "react-hot-toast";

interface CartItemInput {
  id: string;
  product: {
    id: string;
    title: string;
    price: number;
    imageUrl: string;
    description: string;
    stock: number;
  };
  quantity: number;
}

interface CartResponse {
  getCartByUserId: {
    id: string;
    quantity: number;
    product: {
      id: string;
      title: string;
      price: number;
      imageUrl: string;
      description: string;
      stock: number;
    };
  }[];
}

export default function CartPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const { setItems, clearCart: clearLocalCart } = useCartStore();
  const [isFinalizing, setIsFinalizing] = useState(false);

  const { data, loading, refetch } = useQuery<CartResponse>(GET_CART, {
    variables: { userId },
    skip: !isLoaded || !isSignedIn || !userId,
    fetchPolicy: "network-only",
  });

  const [removeFromCart] = useMutation(REMOVE_FROM_CART);
  const [clearCartMutation] = useMutation(CLEAR_CART);
  const [updateCartItem] = useMutation(UPDATE_CART_ITEM);
  const [createCheckout] = useMutation<CheckoutResponse>(CREATE_CHECKOUT_SESSION);

  // Sort products by ID to maintain a consistent UI order
  const items = useMemo(() => {
    const rawItems = data?.getCartByUserId || [];
    return [...rawItems].sort((a, b) => a.id.localeCompare(b.id));
  }, [data]);

  // Calculate price summary: subtotal, shipping, VAT, and grand total
  const { subtotal, shipping, vat, total } = useMemo(() => {
    const sub = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const ship = sub > 0 ? 50 : 0;
    const v = sub * 0.14;
    return {
      subtotal: sub,
      shipping: ship,
      vat: v,
      total: sub + ship + v
    };
  }, [items]);

  // Sync the local zustand store with the fetched GraphQL cart data
  useEffect(() => {
    if (data?.getCartByUserId) {
      const formattedItems = data.getCartByUserId.map((item: CartItemInput) => ({
        id: item.id,
        productId: item.product.id,
        title: item.product.title,
        price: item.product.price,
        quantity: item.quantity,
        imageUrl: item.product.imageUrl || "/placeholder.png",
        stock: item.product.stock,
      }));
      
      setItems(formattedItems);
    }
  }, [data?.getCartByUserId, setItems]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/");
  }, [isLoaded, isSignedIn, router]);

  // Initiate Stripe Checkout session
  const handleSecureCheckout = async () => {
    setIsFinalizing(true);
    try {
      const { data: checkoutData } = await createCheckout();
      if (checkoutData?.createCheckoutSession?.url) {
        /* The cart will be cleared automatically by the backend Webhook 
           only after a successful payment transaction.
        */
        window.location.href = checkoutData.createCheckoutSession.url;
      }
    } catch {
      setIsFinalizing(false);
      toast.error("Checkout failed. Please try again.");
    }
  };

  // Update item quantity in the database
  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setIsProcessing(true);
    try {
      await updateCartItem({ variables: { id, quantity: newQuantity } });
      await refetch();
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove a specific item from the cart
  const handleRemove = async (id: string) => {
    setIsProcessing(true);
    try {
      await removeFromCart({ variables: { id } });
      await refetch();
      toast.success("Item removed");
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear all items from the cart manually
  const handleClear = async () => {
    setIsProcessing(true);
    setShowClearModal(false);
    try {
      await clearCartMutation(); 
      await refetch();
      clearLocalCart();
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isLoaded || !isSignedIn || loading) return <LoadingSpinner />;

  // Render empty cart state
  if (items.length === 0 && !isFinalizing) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl text-center">
        <div className="card bg-base-200 py-24 border-2 border-dashed border-base-content/10">
          <ShoppingBag className="size-20 mx-auto opacity-10 mb-6" />
          <h3 className="text-3xl font-black opacity-30 uppercase tracking-tighter">Your cart is empty</h3>
          <Link href="/" className="btn btn-primary btn-wide mx-auto mt-10">Start Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl relative">
      {/* Finalizing Order Full-Screen Overlay */}
      {isFinalizing && (
        <div className="fixed inset-0 z-200 flex flex-col items-center justify-center bg-base-100">
          <div className="flex flex-col items-center max-w-xs w-full animate-in fade-in zoom-in duration-300">
            <div className="relative flex items-center justify-center mb-10">
              <div className="absolute size-28 bg-primary/10 rounded-full animate-ping"></div>
              <div className="size-16 border-[6px] border-primary/10 border-t-primary rounded-full animate-spin"></div>
              <CreditCardIcon className="absolute size-6 text-primary" />
            </div>
            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Finalizing Order</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Redirecting to Stripe</p>
            </div>
            <div className="w-48 h-1 bg-base-content/5 mt-12 rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-progress-loading-smooth w-full origin-left"></div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Clear Cart Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-base-100 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center">
            <h3 className="text-2xl font-black mb-3">Empty Cart?</h3>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowClearModal(false)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={handleClear} className="btn btn-error flex-1">Clear All</button>
            </div>
          </div>
        </div>
      )}

      {/* Global Processing Loader */}
      {isProcessing && (
        <div className="fixed inset-0 bg-base-300/60 backdrop-blur-sm z-90 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div className="flex items-center gap-5">
          <button onClick={() => router.back()} className="btn btn-circle btn-ghost bg-base-200">
            <ArrowLeftIcon className="size-5" />
          </button>
          <h1 className="text-4xl font-black tracking-tight uppercase">My Basket</h1>
        </div>
        <button onClick={() => setShowClearModal(true)} className="btn btn-ghost text-error/50 hover:text-error">
          <TrashIcon className="size-4" /> Clear Cart
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-5">
          {items.map((item) => (
            <div key={item.id} className="card card-side bg-base-200/40 hover:bg-base-200 border border-transparent hover:border-primary/20 transition-all overflow-hidden">
              <div className="relative w-36 md:w-48 aspect-square">
                <Image src={item.product.imageUrl || "/placeholder.jpg"} alt={item.product.title} fill className="object-cover" />
              </div>
              <div className="card-body p-6 flex-1">
                <div className="flex justify-between">
                  <h2 className="font-black text-xl line-clamp-1">{item.product.title}</h2>
                  <button onClick={() => handleRemove(item.id)} className="text-error/30 hover:text-error">
                    <TrashIcon className="size-4" />
                  </button>
                </div>
                <div className="flex justify-between items-end mt-auto">
                  <div className="join bg-base-300/50 p-1">
                    <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} className="btn btn-sm btn-ghost" disabled={isProcessing || item.quantity <= 1}>
                      <MinusIcon className="size-3" />
                    </button>
                    <span className="px-4 flex items-center font-black">{item.quantity}</span>
                    <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} className="btn btn-sm btn-ghost text-primary" disabled={isProcessing || item.quantity >= item.product.stock}>
                      <PlusIcon className="size-3" />
                    </button>
                  </div>
                  <p className="text-2xl font-black text-primary">{(item.product.price * item.quantity).toLocaleString()} <span className="text-xs">EGP</span></p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="card bg-base-300 sticky top-8 shadow-2xl p-8">
            <h2 className="text-2xl font-black uppercase mb-8">Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between opacity-60 font-bold"><span>Subtotal</span><span>{subtotal.toLocaleString()} EGP</span></div>
              <div className="flex justify-between opacity-60 font-bold"><span>Shipping</span><span>{shipping.toLocaleString()} EGP</span></div>
              <div className="flex justify-between text-error/60 font-bold"><span>VAT (14%)</span><span>{vat.toLocaleString()} EGP</span></div>
              <div className="divider opacity-5"></div>
              <div className="flex justify-between items-end pb-6">
                <span className="font-black opacity-40">Total</span>
                <span className="text-4xl font-black text-primary">{total.toLocaleString()}</span>
              </div>

              <button 
                onClick={handleSecureCheckout}
                disabled={isProcessing || isFinalizing}
                className="btn btn-primary btn-lg w-full gap-3 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                <CreditCardIcon className="size-5" />
                <span className="font-black uppercase tracking-widest">Checkout</span>
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 opacity-30">
                <ShieldCheckIcon className="size-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Secured by Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}