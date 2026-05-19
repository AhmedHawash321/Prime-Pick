"use client";

import { useMutation } from "@apollo/client/react";
import { useAuth } from "@clerk/nextjs";
import { useCartStore } from "@/store/cartStore";
import { CREATE_CHECKOUT_SESSION, CheckoutResponse } from "@/graphql/orders";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  CreditCardIcon,
  ShieldCheckIcon,
  TruckIcon,
  ArrowLeftIcon,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { items, getSubtotal } = useCartStore(); // Removed clearCart from store access

  const [createCheckout, { loading }] = useMutation<CheckoutResponse>(
    CREATE_CHECKOUT_SESSION,
  );
  const [error, setError] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) return <LoadingSpinner />;

  // Display empty state if no items are present and not in redirection process
  if (items.length === 0 && !isRedirecting) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <div className="card bg-base-200 py-20 border-2 border-dashed border-base-content/10 rounded-[2.5rem]">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter opacity-30">
            Your cart is empty
          </h2>
          <Link
            href="/"
            className="btn btn-primary btn-wide mx-auto mt-8 rounded-xl uppercase font-black"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const shipping = 50;
  const tax = subtotal * 0.14;
  const total = subtotal + shipping + tax;

  const handleCheckout = async () => {
    setError("");
    try {
      const { data } = await createCheckout();
      if (data?.createCheckoutSession?.url) {
        // Enable redirecting state to show the loading overlay
        setIsRedirecting(true);
        
        /* NOTE: clearCart() and clearCartMutation() were removed from here.
           The cart is now cleared only after a successful payment 
           is confirmed via the Stripe Webhook (checkout.session.completed).
        */

        // Redirect the user directly to the Stripe Checkout page
        window.location.href = data.createCheckoutSession.url;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create checkout session",
      );
      setIsRedirecting(false);
      toast.error("Checkout failed. Please try again.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl relative min-h-screen">
      {/* Full Screen Loading Overlay displayed during API call or redirection */}
      {(loading || isRedirecting) && (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-base-100/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center max-w-xs w-full">
            <div className="relative flex items-center justify-center mb-10">
              <div className="absolute size-28 bg-primary/10 rounded-full animate-ping"></div>
              <div className="size-16 border-[6px] border-primary/10 border-t-primary rounded-full animate-spin"></div>
              <CreditCardIcon className="absolute size-6 text-primary animate-pulse" />
            </div>

            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-base-content">
                Finalizing Order
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                Redirecting to Secure Payment
              </p>
            </div>

            {/* Smooth Progress Bar for visual feedback */}
            <div className="w-48 h-1 bg-base-content/5 mt-12 rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-progress-loading-smooth w-full origin-left"></div>
            </div>

            <p className="mt-20 text-[9px] font-black opacity-20 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheckIcon className="size-3" /> Encrypted by Stripe
            </p>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <div className="mb-10 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="btn btn-ghost bg-base-200/50 hover:bg-base-200 rounded-2xl gap-2 font-black uppercase text-[10px] tracking-widest px-6"
        >
          <ArrowLeftIcon className="size-4" /> Back to Cart
        </button>
        <div className="hidden md:block text-[10px] font-black uppercase tracking-widest opacity-30">
          Checkout Securely • Prime-Pick
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary Card showing basket items */}
          <div className="card bg-base-200/50 border border-white/5 rounded-4xl">
            <div className="card-body p-8">
              <h2 className="card-title text-xl uppercase font-black italic tracking-tighter mb-4">
                Items In Basket
              </h2>
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center border-b border-base-content/5 pb-4 last:border-0"
                  >
                    <div className="flex flex-col">
                      <p className="font-black text-base uppercase italic">
                        {item.title}
                      </p>
                      <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">
                        Quantity: {item.quantity}
                      </span>
                    </div>
                    <p className="font-black text-primary text-lg italic">
                      {(item.price * item.quantity).toLocaleString()}{" "}
                      <span className="text-[10px] opacity-50">EGP</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Delivery & Security Information Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card bg-base-200/40 border border-white/5 rounded-3xl p-6 flex flex-row items-center gap-5">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <TruckIcon className="size-6 text-primary" />
              </div>
              <div>
                <p className="font-black uppercase text-xs italic">Shipping</p>
                <p className="text-[10px] font-bold opacity-40 uppercase">
                  24-48 Hours Delivery
                </p>
              </div>
            </div>
            <div className="card bg-base-200/40 border border-white/5 rounded-3xl p-6 flex flex-row items-center gap-5">
              <div className="p-4 bg-success/10 rounded-2xl">
                <ShieldCheckIcon className="size-6 text-success" />
              </div>
              <div>
                <p className="font-black uppercase text-xs italic">Security</p>
                <p className="text-[10px] font-bold opacity-40 uppercase">
                  SSL Encrypted Checkout
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Summary Sticky Panel */}
        <div className="lg:col-span-1">
          <div className="card bg-base-300 sticky top-8 shadow-2xl border border-primary/10 rounded-[2.5rem]">
            <div className="card-body p-10">
              <h2 className="text-2xl font-black uppercase italic mb-8 tracking-tighter">
                Checkout
              </h2>

              <div className="space-y-5 text-sm font-bold">
                <div className="flex justify-between uppercase text-[10px] tracking-widest">
                  <span className="opacity-40">Subtotal</span>
                  <span>{subtotal.toLocaleString()} EGP</span>
                </div>
                <div className="flex justify-between uppercase text-[10px] tracking-widest">
                  <span className="opacity-40">Shipping</span>
                  <span>{shipping.toLocaleString()} EGP</span>
                </div>
                <div className="flex justify-between uppercase text-[10px] tracking-widest italic text-error/60">
                  <span>Tax (14%)</span>
                  <span>{tax.toLocaleString()} EGP</span>
                </div>

                <div className="divider my-4 opacity-5"></div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-[0.2em] opacity-30">
                    Total Amount
                  </span>
                  <div className="text-right">
                    <span className="text-4xl font-black text-primary tracking-tighter italic leading-none block">
                      {total.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-black opacity-30 uppercase mt-1 block">
                      EGP
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="alert alert-error bg-error/10 border-error/20 text-[10px] font-black uppercase mt-8 rounded-2xl">
                  {error}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={loading || isRedirecting}
                className={`btn btn-primary btn-lg w-full gap-3 mt-10 rounded-3xl shadow-[0_10px_30px_rgba(var(--p),0.3)] hover:scale-[1.02] active:scale-95 transition-all group ${loading || isRedirecting ? "btn-disabled" : ""}`}
              >
                {loading || isRedirecting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <CreditCardIcon className="size-5 group-hover:rotate-12 transition-transform" />
                )}
                <span className="font-black uppercase tracking-[0.15em] text-sm">
                  {loading || isRedirecting ? "Connecting..." : "Pay Securely"}
                </span>
              </button>

              <div className="mt-8 flex flex-col items-center gap-4 opacity-30">
                <p className="text-[8px] text-center font-black uppercase tracking-widest leading-relaxed px-4">
                  By clicking &quot;Pay Securely&quot; you agree to our terms of
                  service and refund policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}