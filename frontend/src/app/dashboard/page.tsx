"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@apollo/client/react";
import {
  PackageIcon,
  ShoppingCartIcon,
  DollarSignIcon,
  LayoutGridIcon,
  FileTextIcon,
  MessageSquareIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { gql } from "@apollo/client";
import { GET_MY_PRODUCTS } from "@/graphql/products";
import { GET_MY_ORDERS } from "@/graphql/orders";
import { GET_CATEGORIES } from "@/graphql/categories";
import { GET_ARTICLES } from "@/graphql/articles";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";

// GraphQL query to fetch the count of comments awaiting moderation
const GET_PENDING_COMMENTS_COUNT = gql`
  query GetPendingCommentsCount {
    getPendingComments {
      id
    }
  }
`;

interface Product {
  id: string;
  title: string;
  price: number;
  stock: number;
}

interface ProductsResponse {
  getProductsByUserId: Product[];
}

interface Order {
  id: string;
  totalAmount: number;
  status: string;
}

interface OrdersResponse {
  getMyOrders: Order[];
}

interface CategoriesResponse {
  getCategories: { id: string }[];
}

interface ArticlesResponse {
  getArticles: { id: string }[];
}

interface PendingCommentsResponse {
  getPendingComments: { id: string }[];
}

export default function DashboardHome() {
  const { userId, isLoaded, isSignedIn } = useAuth();

  // Fetch products associated with the logged-in user
  const { data: productsData, loading: productsLoading } =
    useQuery<ProductsResponse>(GET_MY_PRODUCTS, {
      variables: { userId },
      skip: !isLoaded || !isSignedIn || !userId,
    });

  // Fetch all orders for the store
  const { data: ordersData, loading: ordersLoading } = useQuery<OrdersResponse>(
    GET_MY_ORDERS,
    {
      skip: !isLoaded || !isSignedIn,
    },
  );

  // Fetch total categories count
  const { data: categoriesData, loading: categoriesLoading } =
    useQuery<CategoriesResponse>(GET_CATEGORIES, {
      skip: !isLoaded || !isSignedIn,
    });

  // Fetch total articles count
  const { data: articlesData, loading: articlesLoading } =
    useQuery<ArticlesResponse>(GET_ARTICLES, {
      variables: { search: "" },
      skip: !isLoaded || !isSignedIn,
    });

  // Fetch the number of comments currently in the "pending" state
  const { data: pendingData, loading: pendingLoading } =
    useQuery<PendingCommentsResponse>(GET_PENDING_COMMENTS_COUNT, {
      skip: !isLoaded || !isSignedIn,
    });

  if (!isLoaded || !isSignedIn) return <LoadingSpinner />;
  if (
    productsLoading ||
    ordersLoading ||
    categoriesLoading ||
    articlesLoading ||
    pendingLoading
  )
    return <LoadingSpinner />;

  const products = productsData?.getProductsByUserId || [];
  const orders = ordersData?.getMyOrders || [];
  const categoriesCount = categoriesData?.getCategories?.length || 0;
  const articlesCount = articlesData?.getArticles?.length || 0;
  const pendingCommentsCount = pendingData?.getPendingComments?.length || 0;

  const totalProducts = products.length;
  const lowStock = products.filter((p) => p.stock < 10).length;

  const totalOrders = orders.length;

  /** * Revenue Calculation
   * Sums total amounts for orders that have reached a successful final state.
   */
  const successfulOrders = orders.filter(
    (o) => o.status === "completed" || o.status === "delivered",
  );

  const totalRevenue = successfulOrders.reduce(
    (sum, o) => sum + Number(o.totalAmount || 0),
    0,
  );

  // Configuration for dashboard summary stat cards
  const stats = [
    {
      title: "Total Products",
      value: totalProducts,
      icon: PackageIcon,
      color: "text-primary",
      link: "/dashboard/products",
    },
    {
      title: "Categories",
      value: categoriesCount,
      icon: LayoutGridIcon,
      color: "text-accent",
      link: "/dashboard/categories",
    },
    {
      title: "Articles",
      value: articlesCount,
      icon: FileTextIcon,
      color: "text-info",
      link: "/dashboard/articles",
    },
    {
      title: "Pending Comments", // Added option to access the new moderation route
      value: pendingCommentsCount,
      icon: MessageSquareIcon,
      color: "text-warning",
      link: "/dashboard/pending-comments",
    },
    {
      title: "Total Orders",
      value: totalOrders,
      icon: ShoppingCartIcon,
      color: "text-secondary",
      link: "/dashboard/orders",
    },
    {
      title: "Total Revenue",
      value: `${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP`,
      icon: DollarSignIcon,
      color: "text-success",
      link: "/dashboard/orders",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-sm opacity-60">
          Welcome back! Here&apos;s what&apos;s happening with your store.
        </p>
      </div>

      {/* Stats Grid - 6 columns to display Products, Categories, Articles, Comments, Orders, and Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.title}
              href={stat.link}
              className="card bg-base-300 hover:shadow-lg transition-shadow border border-base-content/5"
            >
              <div className="card-body p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs uppercase font-bold opacity-50">
                      {stat.title}
                    </p>
                    <p className={`text-xl font-bold mt-1 ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                  <Icon className={`size-6 ${stat.color} opacity-50`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Moderation Alert - Links to D:\Projects\Product-store\frontend\src\app\dashboard\pending-comments\page.tsx */}
      {pendingCommentsCount > 0 && (
        <div className="alert alert-warning shadow-sm py-2">
          <ShieldAlertIcon className="size-4" />
          <span className="text-sm font-medium">
            There are {pendingCommentsCount} comments awaiting moderation!
          </span>
          <Link
            href="/dashboard/pending-comments"
            className="btn btn-xs btn-warning font-bold"
          >
            Review Now
          </Link>
        </div>
      )}

      {/* Inventory Alert for Low Stock Items */}
      {lowStock > 0 && (
        <div className="alert alert-info shadow-sm py-2">
          <PackageIcon className="size-4" />
          <span className="text-sm font-medium">
            You have {lowStock} items running low on stock!
          </span>
          <Link
            href="/dashboard/products"
            className="btn btn-xs btn-ghost underline"
          >
            View Items
          </Link>
        </div>
      )}

      {/* Recent Products Summary Table */}
      <div className="card bg-base-300 border border-base-content/5">
        <div className="card-body">
          <h2 className="card-title text-lg">Recent Products</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th className="text-xs opacity-50">Product</th>
                  <th className="text-xs opacity-50">Price</th>
                  <th className="text-xs opacity-50">Stock</th>
                  <th className="text-xs opacity-50">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 5).map((product) => (
                  <tr key={product.id}>
                    <td className="font-medium">{product.title}</td>
                    <td>{product.price.toLocaleString()} EGP</td>
                    <td>
                      <span
                        className={
                          product.stock < 10
                            ? "badge badge-warning badge-sm"
                            : "badge badge-ghost badge-sm"
                        }
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/products/edit/${product.id}`}
                        className="btn btn-xs btn-ghost text-primary"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-4 opacity-60">
                      No products found in your inventory.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
