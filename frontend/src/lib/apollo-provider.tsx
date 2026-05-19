"use client";

import { 
  ApolloClient, 
  InMemoryCache, 
  HttpLink, 
  ApolloLink, 
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react"
import { useAuth } from "@clerk/nextjs";
import { ReactNode, useMemo } from "react";

/**
 * ApolloWrapper Component
 * This wrapper provides the Apollo Client instance to all Client Components.
 * It is specifically designed to work with Clerk for authenticated GraphQL requests.
 */
export const ApolloWrapper = ({ children }: { children: ReactNode }) => {
  const { getToken } = useAuth();

  // Initialize the Apollo Client for the browser environment
  const client = useMemo(() => {
    // Base link pointing to the GraphQL API
    const httpLink = new HttpLink({
      uri: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/graphql",
    });

    // Authentication Link to handle dynamic token injection from Clerk
    const authLink = new ApolloLink((operation, forward) => {
      return new Observable((observer) => {
        let isSubscribed = true;
        let subscription: { unsubscribe: () => void } | null = null;

        // Cleanly complete the observer if still active
        const safeComplete = () => {
          if (isSubscribed) {
            observer.complete();
          }
        };

        // Fetch the JWT token from Clerk and update headers
        getToken()
          .then((token) => {
            if (!isSubscribed) return;
            
            operation.setContext(({ headers = {} }) => ({
              headers: {
                ...headers,
                authorization: token ? `Bearer ${token}` : "",
              },
            }));
          })
          .then(() => {
            if (!isSubscribed) return;

            // Execute the request and forward results to the observer
            subscription = forward(operation).subscribe({
              next: (value) => {
                if (isSubscribed) observer.next(value);
              },
              error: (error: Error) => {
                if (isSubscribed) observer.error(error);
              },
              complete: safeComplete,
            });
          })
          .catch((error: Error) => {
            if (isSubscribed) observer.error(error);
          });

        // Lifecycle cleanup to prevent memory leaks and orphaned requests
        return () => {
          isSubscribed = false;
          if (subscription) {
            subscription.unsubscribe();
          }
        };
      });
    });

    return new ApolloClient({
      // Combine auth middleware with the transport link
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
      // Define default fetch policies for the client-side experience
      defaultOptions: {
        watchQuery: { fetchPolicy: "cache-and-network" },
        query: { fetchPolicy: "network-only" },
      },
    });
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // We keep this empty to avoid re-creating the client on every auth state change

  // Wrap the application tree with the Apollo Provider
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};