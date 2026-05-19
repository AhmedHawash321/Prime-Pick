"use client";

import Link from "next/link";
import { XCircle, AlertCircle, ShoppingCart, RefreshCcw } from "lucide-react";

export default function CancelPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-base-300/50 border border-error/10 p-8 md:p-12 rounded-[2.5rem] shadow-2xl backdrop-blur-md text-center">
        {/* Error Icon Animation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-error/20 blur-2xl rounded-full animate-pulse"></div>
            <XCircle className="size-20 text-error relative animate-in slide-in-from-top duration-500" />
          </div>
        </div>

        {/* Text Content */}
        <h1 className="text-4xl font-black tracking-tighter mb-2">
          Payment Cancelled
        </h1>
        <p className="text-base-content/60 font-medium mb-8 leading-relaxed">
          Your transaction was not completed. Don&apos;t worry, no funds were
          deducted from your account.
        </p>

        {/* Possible Reasons */}
        <div className="bg-error/5 rounded-2xl p-4 mb-8 border border-error/10 text-left">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-error mb-2 flex items-center gap-2">
            <AlertCircle className="size-3" /> Possible Reasons
          </h4>
          <ul className="text-xs space-y-1 opacity-70 font-bold">
            <li>• Transaction cancelled by user</li>
            <li>• Incorrect card information</li>
            <li>• Insufficient funds or bank decline</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Link
            href="/cart"
            className="btn btn-error btn-lg rounded-2xl gap-2 shadow-xl hover:shadow-error/20 transition-all text-white"
          >
            <RefreshCcw className="size-5" />
            Try Again from Cart
          </Link>

          <Link
            href="/"
            className="btn btn-ghost btn-lg rounded-2xl gap-2 hover:bg-base-content/10 transition-colors"
          >
            <ShoppingCart className="size-5" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
