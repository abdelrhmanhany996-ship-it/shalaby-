import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from '../lib/firebaseConfig';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserRole, User } from '../types/crm';
import { normalizeLoginId, toAuthEmail } from '../lib/loginId';
import { createLoginOnServer } from '../lib/adminClient';

/** Server-trusted access record, keyed by Firebase Auth uid. Only admins write it. */
export interface AuthProfile {
  uid: string;
  email: string;
  name: string;
  userId: string; // id of the matching document in `users`
  role: UserRole;
  branchId?: string;
  /** Branches a supervisor / regional manager covers; the security rules read this. */
  supervisedBranchIds?: string[];
  active: boolean;
  loginId?: string; // mobile number / username shown to the person
  mustChangePassword?: boolean; // set after an admin reset
}

export type AuthStatus = 'loading' | 'signed_out' | 'no_profile' | 'inactive' | 'ready';

interface AuthContextType {
  status: AuthStatus;
  profile: AuthProfile | null;
  needsBootstrap: boolean;
  /** `loginId` is a mobile number, a username, or (legacy) an e-mail. */
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  bootstrapAdmin: (data: { name: string; loginId: string; password: string; phone: string }) => Promise<void>;
  /** Creates a Firebase login for a staff member without signing the current admin out. */
  /** Info for the "no access" screen: who is signed in, and whether they are the account that set the system up. */
  signedInAs: { email: string | null; uid: string | null };
  isFounder: boolean;
  restoreFounder: () => Promise<void>;
  createStaffLogin: (data: {
    userId: string;
    loginId: string;
    password: string;
    name: string;
    role: UserRole;
    branchId?: string;
  }) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHE_PREFIX = 'almasar_crm_v1_';

export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'رقم الموبايل أو كلمة المرور غير صحيحة';
    case 'auth/too-many-requests':
      return 'محاولات كثيرة، حاول مرة أخرى بعد قليل';
    case 'auth/email-already-in-use':
      return 'رقم الموبايل أو اسم المستخدم ده مسجّل بحساب دخول بالفعل';
    case 'auth/requires-recent-login':
      return 'سجّل الدخول من جديد ثم حاول تاني';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة (6 أحرف على الأقل)';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالإنترنت';
    case 'auth/operation-not-allowed':
      return 'تسجيل الدخول بالبريد غير مفعّل في Firebase Console';
    case 'permission-denied':
      return 'لا توجد صلاحية — تأكد من نشر قواعد Firestore';
    default:
      return 'حدث خطأ غير متوقع، حاول مرة أخرى';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [busy, setBusy] = useState(false); // suppresses flicker during bootstrap

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFbUser(u);
      setProfile(null);
      setProfileReady(false);
      setAuthReady(true);
    });
  }, []);

  // First-run detection: the setup screen shows only until meta/bootstrap exists.
  useEffect(() => {
    if (!authReady || fbUser) return;
    getDoc(doc(db, 'meta', 'bootstrap'))
      .then((snap) => setNeedsBootstrap(!snap.exists()))
      .catch(() => setNeedsBootstrap(false));
  }, [authReady, fbUser]);

  useEffect(() => {
    if (!fbUser) return;
    return onSnapshot(
      doc(db, 'authProfiles', fbUser.uid),
      (snap) => {
        setProfile(snap.exists() ? ({ ...(snap.data() as AuthProfile), uid: fbUser.uid }) : null);
        setProfileReady(true);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `authProfiles/${fbUser.uid}`);
        setProfile(null);
        setProfileReady(true);
      }
    );
  }, [fbUser]);

  // The account that ran the first-time setup can restore its own developer record if it ever goes missing.
  const [isFounder, setIsFounder] = useState(false);
  useEffect(() => {
    if (!fbUser || !profileReady || profile) return setIsFounder(false);
    getDoc(doc(db, 'meta', 'bootstrap'))
      .then((snap) => setIsFounder(snap.exists() && snap.data()?.createdBy === fbUser.uid))
      .catch(() => setIsFounder(false));
  }, [fbUser, profileReady, profile]);
  const restoreFounder = async () => {
    if (!fbUser) return;
    await setDoc(doc(db, 'authProfiles', fbUser.uid), {
      uid: fbUser.uid,
      email: fbUser.email || '',
      name: fbUser.displayName || fbUser.email || 'المطوّر',
      userId: fbUser.uid,
      role: 'admin',
      active: true,
    }, { merge: true });
  };

  let status: AuthStatus;
  if (!authReady || busy) status = 'loading';
  else if (!fbUser) status = 'signed_out';
  else if (!profileReady) status = 'loading';
  else if (!profile) status = 'no_profile';
  else if (!profile.active) status = 'inactive';
  else status = 'ready';

  const login = async (loginId: string, password: string) => {
    await signInWithEmailAndPassword(auth, toAuthEmail(loginId), password);
  };

  const logout = async () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(CACHE_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    await signOut(auth);
  };

  const changePassword = async (current: string, next: string) => {
    const u = auth.currentUser;
    if (!u || !u.email) throw new Error('not signed in');
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
    await updatePassword(u, next);
    if (profile?.mustChangePassword) {
      await updateDoc(doc(db, 'authProfiles', u.uid), { mustChangePassword: false });
    }
  };

  const bootstrapAdmin: AuthContextType['bootstrapAdmin'] = async ({ name, loginId, password, phone }) => {
    setBusy(true);
    try {
      const email = toAuthEmail(loginId);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      // Order matters: the rules let the very first admin create their own
      // profile, then the bootstrap marker locks that path for everyone else.
      await setDoc(doc(db, 'authProfiles', uid), {
        uid,
        email,
        loginId,
        name,
        userId: uid,
        role: 'admin',
        active: true,
      });
      await setDoc(doc(db, 'meta', 'bootstrap'), { createdBy: uid, createdAt: new Date().toISOString() });
      const adminUser: User = {
        id: uid,
        name,
        email,
        phone,
        role: 'admin',
        active: true,
        createdAt: new Date().toISOString(),
        authUid: uid,
      };
      await setDoc(doc(db, 'users', uid), adminUser);
      setNeedsBootstrap(false);
    } finally {
      setBusy(false);
    }
  };

  const createStaffLogin: AuthContextType['createStaffLogin'] = async ({
    userId,
    loginId,
    password,
    name,
    role,
    branchId,
  }) => {
    // Preferred: the server creates the account (the browser can then be denied sign-up entirely).
    const serverUid = await createLoginOnServer(userId, normalizeLoginId(loginId), password);
    if (serverUid) return serverUid;
    // Fallback until the server key is installed. A secondary app instance keeps the admin's own session untouched.
    const secondary = getApps().some((a) => a.name === 'staff-creator')
      ? getApp('staff-creator')
      : initializeApp(firebaseConfig, 'staff-creator');
    const secondaryAuth = getAuth(secondary);
    const email = toAuthEmail(loginId);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;
    await signOut(secondaryAuth);
    await setDoc(doc(db, 'authProfiles', uid), {
      uid,
      email,
      loginId,
      name,
      userId,
      role,
      ...(branchId ? { branchId } : {}),
      active: true,
    });
    return uid;
  };

  return (
    <AuthContext.Provider
      value={{
        status,
        profile,
        needsBootstrap,
        login,
        logout,
        changePassword,
        bootstrapAdmin,
        createStaffLogin,
        signedInAs: { email: fbUser?.email ?? null, uid: fbUser?.uid ?? null },
        isFounder,
        restoreFounder,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
