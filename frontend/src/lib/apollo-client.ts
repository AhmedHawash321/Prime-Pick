import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { registerApolloClient } from "@apollo/experimental-nextjs-app-support";

// This is the "getClient" used in Server Components (page.tsx)
export const { getClient } = registerApolloClient(() => {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/graphql",
    }),
    /* 
       Added defaultOptions to disable caching globally for Server Components.
       This ensures that queries always fetch fresh data from the database.
    */
    defaultOptions: {
      query: {
        fetchPolicy: "no-cache",
        errorPolicy: "all",
      },
      watchQuery: {
        fetchPolicy: "no-cache",
        errorPolicy: "all",
      },
    },
  });
});