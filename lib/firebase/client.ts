/**
 * Firebase クライアント SDK の遅延初期化 + 匿名認証。
 * 静的エクスポート（`output: "export"`）のまま動作する。
 */
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import {
  Auth,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from "firebase/auth";
import { Firestore, getFirestore, initializeFirestore } from "firebase/firestore";
import { FirebaseStorage, getStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let anonAuthPromise: Promise<string> | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.storageBucket &&
      config.appId
  );
}

export function getFirebaseApp(): FirebaseApp {
  if (appInstance) return appInstance;
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase 設定が読み込まれていません。.env.local の NEXT_PUBLIC_FIREBASE_* を確認してください。"
    );
  }
  appInstance = getApps().length > 0 ? getApp() : initializeApp(config);
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseFirestore(): Firestore {
  if (firestoreInstance) return firestoreInstance;
  const app = getFirebaseApp();
  try {
    firestoreInstance = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
    });
  } catch {
    // 既に初期化済み（HMR などで二重呼び出しされた場合）は既存インスタンスを取得
    firestoreInstance = getFirestore(app);
  }
  return firestoreInstance;
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

/**
 * 匿名認証。呼び出しごとに sign-in はせず、既にログイン済みならそのまま uid を返す。
 */
export function ensureAnonymousAuth(): Promise<string> {
  if (anonAuthPromise) return anonAuthPromise;
  anonAuthPromise = new Promise<string>((resolve, reject) => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe();
          resolve(user.uid);
          return;
        }
        signInAnonymously(auth).catch((err) => {
          unsubscribe();
          anonAuthPromise = null;
          reject(err);
        });
      },
      (err) => {
        unsubscribe();
        anonAuthPromise = null;
        reject(err);
      }
    );
  });
  return anonAuthPromise;
}
