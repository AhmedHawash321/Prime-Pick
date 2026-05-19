"use client";

import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  StarIcon,
  ShieldAlertIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

// ─── GraphQL ──────────────────────────────────────────────────────

const GET_PENDING_COMMENTS = gql`
  query GetPendingComments {
    getPendingComments {
      id
      content
      rating
      moderationReason
      createdAt
      status
      user {
        id
        name
        imageUrl
      }
      product {
        id
        title
        imageUrl
      }
    }
  }
`;

const APPROVE_COMMENT = gql`
  mutation ApproveComment($id: ID!) {
    approveComment(id: $id) {
      id
      status
    }
  }
`;

const REJECT_COMMENT = gql`
  mutation RejectComment($id: ID!, $reason: String) {
    rejectComment(id: $id, reason: $reason) {
      id
      status
    }
  }
`;

// ─── Component ────────────────────────────────────────────────────

interface PendingComment {
  id: string;
  content: string;
  rating: number;
  moderationReason?: string;
  createdAt: string;
  status: string;
  user: { id: string; name: string; imageUrl?: string };
  product: { id: string; title: string; imageUrl?: string };
}

export default function PendingCommentsPage() {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{
    getPendingComments: PendingComment[];
  }>(GET_PENDING_COMMENTS, {
    fetchPolicy: "network-only",
  });

  const [approveComment] = useMutation(APPROVE_COMMENT, {
    onCompleted: () => {
      toast.success("Comment approved");
      refetch();
      setProcessingId(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setProcessingId(null);
    },
  });

  const [rejectComment] = useMutation(REJECT_COMMENT, {
    onCompleted: () => {
      toast.success("Comment rejected");
      refetch();
      setProcessingId(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setProcessingId(null);
    },
  });

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    await approveComment({ variables: { id } });
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    await rejectComment({
      variables: { id, reason: "Rejected by admin after review" },
    });
  };

  const pendingComments = data?.getPendingComments || [];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-base-200/50 p-6 rounded-4xl border border-base-content/5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ShieldAlertIcon className="size-6 text-warning" />
            <h1 className="text-2xl font-bold">Comment Moderation</h1>
          </div>
          <p className="text-[10px] font-bold opacity-50 uppercase tracking-[0.2em]">
            AI-flagged comments awaiting review ({pendingComments.length})
          </p>
        </div>

        {pendingComments.length > 0 && (
          <div className="badge badge-warning badge-lg font-black animate-pulse">
            {pendingComments.length} Pending
          </div>
        )}
      </div>

      {/* Empty State */}
      {pendingComments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-base-200/30 rounded-[3rem] border-2 border-dashed border-base-content/10">
          <CheckCircleIcon className="size-16 text-success opacity-30 mb-4" />
          <h3 className="text-xl font-black opacity-30 uppercase tracking-widest">
            All Clear!
          </h3>
          <p className="text-sm opacity-40 mt-2">
            No comments pending review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingComments.map((comment) => (
            <div
              key={comment.id}
              className="bg-base-200 rounded-4xl border border-warning/20 overflow-hidden"
            >
              {/* AI Flag Banner */}
              <div className="bg-warning/10 border-b border-warning/20 px-6 py-3 flex items-center gap-2">
                <ShieldAlertIcon className="size-4 text-warning" />
                <p className="text-xs font-bold text-warning uppercase tracking-widest">
                  AI Flagged — Needs Review
                </p>
                {comment.moderationReason && (
                  <span className="text-xs opacity-60 ml-2">
                    Reason: {comment.moderationReason}
                  </span>
                )}
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Comment Content */}
                <div className="lg:col-span-7 space-y-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary uppercase">
                      {comment.user?.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-bold text-sm">
                        {comment.user?.name || "Unknown User"}
                      </p>
                      <p className="text-[10px] opacity-40 uppercase font-mono">
                        {comment.user?.id}
                      </p>
                    </div>
                    {/* Rating */}
                    <div className="ml-auto flex items-center gap-1 bg-yellow-400/10 px-3 py-1 rounded-full">
                      <StarIcon className="size-3 text-yellow-400 fill-current" />
                      <span className="text-xs font-black text-yellow-400">
                        {comment.rating}
                      </span>
                    </div>
                  </div>

                  {/* Comment Text */}
                  <div className="bg-base-300/50 p-4 rounded-2xl border border-base-content/5">
                    <p className="text-sm leading-relaxed italic">
                      &ldquo;{comment.content}&rdquo;
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-[10px] opacity-40">
                    <ClockIcon className="size-3" />
                    {comment.createdAt
                      ? new Date(comment.createdAt).toLocaleString()
                      : "Unknown date"}
                  </div>
                </div>

                {/* Product Info */}
                <div className="lg:col-span-3">
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-2">
                    Product
                  </p>
                  <div className="flex items-center gap-3 bg-base-300/30 p-3 rounded-2xl">
                    {comment.product?.imageUrl && (
                      <div className="relative size-12 rounded-xl overflow-hidden shrink-0">
                        <Image
                          src={comment.product.imageUrl}
                          alt={comment.product.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <p className="text-xs font-bold line-clamp-2">
                      {comment.product?.title || "Unknown Product"}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="lg:col-span-2 flex lg:flex-col gap-3 justify-end">
                  <button
                    onClick={() => handleApprove(comment.id)}
                    disabled={processingId === comment.id}
                    className="btn btn-success btn-sm flex-1 lg:flex-none gap-2 rounded-2xl font-black"
                  >
                    {processingId === comment.id ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <CheckCircleIcon className="size-4" />
                    )}
                    Approve
                  </button>

                  <button
                    onClick={() => handleReject(comment.id)}
                    disabled={processingId === comment.id}
                    className="btn btn-error btn-sm flex-1 lg:flex-none gap-2 rounded-2xl font-black"
                  >
                    {processingId === comment.id ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <XCircleIcon className="size-4" />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}