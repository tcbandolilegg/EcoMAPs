/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, ActionCodeSettings } from 'firebase/auth';
import { auth, db, doc, getDoc, setDoc, signInWithPopup, signInWithRedirect, getRedirectResult, googleProvider, signOut, serverTimestamp, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, deleteDoc, query, collection, where, getDocs, handleFirestoreError, OperationType } from '../lib/firebase';
import { Language, UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, data: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Standard provider config
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    // Handle redirect result
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        console.log("Logged in via redirect:", result.user.email);
      }
    }).catch((error) => {
      console.error("Redirect login error details:", {
        code: error.code,
        message: error.message,
        domain: window.location.hostname
      });
      if (error.code === 'auth/unauthorized-domain') {
        alert("Erro: Domínio não autorizado no Console do Firebase. Adicione " + window.location.hostname + " em Authentication > Settings > Authorized domains.");
      }
    });

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        let userDoc;
        try {
          userDoc = await getDoc(userDocRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          return;
        }
        
        // If profile doesn't exist by UID, check for pre-registration by email
        if (!userDoc.exists() && user.email) {
          const emailDocRef = doc(db, 'users', user.email.toLowerCase());
          try {
            const emailDoc = await getDoc(emailDocRef);
            
            if (emailDoc.exists()) {
              const preRegData = emailDoc.data() as UserProfile;
              // Migrate: Create UID doc and delete Email doc
              await setDoc(userDocRef, { 
                ...preRegData, 
                createdAt: preRegData.createdAt || serverTimestamp(),
                lastLogin: serverTimestamp() 
              });
              await deleteDoc(emailDocRef);
              userDoc = await getDoc(userDocRef);
            }
          } catch (error) {
            console.error("Migration/Check error:", error);
          }
        }

        if (userDoc?.exists()) {
          const data = userDoc.data() as UserProfile;
          // Security: In case the user was already registered as 'user' but is the admin email
          const isMaster = user.email?.toLowerCase() === 'tcbandolilegg@gmail.com';
          if (isMaster && data.role !== 'admin') {
            try {
              await setDoc(doc(db, 'users', user.uid), { ...data, role: 'admin' }, { merge: true });
            } catch (err) {
              console.error("Admin role upgrade failed:", err);
            }
            setProfile({ ...data, role: 'admin' });
          } else {
            setProfile(data);
          }
        } else {
          // New user registration (standard Google case)
          const isMaster = user.email?.toLowerCase() === 'tcbandolilegg@gmail.com';
          const role = isMaster ? 'admin' : 'user';
          const newProfile: UserProfile = {
            email: user.email,
            role: role as any,
            createdAt: serverTimestamp(),
          };
          try {
            await setDoc(doc(db, 'users', user.uid), newProfile);
            setProfile(newProfile);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubAuth();
  }, []);

  const login = async () => {
    try {
      // Check if it's mobile to choose method
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error: any) {
      if (error?.code === 'auth/cancelled-popup-request' || error?.code === 'auth/popup-closed-by-user') {
        console.warn("Login cancelled by user or multiple requests.");
        return;
      }
      console.error("Login failed:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const register = async (email: string, pass: string, additionalData: Partial<UserProfile>) => {
    try {
      // Check if email already exists in Firestore users collection
      const emailLower = email.toLowerCase();
      
      // Check for document with email as ID (pre-registered)
      const emailDocRef = doc(db, 'users', emailLower);
      const emailDoc = await getDoc(emailDocRef);
      if (emailDoc.exists()) {
        throw new Error("Este e-mail já está cadastrado.");
      }

      // Check for any document with this email in the field
      const q = query(collection(db, 'users'), where('email', '==', emailLower));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        throw new Error("Este e-mail já está cadastrado.");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;

      // Send verification email with continue URL
      const actionCodeSettings: ActionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };
      await sendEmailVerification(user, actionCodeSettings);

      const role = email === 'tcbandolilegg@gmail.com' ? 'admin' : 'user';
      const newProfile: UserProfile = {
        email,
        role: role as any,
        createdAt: serverTimestamp(),
        ...additionalData
      };

      try {
        await setDoc(doc(db, 'users', user.uid), newProfile);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
      }
      setProfile(newProfile);
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithEmail, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
