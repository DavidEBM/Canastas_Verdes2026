"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, authPersistenceReady, db } from "@/lib/firebase";

export type UserRole = "consumidor" | "repartidor" | "admin";

interface AuthState {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
}
const ROLE_LOAD_RETRIES = 5;
const ROLE_LOAD_DELAY = 300;

let sharedState: AuthState = {
  user: null,
  loading: true,
  role: null,
};

let subscriptionStarted = false;
let unsubscribeAuth: (() => void) | null = null;
let authOperation = 0;
const subscribers = new Set<(state: AuthState) => void>();

function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== "string") return null;
  const role = value.trim().toLowerCase();
  return role === "consumidor" || role === "repartidor" || role === "admin" ? role : null;
}

function publish(next: AuthState) {
  sharedState = next;
  subscribers.forEach((subscriber) => subscriber(next));
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function loadRole(currentUser: User): Promise<UserRole | null> {
  try {
    const userRef = doc(db, "usuarios", currentUser.uid);
    for (let attempt = 1; attempt <= ROLE_LOAD_RETRIES; attempt += 1) {
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        return normalizeRole(data.Rol ?? data.role);
      }
      if (attempt < ROLE_LOAD_RETRIES) await delay(ROLE_LOAD_DELAY);
    }
  } catch (error) {
    console.error("Error obteniendo rol desde Firestore:", error);
  }
  return null;
}

function startSharedSubscription() {
  if (subscriptionStarted) return;
  subscriptionStarted = true;

  void (async () => {
    await authPersistenceReady;
    unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      const operation = ++authOperation;

      if (!currentUser) {
        publish({ user: null, loading: false, role: null });
        return;
      }

      publish({ user: currentUser, loading: true, role: null });
      const role = await loadRole(currentUser);
      if (operation !== authOperation) return;
      publish({ user: currentUser, loading: false, role });
    });
  })();
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(sharedState);

  useEffect(() => {
    subscribers.add(setState);
    setState(sharedState);
    startSharedSubscription();

    return () => {
      subscribers.delete(setState);
    };
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    role: state.role,
    authenticated: Boolean(state.user),
  };
}

export function stopSharedAuthSubscriptionForTests() {
  unsubscribeAuth?.();
  unsubscribeAuth = null;
  subscriptionStarted = false;
  authOperation += 1;
  sharedState = { user: null, loading: true, role: null };
  subscribers.clear();
}
