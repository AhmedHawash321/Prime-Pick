"use client";

import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "@clerk/nextjs";
import { GET_ALL_ORDERS, UPDATE_ORDER_STATUS } from "@/graphql/orders";
import LoadingSpinner from "@/components/LoadingSpinner";
import { 
  PackageIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon, 
  TruckIcon, 
  RefreshCwIcon, 
  Undo2Icon, 
  DollarSignIcon,
  ShieldCheckIcon
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    title: string;
    imageUrl: string;
  };
}

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface OrdersResponse {
  getAllOrders: Order[];
}

const formatDate = (dateValue: string | number | Date | null | undefined): string => {
  if (!dateValue) return "N/A";
  
  let date: Date;
  
  if (typeof dateValue === "string") {
    date = new Date(dateValue);
  } else if (typeof dateValue === "number") {
    date = new Date(dateValue);
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    return "N/A";
  }
  
  if (isNaN(date.getTime())) return "N/A";
  
  return date.toLocaleDateString("en-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending": return { icon: <ClockIcon className="size-4" />, class: "badge-warning", text: "Pending" };
    case "processing": return { icon: <RefreshCwIcon className="size-4" />, class: "badge-info", text: "Processing" };
    case "shipped": return { icon: <TruckIcon className="size-4" />, class: "badge-primary", text: "Shipped" };
    case "delivered": return { icon: <CheckCircleIcon className="size-4" />, class: "badge-success", text: "Delivered" };
    case "completed": return { icon: <ShieldCheckIcon className="size-4" />, class: "badge-success", text: "Paid & Completed" };
    case "returned": return { icon: <Undo2Icon className="size-4" />, class: "badge-warning", text: "Returned" };
    case "refunded": return { icon: <DollarSignIcon className="size-4" />, class: "badge-secondary", text: "Refunded" };
    case "cancelled": return { icon: <XCircleIcon className="size-4" />, class: "badge-error", text: "Cancelled" };
    default: return { icon: <PackageIcon className="size-4" />, class: "badge-ghost", text: status };
  }
};

const adminStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "returned", label: "Returned" },
  { value: "refunded", label: "Refunded" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminOrdersPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  
  const { data, loading, error, refetch } = useQuery<OrdersResponse>(GET_ALL_ORDERS, {
    skip: !isLoaded || !isSignedIn,
    fetchPolicy: "network-only",
  });

  const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS, {
    onCompleted: () => {
      toast.success("Order status updated successfully!");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update order status");
    },
  });

  if (!isLoaded || !isSignedIn || loading) return <LoadingSpinner />;
  if (error) return <div className="alert alert-error">Error: {error.message}</div>;

  const orders = data?.getAllOrders || [];
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const completedOrders = orders.filter(o => ["delivered", "completed"].includes(o.status)).length;
  const pendingOrders = orders.filter(o => ["pending", "processing"].includes(o.status)).length;

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus({ variables: { orderId, status: newStatus } });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Orders Management</h1>
        <p className="text-sm opacity-60">Manage customer orders, update status, and process payments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-base-300 hover:shadow-lg transition-shadow border border-base-content/5">
          <div className="card-body p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-60">Total Orders</p>
                <p className="text-2xl font-bold text-primary">{orders.length}</p>
              </div>
              <PackageIcon className="size-8 text-primary opacity-50" />
            </div>
          </div>
        </div>

        <div className="card bg-base-300 hover:shadow-lg transition-shadow border border-base-content/5">
          <div className="card-body p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-60">Completed</p>
                <p className="text-2xl font-bold text-success">{completedOrders}</p>
              </div>
              <CheckCircleIcon className="size-8 text-success opacity-50" />
            </div>
          </div>
        </div>
        <div className="card bg-base-300 hover:shadow-lg transition-shadow border border-base-content/5">
          <div className="card-body p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-60">Pending</p>
                <p className="text-2xl font-bold text-warning">{pendingOrders}</p>
              </div>
              <ClockIcon className="size-8 text-warning opacity-50" />
            </div>
          </div>
        </div>
        <div className="card bg-base-300 hover:shadow-lg transition-shadow border border-base-content/5">
          <div className="card-body p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-60">Revenue</p>
                <p className="text-2xl font-bold text-secondary">{totalRevenue.toLocaleString()} EGP</p>
              </div>
              <DollarSignIcon className="size-8 text-secondary opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="card bg-base-200 text-center py-16 border-2 border-dashed border-base-content/10">
          <PackageIcon className="size-16 mx-auto opacity-20" />
          <h3 className="text-lg font-semibold mt-4">No orders yet</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = getStatusBadge(order.status);
            return (
              <div key={order.id} className="card bg-base-200 shadow-md border border-base-content/5">
                <div className="card-body p-5">
                  {/* Order Header */}
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">
                        {formatDate(order.createdAt)}
                      </p>
                      <p className="font-black text-sm tracking-tight">Order #{order.id.slice(-8).toUpperCase()}</p>
                      <p className="text-xs opacity-60 mt-1">
                        Customer: <span className="font-bold">{order.user?.name || order.user?.email || "Guest"}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={order.status === "completed" ? "delivered" : order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        disabled={updatingOrderId === order.id || order.status === "cancelled"}
                        className="select select-bordered select-sm w-36 font-bold text-xs"
                      >
                        {adminStatusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div className={`badge ${status.class} badge-md gap-1 font-bold py-3`}>
                        {status.icon} {status.text}
                      </div>
                    </div>
                  </div>

                  <div className="divider my-3 opacity-10"></div>

                  {/* Order Items */}
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-base-300/30 p-2 rounded-lg">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-sm font-black truncate">{item.product.title}</p>
                          <p className="text-[10px] font-bold opacity-50 uppercase">Qty: {item.quantity} × {item.price.toLocaleString()} EGP</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-base-content">{(item.quantity * item.price).toLocaleString()} <span className="text-[10px]">EGP</span></p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="divider my-3 opacity-10"></div>

                  {/* Order Footer */}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">Items Count: {order.items.length}</p>
                      {order.status === "completed" && (
                        <div className="flex items-center gap-1 text-success mt-1">
                          <ShieldCheckIcon className="size-3" />
                          <span className="text-[10px] font-black uppercase">Verified Payment</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold opacity-40 uppercase">Total Amount</p>
                      <p className="text-2xl font-black text-primary leading-none mt-1">
                        {order.totalAmount.toLocaleString()} <span className="text-xs">EGP</span>
                      </p>
                    </div>
                  </div>

                  {updatingOrderId === order.id && (
                    <div className="absolute inset-0 bg-base-200/50 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-10">
                      <span className="loading loading-spinner loading-md text-primary"></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}