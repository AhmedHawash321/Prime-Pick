"use client";

import { useState } from "react";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  GET_PRODUCT_COMMENTS,
  CREATE_COMMENT,
  DELETE_COMMENT,
  ProductCommentsResponse,
  CreateCommentResponse,
  DeleteCommentResponse,
  Comment,
} from "@/graphql/comments";
import {
  SendIcon,
  Trash2Icon,
  MessageSquareIcon,
  LogInIcon,
  StarIcon,
} from "lucide-react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";

interface CommentSectionProps {
  productId: string;
}

export default function CommentSection({ productId }: CommentSectionProps) {
  const { isSignedIn, userId } = useAuth();
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);

  // Fetch comments for the specific product
  const { data, refetch } = useQuery<ProductCommentsResponse>(
    GET_PRODUCT_COMMENTS,
    {
      variables: { productId },
      fetchPolicy: "network-only", // Always fetch fresh data from network on mount
      nextFetchPolicy: "network-only", // Ensure subsequent fetches also hit the network
    },
  );

  // Mutation to create a new comment
  const [createComment, { loading: isCreating }] =
    useMutation<CreateCommentResponse>(CREATE_COMMENT, {
      onCompleted: () => {
        toast.success("Review posted successfully!");
        setContent("");
        setRating(5);
        refetch(); // Refresh list after adding
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  // Mutation to delete a comment
  const [deleteComment, { loading: isDeleting }] =
    useMutation<DeleteCommentResponse>(DELETE_COMMENT, {
      onCompleted: () => {
        toast.success("Comment deleted");
        refetch(); // Refresh list after deleting
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const comments = data?.getProductById?.comments || [];

  /**
   * Handles form submission for creating a comment.
   * Includes an AI moderation check before executing the GraphQL mutation.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      // 1. AI Moderation Check
      // Calls the moderation proxy to analyze the comment content
      const modRes = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          comment: content.trim(), 
          product_title: "Product Page Comment" 
        }),
      });
      
      const modData = await modRes.json();

      // 2. Handle AI rejection
      if (modData.decision === "rejected") {
        toast.error(`Comment rejected: ${modData.reason}`);
        return; 
      }

      // 3. Execute GraphQL Mutation if approved
      await createComment({
        variables: {
          input: {
            productId,
            content: content.trim(),
            rating,
          },
        },
      });
    } catch (err) {
      console.error("Mutation Error:", err);
      toast.error("An error occurred. Please try again.");
    }
  };

  /**
   * Handles comment deletion with a confirmation prompt
   */
  const handleDelete = (commentId: string) => {
    if (confirm("Delete this comment?")) {
      deleteComment({
        variables: { id: commentId },
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast notifications container */}
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header Section */}
      <div className="flex items-center gap-2">
        <MessageSquareIcon className="size-5 text-primary" />
        <h3 className="font-bold">Comments</h3>
        <span className="badge badge-neutral badge-sm">{comments.length}</span>
      </div>

      {/* Input Section - Only visible if signed in */}
      {isSignedIn ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 bg-base-200 p-4 rounded-2xl border border-base-content/5"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold opacity-50 uppercase">
              Your Rating:
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-transform active:scale-90"
                >
                  <StarIcon
                    className={`size-5 ${star <= rating ? "text-yellow-400 fill-current" : "text-base-content/20"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Write your review..."
              className="input input-bordered input-sm flex-1 bg-base-100"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isCreating}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm btn-square"
              disabled={isCreating || !content.trim()}
            >
              {isCreating ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <SendIcon className="size-4" />
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between bg-base-200 rounded-lg p-3">
          <span className="text-sm opacity-60">
            Sign in to join the conversation
          </span>
          <SignInButton mode="modal">
            <button className="btn btn-primary btn-sm gap-1">
              <LogInIcon className="size-4" /> Sign In
            </button>
          </SignInButton>
        </div>
      )}

      {/* Comments List Section */}
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {comments.length === 0 ? (
          <div className="text-center py-10 opacity-30">
            <MessageSquareIcon className="size-10 mx-auto mb-2" />
            <p className="font-bold uppercase tracking-widest text-xs">
              No reviews yet
            </p>
          </div>
        ) : (
          comments.map((comment: Comment) => (
            <div
              key={comment.id}
              className="group flex gap-3 bg-base-300/30 p-3 rounded-2xl border border-transparent hover:border-base-content/5 transition-all"
            >
              <div className="avatar shrink-0">
                <div className="w-10 h-10 rounded-full ring-2 ring-base-content/5">
                  {comment.user?.imageUrl ? (
                    <Image
                      src={comment.user.imageUrl}
                      alt={comment.user.name || "User"}
                      width={40}
                      height={40}
                    />
                  ) : (
                    <div className="bg-primary text-primary-content flex items-center justify-center h-full font-bold">
                      {comment.user?.name?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate">
                      {comment.user?.name || "Anonymous"}
                    </span>
                    <div className="flex items-center text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`size-3 ${i < comment.rating ? "fill-current" : "text-base-content/10"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold opacity-30 uppercase whitespace-nowrap">
                    {comment.createdAt && !isNaN(Date.parse(comment.createdAt))
                      ? new Date(comment.createdAt).toLocaleDateString()
                      : "Just now"}
                  </span>
                </div>
                <p className="text-sm mt-1 text-base-content/80 leading-relaxed">
                  {comment.content}
                </p>
              </div>

              {/* Only show delete button if current user is the owner */}
              {userId === comment.user?.id && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="btn btn-ghost btn-xs btn-square text-error opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Trash2Icon className="size-4" />
                  )}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}