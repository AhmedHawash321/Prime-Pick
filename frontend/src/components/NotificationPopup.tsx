"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_MY_NOTIFICATIONS,
  MARK_NOTIFICATION_AS_READ,
} from "@/graphql/notifications";
import { useAuth } from "@clerk/nextjs";
import ReviewPopup from "./ReviewPopup";
import { StarIcon, XIcon } from "lucide-react";
import Image from "next/image";

// Fallback image from Unsplash if no product image is found
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1557821552-17105176677c?q=80&w=200&auto=format&fit=crop";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: string;
  isRead: boolean;
  createdAt: string;
}

export interface MyNotificationsResponse {
  getMyNotifications: Notification[];
}

export default function NotificationPopup() {
  const { isSignedIn } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const lastProcessedIdRef = useRef<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [productToReview, setProductToReview] = useState<{
    id: string;
    title: string;
    image: string;
    orderId: string;
  } | null>(null);

  const { data, refetch } = useQuery<MyNotificationsResponse>(
    GET_MY_NOTIFICATIONS,
    {
      skip: !isSignedIn,
      variables: { limit: 5 },
      fetchPolicy: "network-only",
      // Added pollInterval to check for new notifications every 15 seconds
      // to avoid manual page refreshes when an order status changes.
      pollInterval: 30000,
    },
  );

  const [markAsRead] = useMutation(MARK_NOTIFICATION_AS_READ);

  const unreadNotification = useMemo(
    () =>
      data?.getMyNotifications?.find(
        (n) => !n.isRead && n.type === "order_delivered",
      ),
    [data],
  );

  useEffect(() => {
    if (unreadNotification?.id) {
      const isDismissed = localStorage.getItem(
        `dismissed_notif_${unreadNotification.id}`,
      );
      if (
        unreadNotification.id !== lastProcessedIdRef.current &&
        !isDismissed
      ) {
        lastProcessedIdRef.current = unreadNotification.id;
        setShowPopup(true);
      }
    } else {
      lastProcessedIdRef.current = null;
    }
  }, [unreadNotification]);

  const notificationExtraData = useMemo(() => {
    try {
      if (!unreadNotification?.data) return null;
      return typeof unreadNotification.data === "string"
        ? JSON.parse(unreadNotification.data)
        : unreadNotification.data;
    } catch {
      return null;
    }
  }, [unreadNotification]);

  // Priority given to productImage to match backend delivery logic
  const displayImage =
    notificationExtraData?.productImage ||
    notificationExtraData?.imageUrl ||
    notificationExtraData?.image ||
    FALLBACK_IMAGE;

  const displayTitle =
    notificationExtraData?.productTitle ||
    notificationExtraData?.title ||
    "Purchased Item";

  // Safe date parsing to prevent "Invalid Date" display
  const formattedDate = useMemo(() => {
    const createdAt = unreadNotification?.createdAt;
    if (!createdAt) return "";
    
    const date = new Date(createdAt);
    return isNaN(date.getTime()) ? "" : date.toLocaleDateString();
  }, [unreadNotification]);

  const handleDismissForever = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (unreadNotification) {
      localStorage.setItem(`dismissed_notif_${unreadNotification.id}`, "true");
      setShowPopup(false);
      await markAsRead({ variables: { id: unreadNotification.id } });
      refetch();
    }
  };

  const handleNotificationClick = async () => {
    if (!notificationExtraData || !unreadNotification) return;

    const productId =
      notificationExtraData.productIds?.[0] || notificationExtraData.productId;

    if (productId) {
      setProductToReview({
        id: productId,
        title: displayTitle,
        image: displayImage,
        orderId: notificationExtraData.orderId,
      });
      setShowPopup(false);
      setShowReviewModal(true);
      await markAsRead({ variables: { id: unreadNotification.id } });
      refetch();
    }
  };

  if (!unreadNotification && !productToReview) return null;

  return (
    <>
      {showPopup && unreadNotification && (
        <div className="fixed inset-0 z-202 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div
            onClick={handleNotificationClick}
            className="relative bg-base-100 max-w-sm w-full rounded-2rem overflow-hidden shadow-2xl border border-primary/10 cursor-pointer group"
          >
            {/* Optional: Display date in the corner if valid */}
            {formattedDate && (
              <span className="absolute top-4 left-8 text-[9px] opacity-30 font-bold uppercase">
                {formattedDate}
              </span>
            )}

            <button
              onClick={handleDismissForever}
              className="absolute top-4 right-4 z-210 btn btn-circle btn-xs btn-ghost hover:bg-error/20"
            >
              <XIcon className="size-4" />
            </button>

            <div className="p-8">
              <div className="flex flex-col items-center text-center gap-4">
                {/* Enhanced Image Container:
                  Using w-24 h-24 for better visibility. 
                  unoptimized=true ensures external links (S25 Ultra) load regardless of domain config.
                */}
                <div className="relative w-24 h-24 aspect-square bg-base-300 rounded-2xl overflow-hidden border border-base-content/10 shadow-inner shrink-0">
                  <Image
                    src={displayImage}
                    alt={displayTitle}
                    fill
                    priority
                    unoptimized={displayImage.startsWith("http")}
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-110"
                    sizes="96px"
                  />
                </div>

                {/* Text Content */}
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                    Order Delivered!
                  </p>
                  <h3 className="text-lg font-black uppercase tracking-tight line-clamp-1">
                    {displayTitle}
                  </h3>
                  <p className="text-[11px] opacity-40 font-bold uppercase tracking-wide">
                    How was your purchase?
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-6">
                <div className="flex justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <StarIcon
                      key={i}
                      className="size-6 text-yellow-400 fill-yellow-400"
                    />
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNotificationClick();
                    }}
                    className="btn btn-primary w-full rounded-2xl font-black uppercase tracking-widest py-4 h-auto shadow-lg shadow-primary/20"
                  >
                    Rate Product
                  </button>
                  <button
                    onClick={handleDismissForever}
                    className="btn btn-ghost btn-sm w-full rounded-xl font-bold uppercase opacity-50 text-[10px]"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {productToReview && (
        <ReviewPopup
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setProductToReview(null);
          }}
          productId={productToReview.id}
          productTitle={productToReview.title}
          productImage={productToReview.image}
          orderId={productToReview.orderId}
          onSuccess={() => {
            setShowReviewModal(false);
            setProductToReview(null);
            refetch();
          }}
        />
      )}
    </>
  );
}