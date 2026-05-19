"use client";

import { useQuery } from "@apollo/client/react";
import { GET_PRODUCTS } from "@/graphql/products";

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  userId: string;
  createdAt?: string; 
  user?: {
    id: string;
    name: string;
  };
}

interface ProductsResponse {
  getProducts: Product[];
}

export interface ProductsFilter {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

export const useProducts = (limit: number = 10, offset: number = 0, filter?: ProductsFilter) => {
  const { data, loading, error, refetch } = useQuery<ProductsResponse>(GET_PRODUCTS, {
    variables: { limit, offset, filter },
  });

  return {
    products: data?.getProducts || [],
    isLoading: loading,
    error,
    refetch,
  };
};