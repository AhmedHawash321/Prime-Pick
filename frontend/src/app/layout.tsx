import { ClerkProvider } from "@clerk/nextjs";
import { ApolloWrapper } from "@/lib/apollo-provider";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar"; 
import ChatWidget from "@/components/ChatWidget";
import NotificationPopup from "@/components/NotificationPopup";
import { Toaster } from "react-hot-toast";
import { ChatProvider } from "@/context/ChatContext"; 
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Configure SEO metadata for Prime-Pick
export const metadata = {
  title: {
    default: "PRIME-PICK",
    template: "%s | PRIME-PICK",
  },
  description: "Your ultimate destination for online shopping. Discover a wide range of curated products, best deals, and a seamless marketplace experience.",
  keywords: ["Online Shopping", "Marketplace", "E-commerce", "Best Deals", "Retail", "Quality Products"],
  authors: [{ name: "Prime-Pick Team" }],
  openGraph: {
    title: "PRIME-PICK | Shop Online",
    description: "Experience the next level of online shopping with PRIME-PICK.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" data-theme="dark">
        <body className={inter.className}>
          {/* Apollo Client wrapper for GraphQL state management across the entire app */}
          <ApolloWrapper>
            {/* ChatProvider ensures synchronized chat state between the widget and contact page */}
            <ChatProvider>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="grow">
                  {children}
                </main>
              </div>
              
              {/* AI Assistant Widget - available globally on all pages */}
              <ChatWidget />
            </ChatProvider>

            {/* Notification Popup - Monitors order status changes globally */}
            <NotificationPopup />

            {/* Global toast notification configuration */}
            <Toaster 
              position="top-center"
              toastOptions={{
                style: {
                  background: '#1d232a',
                  color: '#a6adbb',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '14px',
                  borderRadius: '12px',
                },
                success: {
                  iconTheme: {
                    primary: '#36d399', 
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#f87272',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </ApolloWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}