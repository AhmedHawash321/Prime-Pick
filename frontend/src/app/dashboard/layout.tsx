"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { 
  LayoutDashboardIcon, 
  PackageIcon, 
  ShoppingCartIcon,
  BarChart3Icon,
  LayoutGridIcon,
  FileTextIcon,
  MessageSquareIcon
} from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

// Navigation items configuration
const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/dashboard/products", label: "Products", icon: PackageIcon },
  { href: "/dashboard/categories", label: "Categories", icon: LayoutGridIcon },
  { href: "/dashboard/articles", label: "Articles", icon: FileTextIcon }, 
  { href: "/dashboard/pending-comments", label: "Comments", icon: MessageSquareIcon }, 
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCartIcon },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3Icon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  // Redirect to home if user is not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state while checking authentication
  if (!isLoaded || !isSignedIn) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="flex flex-col md:flex-row">
        {/* Sidebar - Hidden on mobile, fixed on medium screens and up */}
        <aside className="hidden md:block w-64 min-h-screen bg-base-300 fixed left-0 top-0 border-r border-base-content/5">
          <div className="p-4 border-b border-base-content/10">
            <h2 className="text-xl font-bold text-primary">Admin Panel</h2>
            <p className="text-xs opacity-60">Manage your store</p>
          </div>
          
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-primary text-primary-content shadow-lg"
                      : "hover:bg-base-200 opacity-70 hover:opacity-100"
                  }`}
                >
                  <Icon className="size-5" />
                  <span className="font-bold text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 md:ml-64 min-h-screen">
          {/* Mobile Header - Visible only when sidebar is hidden */}
          <div className="md:hidden bg-base-300 p-4 border-b border-base-content/10 flex justify-between items-center">
            <h2 className="font-bold text-primary">Admin Panel</h2>
            <div className="badge badge-outline text-[10px] uppercase font-black opacity-50">Mobile View</div>
          </div>

          {/* Content Padding */}
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
