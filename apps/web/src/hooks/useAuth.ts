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

/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 *
 * Cuando un usuario se registra con Google:
 *
 * 1. Firebase Auth autentica al usuario.
 * 2. onAuthStateChanged se ejecuta.
 * 3. /api/usuarios/perfil todavía puede estar creando
 *    usuarios/{uid} en Firestore.
 *
 * Por eso hacemos varios intentos antes de determinar
 * definitivamente que el documento no existe.
 */

const ROLE_LOAD_RETRIES = 5;
const ROLE_LOAD_DELAY = 300;

/*
 * ============================================================
 * NORMALIZAR ROL
 * ============================================================
 */
function normalizeRole(
  value: unknown,
): UserRole | null {
  if (typeof value !== "string") {
    return null;
  }

  const role = value
    .trim()
    .toLowerCase();

  if (
    role === "usuario" ||
    role === "repartidor" ||
    role === "admin"
  ) {
    return role;
  }

  return null;
}

/*
 * ============================================================
 * ESPERA
 * ============================================================
 */
function delay(
  milliseconds: number,
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/*
 * ============================================================
 * OBTENER ROL DESDE FIRESTORE
 * ============================================================
 */
async function loadRole(
  currentUser: User,
): Promise<UserRole | null> {
  try {
    const userRef = doc(
      db,
      "usuarios",
      currentUser.uid,
    );

    /*
     * Intentamos varias veces porque el documento puede
     * estar siendo creado simultáneamente por:
     *
     * POST /api/usuarios/perfil
     */
    for (
      let attempt = 1;
      attempt <= ROLE_LOAD_RETRIES;
      attempt++
    ) {
      const snapshot =
        await getDoc(userRef);

      if (snapshot.exists()) {
        const data = snapshot.data();

        /*
         * Firestore utiliza actualmente:
         *
         * Rol: "admin"
         *
         * Se mantiene compatibilidad con:
         *
         * role: "admin"
         */

        const role = normalizeRole(
          data.Rol ?? data.role,
        );

        if (role) {
          return role;
        }

        /*
         * El documento existe pero todavía no tiene
         * un rol válido.
         */
        console.warn(
          "El documento de usuario existe, pero no tiene un rol válido:",
          currentUser.uid,
        );

        return null;
      }

      /*
       * El documento todavía no existe.
       *
       * Solo mostramos advertencia definitiva después
       * del último intento.
       */
      if (
        attempt < ROLE_LOAD_RETRIES
      ) {
        await delay(ROLE_LOAD_DELAY);
      }
    }

    console.warn(
      "No existe el documento de usuario después de varios intentos:",
      currentUser.uid,
    );

    return null;
  } catch (error) {
    console.error(
      "Error obteniendo rol desde Firestore:",
      error,
    );

    return null;
  }
}

/*
 * ============================================================
 * HOOK DE AUTENTICACIÓN
 * ============================================================
 */
export function useAuth() {
  const [state, setState] =
    useState<AuthState>({
      user: null,
      loading: true,
      role: null,
    });

  useEffect(() => {
    let active = true;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {
          /*
           * ==================================================
           * USUARIO NO AUTENTICADO
           * ==================================================
           */
          if (!currentUser) {
            if (!active) {
              return;
            }

            setState({
              user: null,
              loading: false,
              role: null,
            });

            return;
          }

          /*
           * ==================================================
           * USUARIO AUTENTICADO
           * ==================================================
           *
           * Mantenemos loading=true mientras buscamos
           * el documento de Firestore.
           */
          if (!active) {
            return;
          }

          setState({
            user: currentUser,
            loading: true,
            role: null,
          });

          /*
           * ==================================================
           * OBTENER ROL
           * ==================================================
           */
          const role =
            await loadRole(
              currentUser,
            );

          /*
           * El componente pudo desmontarse mientras
           * esperábamos las consultas a Firestore.
           */
          if (!active) {
            return;
          }

          setState({
            user: currentUser,
            loading: false,
            role,
          });
        },
      );

    /*
     * ========================================================
     * CLEANUP
     * ========================================================
     */
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    role: state.role,
    authenticated:
      Boolean(state.user),
  };
}