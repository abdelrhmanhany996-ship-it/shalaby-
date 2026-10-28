import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { firebaseConfig } from './firebaseConfig';

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(
  app,
  { ignoreUndefinedProperties: true },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Local end-to-end tests run the real app against the Firebase emulators (never set in production builds).
const useEmulators = import.meta.env.VITE_FIREBASE_EMULATORS === '1';
if (useEmulators) {
  connectFirestoreEmulator(db, '127.0.0.1', 8181);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}

if (firebaseConfig.measurementId && !useEmulators) {
  isSupported().then((ok) => ok && getAnalytics(app)).catch(() => {});
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Tell the person when something they did was not saved (reads outside one's scope are expected and stay silent).
  if (operationType !== OperationType.GET && operationType !== OperationType.LIST && typeof window !== 'undefined') {
    const code = (error as { code?: string })?.code || '';
    window.dispatchEvent(new CustomEvent('crm-save-failed', { detail: { code, path } }));
  }
  return errInfo;
}

export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection verified.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn('Firebase Firestore client offline:', error.message);
    }
  }
}

testFirestoreConnection();
