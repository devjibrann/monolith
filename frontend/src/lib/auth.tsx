"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  createOrganization,
  fetchOrganizations,
  logout as apiLogout,
  type Organization,
  type User,
} from "./api";

type AuthContextValue = {
  user: User | null;
  organizations: Organization[];
  currentOrg: Organization | null;
  isLoading: boolean;
  setCurrentOrg: (org: Organization) => void;
  refreshOrganizations: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setCurrentOrg = useCallback((org: Organization) => {
    localStorage.setItem("orgSlug", org.slug);
    setCurrentOrgState(org);
  }, []);

  const refreshOrganizations = useCallback(async () => {
    const orgs = await fetchOrganizations();
    setOrganizations(orgs);
    const savedSlug = localStorage.getItem("orgSlug");
    const match = orgs.find((o) => o.slug === savedSlug) ?? orgs[0] ?? null;
    if (match) setCurrentOrg(match);
    else setCurrentOrgState(null);
  }, [setCurrentOrg]);

  useEffect(() => {
    let active = true;

    (async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      if (!token || !storedUser) {
        router.replace("/login");
        return;
      }

      try {
        if (active) setUser(JSON.parse(storedUser) as User);
      } catch {
        localStorage.clear();
        router.replace("/login");
        return;
      }

      try {
        await refreshOrganizations();
      } catch {
        localStorage.clear();
        router.replace("/login");
      }
    })().finally(() => {
      if (active) setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [router, refreshOrganizations]);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore */
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("orgSlug");
    setUser(null);
    setOrganizations([]);
    setCurrentOrgState(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      organizations,
      currentOrg,
      isLoading,
      setCurrentOrg,
      refreshOrganizations,
      signOut,
    }),
    [
      user,
      organizations,
      currentOrg,
      isLoading,
      setCurrentOrg,
      refreshOrganizations,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function persistSession(token: string, user: User) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export { createOrganization };
