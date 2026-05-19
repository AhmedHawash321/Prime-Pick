// hooks/useProducts.ts
"use client";

import { useQuery } from "@apollo/client/react";
import { GET_PRODUCTS } from "@/graphql/products";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
}

interface ProductsResponse {
  getProducts: Product[];
}

interface ProductsFilter {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

export const useProducts = (limit: number = 10, offset: number = 0, filter?: ProductsFilter) => {
  const { data, loading, error, refetch } = useQuery<ProductsResponse>(GET_PRODUCTS, {
    variables: { limit, offset, filter },
    fetchPolicy: "cache-and-network",
  });

  return {
    products: data?.getProducts || [],
    isLoading: loading,
    error,
    refetch,
  };
};