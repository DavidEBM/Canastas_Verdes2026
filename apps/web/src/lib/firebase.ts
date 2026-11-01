import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp(): 
initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Mantiene la sesión de Firebase al recargar o volver a abrir el navegador.
// Se exporta la promesa para que los flujos de login/registro esperen a que
// la persistencia esté lista antes de autenticar al usuario.
export const authPersistenceReady = setPersistence(
  auth,
  browserLocalPersistence,
).catch((error) => {
  console.error(
    "No fue posible configurar la persistencia de Firebase Auth:",
    error,
  );
});

function createFirestore() {
try {
  return initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (error) {
  console.warn(
    "No fue posible activar la caché persistente de Firestore; se usará la caché en memoria.",
    error,
  );
  return getFirestore(app);
}
}

export const db = createFirestore();
export const storage = getStorage(app);
