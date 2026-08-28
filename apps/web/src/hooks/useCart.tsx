"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/services/productos.service";

export type CartProduct = Product;
export interface CartItem { product: CartProduct; quantity: number; }
export interface CartContextValue {
  items: CartItem[]; isOpen: boolean; isCartOpen: boolean;
  openCart: () => void; closeCart: () => void;
  addToCart: (product: CartProduct, quantity?: number) => void; addItem: (product: CartProduct, quantity?: number) => void;
  removeFromCart: (productId: string) => void; removeItem: (productId: string) => void;
  increaseQuantity: (productId: string) => void; decreaseQuantity: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void; getItemQuantity: (productId: string) => number;
  getAvailableStock: (product: CartProduct) => number; clearCart: () => void;
  totalItems: number; totalPrice: number; subtotal: number;
}

const CART_STORAGE_KEY = "canastas-verdes-cart";
const CartContext = createContext<CartContextValue | null>(null);

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return Boolean(item.product && typeof item.product.id === "string" && typeof item.quantity === "number" && Number.isInteger(item.quantity) && item.quantity > 0);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) { const parsed: unknown = JSON.parse(stored); if (Array.isArray(parsed)) setItems(parsed.filter(isCartItem)); }
    } catch (error) { console.error("Error cargando carrito:", error); }
    finally { setHydrated(true); }
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)); }
    catch (error) { console.error("Error guardando carrito:", error); }
  }, [hydrated, items]);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const addToCart = useCallback((product: CartProduct, quantity = 1) => {
    if (!product || !Number.isInteger(quantity) || quantity <= 0 || !product.activo || product.stock <= 0) return;
    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) return current.map((item) => item.product.id === product.id ? { ...item, product, quantity: Math.min(item.quantity + quantity, product.stock) } : item);
      return [...current, { product, quantity: Math.min(quantity, product.stock) }];
    });
    setIsOpen(true);
  }, []);
  const removeFromCart = useCallback((productId: string) => setItems((current) => current.filter((item) => item.product.id !== productId)), []);
  const increaseQuantity = useCallback((productId: string) => setItems((current) => current.map((item) => item.product.id === productId ? { ...item, quantity: Math.min(item.quantity + 1, Math.max(0, item.product.stock)) } : item)), []);
  const decreaseQuantity = useCallback((productId: string) => setItems((current) => current.map((item) => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item).filter((item) => item.quantity > 0)), []);
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity <= 0) { removeFromCart(productId); return; }
    setItems((current) => current.map((item) => item.product.id === productId ? { ...item, quantity: Math.min(quantity, Math.max(0, item.product.stock)) } : item));
  }, [removeFromCart]);
  const clearCart = useCallback(() => setItems([]), []);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => total + item.product.precio * item.quantity, 0);
  const value = useMemo<CartContextValue>(() => ({
    items, isOpen, isCartOpen: isOpen, openCart, closeCart, addToCart, addItem: addToCart, removeFromCart, removeItem: removeFromCart,
    increaseQuantity, decreaseQuantity, updateQuantity, getItemQuantity: (productId) => items.find((item) => item.product.id === productId)?.quantity ?? 0,
    getAvailableStock: (product) => Math.max(0, product.stock), clearCart, totalItems, totalPrice, subtotal: totalPrice,
  }), [addToCart, clearCart, closeCart, decreaseQuantity, increaseQuantity, isOpen, items, openCart, removeFromCart, totalItems, totalPrice, updateQuantity]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe utilizarse dentro de CartProvider.");
  return context;
}
