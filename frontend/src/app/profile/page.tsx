"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { GET_MY_ORDERS } from "@/graphql/orders";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ShoppingBagIcon, PackageIcon, CheckCircleIcon, ClockIcon, XCircleIcon, TruckIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import Image from "next/image";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    title: string;
    imageUrl: string;
    price: number;
  };
}

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

interface OrdersResponse {
  getMyOrders: Order[];
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return { icon: <ClockIcon className="size-4" />, class: "badge-warning", text: "Pending" };
    case "completed":
      return { icon: <CheckCircleIcon className="size-4" />, class: "badge-success", text: "Completed" };
    case "shipped":
      return { icon: <TruckIcon className="size-4" />, class: "badge-info", text: "Shipped" };
    case "cancelled":
      return { icon: <XCircleIcon className="size-4" />, class: "badge-error", text: "Cancelled" };
    default:
      return { icon: <PackageIcon className="size-4" />, class: "badge-ghost", text: status };
  }
};

export default function ProfilePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  
  const { data, loading } = useQuery<OrdersResponse>(GET_MY_ORDERS, {
    skip: !isLoaded || !isSignedIn,
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn || loading) return <LoadingSpinner />;
  
  const orders: Order[] = data?.getMyOrders || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Orders</h1>
          <p className="text-sm opacity-70">{orders.length} orders total</p>
        </div>
        <Link href="/" className="btn btn-primary btn-sm">
          <ShoppingBagIcon className="size-4" /> Shop Now
        </Link>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="card bg-base-200 text-center py-16">
          <ShoppingBagIcon className="size-16 mx-auto opacity-20" />
          <h3 className="text-lg font-semibold mt-4">No orders yet</h3>
          <p className="text-sm opacity-60">Start shopping to see your orders</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = getStatusBadge(order.status);
            return (
              <div key={order.id} className="card bg-base-200 p-4">
                {/* Order Header */}
                <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                  <div>
                    <p className="text-xs opacity-50">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    <p className="font-bold">Order #{order.id.slice(0, 8)}</p>
                  </div>
                  <div className={`badge ${status.class} gap-1`}>
                    {status.icon} {status.text}
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-2">
                  {order.items.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex gap-3 items-center">
                      <div className="w-12 h-12 bg-base-300 rounded-md overflow-hidden">
                        {item.product.imageUrl && (
                          <Image
                            src={item.product.imageUrl}
                            alt={item.product.title}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.product.title}</p>
                        <p className="text-xs opacity-60">
                          {item.quantity} × {item.price.toLocaleString()} EGP
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {(item.quantity * item.price).toLocaleString()} EGP
                      </p>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-xs opacity-50 text-center">
                      + {order.items.length - 2} more items
                    </p>
                  )}
                </div>

                {/* Order Footer */}
                <div className="divider my-3"></div>
                <div className="flex justify-between items-center">
                  <p className="text-sm opacity-60">Total</p>
                  <p className="text-xl font-bold text-primary">
                    {order.totalAmount.toFixed(2)} EGP
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}