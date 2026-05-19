"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { CREATE_COMMENT } from "@/graphql/comments";
import { StarIcon, XIcon, PackageIcon, CheckCircleIcon } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

interface ReviewPopupProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  productImage: string;
  orderId: string;
  onSuccess: () => void;
}

interface ModerationResponse {
  decision: "approved" | "rejected" | "pending";
  reason?: string;
}

export default function ReviewPopup({
  isOpen,
  onClose,
  productId,
  productTitle,
  productImage,
  onSuccess,
}: ReviewPopupProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [createComment] = useMutation(CREATE_COMMENT);

  const handleSubmit = async () => {
    // 1. Basic validation
    if (!comment.trim()) {
      toast.error("Please write a review before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Request AI moderation check from the backend proxy
      const modRes = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: comment.trim(),
          product_title: productTitle,
        }),
      });

      const modData = (await modRes.json()) as ModerationResponse;

      // 3. Handle rejection from AI
      if (modData.decision === "rejected") {
        toast.error(`Review rejected: ${modData.reason}`);
        setIsSubmitting(false);
        return;
      }

      // 4. Proceed with GraphQL mutation if moderation passes (approved or pending)
      await createComment({
        variables: {
          input: {
            productId,
            content: comment.trim(),
            rating,
          },
        },
      });

      setIsSubmitted(true);
      onSuccess();

      // Reset state and close modal after success feedback
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
        setComment("");
        setRating(5);
      }, 2000);
    } catch {
      // Removed unused 'err' parameter
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent rendering if the popup is closed
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-base-200 rounded-2xl shadow-2xl max-w-md w-full border border-primary/20 animate-in zoom-in duration-300">
        
        {!isSubmitted ? (
          <>
            {/* Header Section */}
            <div className="bg-primary/10 px-5 py-4 rounded-t-2xl flex justify-between items-center border-b border-base-content/10">
              <div className="flex items-center gap-2">
                <PackageIcon className="size-5 text-primary" />
                <h3 className="font-black text-sm uppercase tracking-wider">Rate Your Purchase! 🎉</h3>
              </div>
              <button onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
                <XIcon className="size-3" />
              </button>
            </div>

            {/* Product Summary Section */}
            <div className="flex items-center gap-3 p-4 border-b border-base-content/10 bg-base-300/20">
              <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-base-300 shrink-0">
                <Image
                  src={productImage || "/placeholder.jpg"}
                  alt={productTitle}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold line-clamp-1">{productTitle}</p>
                <p className="text-[10px] opacity-60">Thanks for shopping with us!</p>
              </div>
            </div>

            {/* Rating and Input Section */}
            <div className="p-5 space-y-4">
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">
                  How would you rate this product?
                </p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110 active:scale-90"
                    >
                      <StarIcon
                        className={`size-8 ${
                          star <= rating
                            ? "text-yellow-400 fill-current"
                            : "text-base-content/20"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text Area */}
              <div>
                <textarea
                  placeholder="Write your review here..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="textarea textarea-bordered w-full h-28 resize-none bg-base-100 text-sm"
                  maxLength={500}
                />
                <div className="flex justify-between mt-1 px-1">
                  <p className="text-[9px] opacity-40 italic">Review will be visible on product page</p>
                  <p className="text-[10px] opacity-40">
                    {comment.length}/500 characters
                  </p>
                </div>
              </div>

              {/* Submission Button with loading state */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !comment.trim()}
                className="btn btn-primary w-full gap-2 rounded-xl font-black shadow-lg shadow-primary/20"
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <>
                    <StarIcon className="size-4 fill-current" />
                    Submit Review
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Success Feedback State */
          <div className="text-center p-8 space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircleIcon className="size-8 text-success" />
              </div>
            </div>
            <h3 className="text-xl font-black">Thank You! 🙏</h3>
            <p className="text-sm opacity-70">
              Your review has been posted successfully.
            </p>
            <p className="text-xs opacity-50">
              It is now live on the product page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}