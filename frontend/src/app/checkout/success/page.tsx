"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ShoppingBag, ArrowRight, Home } from "lucide-react";
import { useCartStore } from "@/store/cartStore";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    // clearing cart after payment
    if (sessionId) {
      clearCart();
    } else {
      // in case going without session get back to store
      router.push("/products");
    }
  }, [sessionId, clearCart, router]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-base-300/50 border border-base-content/5 p-8 md:p-12 rounded-[2.5rem] shadow-2xl backdrop-blur-md text-center">
        
        {/* Success Icon Animation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-success/20 blur-2xl rounded-full animate-pulse"></div>
            <CheckCircle2 className="size-20 text-success relative animate-in zoom-in duration-500" />
          </div>
        </div>

        {/* Text Content */}
        <h1 className="text-4xl font-black tracking-tighter mb-2">
          Payment Successful!
        </h1>
        <p className="text-base-content/60 font-medium mb-8 leading-relaxed">
          Thank you for your purchase. Your order has been confirmed and is being processed.
        </p>

        {/* Order Details Placeholder */}
        <div className="bg-base-100 rounded-2xl p-4 mb-8 border border-base-content/5 text-left">
          <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest opacity-40 mb-2">
            <span>Status</span>
            <span className="text-success">Confirmed</span>
          </div>
          <div className="flex justify-between items-center font-bold truncate">
            <span className="opacity-60">Session ID:</span>
            <span className="text-xs">{sessionId?.slice(0, 15)}...</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Link 
            href="/profile" 
            className="btn btn-primary btn-lg rounded-2xl gap-2 shadow-xl hover:shadow-primary/20 transition-all"
          >
            <ShoppingBag className="size-5" />
            View My Orders
          </Link>
          
          <Link 
            href="/" 
            className="btn btn-ghost btn-lg rounded-2xl gap-2 hover:bg-base-content/10 transition-colors"
          >
            <Home className="size-5" />
            Keep Shopping
          </Link>
        </div>

        {/* Footer info */}
        <p className="text-[10px] opacity-40 mt-8 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
          <ArrowRight className="size-3" /> Digital Receipt sent to your email
        </p>
      </div>
    </div>
  );
}