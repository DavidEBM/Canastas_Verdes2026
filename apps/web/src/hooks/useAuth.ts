"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

export type UserRole =
  | "usuario"
  | "repartidor"
  | "admin";

interface AuthState {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
}

function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== "string") {
    return null;
  }

  const role = value.trim().toLowerCase();

  if (
    role === "usuario" ||
    role === "repartidor" ||
    role === "admin"
  ) {
    return role;
  }

  return null;
}

async function loadRole(
  currentUser: User,
): Promise<UserRole | null> {
  try {
    const userRef = doc(
      db,
      "usuarios",
      currentUser.uid,
    );

    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      console.warn(
        "No existe el documento de usuario:",
        currentUser.uid,
      );

      return null;
    }

    const data = snapshot.data();

    /*
     * Firestore utiliza actualmente:
     *
     * Rol: "admin"
     *
     * Se mantiene también compatibilidad con "role"
     * por si algún documento antiguo utiliza ese nombre.
     */

    return normalizeRole(
      data.Rol ?? data.role,
    );
  } catch (error) {
    console.error(
      "Error obteniendo rol desde Firestore:",
      error,
    );

    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    role: null,
  });

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!currentUser) {
            setState({
              user: null,
              loading: false,
              role: null,
            });

            return;
          }

          setState({
            user: currentUser,
            loading: true,
            role: null,
          });

          const role =
            await loadRole(currentUser);

          setState({
            user: currentUser,
            loading: false,
            role,
          });
        },
      );

    return unsubscribe;
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    role: state.role,
    authenticated: Boolean(state.user),
  };
}