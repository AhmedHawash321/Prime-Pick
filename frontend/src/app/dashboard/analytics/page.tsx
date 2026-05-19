"use client";

import { useQuery } from "@apollo/client/react";
import { useAuth } from "@clerk/nextjs";
import { GET_MY_PRODUCTS } from "@/graphql/products";
import { GET_MY_ORDERS } from "@/graphql/orders";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  DollarSignIcon,
  ShoppingCartIcon,
  PackageIcon,
  UsersIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useMemo } from "react";

interface Product { id: string; title: string; price: number; stock: number; }
interface Order { id: string; totalAmount: number; status: string; createdAt: string; userId?: string; }
interface ProductsResponse { getProductsByUserId: Product[]; }
interface OrdersResponse { getMyOrders: Order[]; }

export default function AnalyticsPage() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  const { data: productsData, loading: productsLoading } = useQuery<ProductsResponse>(GET_MY_PRODUCTS, {
    variables: { userId },
    skip: !userId,
  });

  const { data: ordersData, loading: ordersLoading } = useQuery<OrdersResponse>(GET_MY_ORDERS, {
    skip: !isSignedIn,
  });

  const products = useMemo(() => productsData?.getProductsByUserId || [], [productsData]);
  const orders = useMemo(() => ordersData?.getMyOrders || [], [ordersData]);

  // Robust parsing implementation: seamlessly handles both numeric Timestamps and ISO strings.
  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const targetDayString = d.toDateString(); // Format output structure: "Mon Apr 27 2026"

      const dayOrders = orders.filter((o) => {
        if (!o.createdAt) return false;

        const raw = o.createdAt;
        // Attempts date conversion safely across string-typed numbers and raw ISO string formats.
        const parsedDate = isNaN(Number(raw)) 
          ? new Date(raw) 
          : new Date(Number(raw));

        // Comparing via toDateString eliminates hours, minutes, seconds, and local timezone offsets.
        return !isNaN(parsedDate.getTime()) && parsedDate.toDateString() === targetDayString;
      });

      return {
        date: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
        revenue: dayOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
        sales: dayOrders.length,
      };
    });
  }, [orders]);

  const uniqueCustomers = useMemo(() => new Set(orders.map((o) => o.userId || o.id)).size, [orders]);

  if (!isLoaded || !isSignedIn || productsLoading || ordersLoading) return <LoadingSpinner />;

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  const stats = [
    { label: "Total Revenue", value: `${totalRevenue.toLocaleString()} EGP`, icon: DollarSignIcon, color: "text-success" },
    { label: "Total Sales", value: orders.length, icon: ShoppingCartIcon, color: "text-primary" },
    { label: "Products", value: products.length, icon: PackageIcon, color: "text-secondary" },
    { label: "Active Customers", value: uniqueCustomers, icon: UsersIcon, color: "text-info" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics Overview</h1>
        <p className="text-sm opacity-60">Monitor your store performance and sales trends</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card bg-base-300/50 border border-base-content/5 shadow-sm">
              <div className="card-body p-4 flex-row justify-between items-center">
                <div>
                  <p className="text-xs uppercase opacity-50 font-bold">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <div className="p-3 rounded-xl bg-base-100">
                  <Icon className={`size-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card bg-base-300/50 border border-base-content/5 shadow-sm">
        <div className="card-body">
          <div className="flex justify-between items-center mb-8">
            <h2 className="card-title text-lg font-bold">Revenue Flow</h2>
            <div className="badge badge-success badge-outline gap-2 p-3 font-bold">
              <span className="size-2 rounded-full bg-success animate-pulse" /> LIVE DATA
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "currentColor", opacity: 0.4, fontSize: 12 }} 
                />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "12px" }}
                  itemStyle={{ color: "#10b981" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fill="url(#colorRev)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}