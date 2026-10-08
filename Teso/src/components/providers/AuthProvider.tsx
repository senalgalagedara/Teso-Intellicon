"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthProvider as SupabaseAuthProvider, useAuth as useSupabaseAuth } from "@teso/auth/hooks";

// Minimal User interface to satisfy basic usage and avoid imports from firebase
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  metadata: any;
  providerData: any[];
  refreshToken: string;
  tenantId: string | null;
  delete: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  getIdTokenResult: (forceRefresh?: boolean) => Promise<any>;
  reload: () => Promise<void>;
  toJSON: () => object;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
});

const AuthConsumer = ({ children }: { children: React.ReactNode }) => {
  const { session, user: sbUser, role: sbRole, loading } = useSupabaseAuth();
  
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (sbUser) {
        const r = sbRole || "STUDENT";
        setRole(r);
        setUser({
          uid: sbUser.id,
          email: sbUser.email || null,
          displayName: (sbUser.user_metadata?.first_name + ' ' + sbUser.user_metadata?.last_name).trim() || sbUser.email?.split('@')[0] || null,
          photoURL: sbUser.user_metadata?.avatar_url || null,
          emailVerified: !!sbUser.email_confirmed_at,
          isAnonymous: false,
          metadata: {},
          providerData: [],
          refreshToken: "",
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => session?.access_token || "",
          getIdTokenResult: async () => ({ claims: { role: r } }),
          reload: async () => {},
          toJSON: () => ({}),
        });
    } else {
        setUser(null);
        setRole(null);
    }
  }, [sbUser, sbRole, session]);

  return (
    <AuthContext.Provider value={{ user, loading, role }}>
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SupabaseAuthProvider>
      <AuthConsumer>{children}</AuthConsumer>
    </SupabaseAuthProvider>
  );
};

export const useAuth = () => useContext(AuthContext);
