import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [adminStatus, setAdminStatus] = useState("unknown"); // unknown | checking | admin | not_admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [error, setError] = useState(null);

  const refreshAdmin = async () => {
    setAdminStatus("checking");
    setError(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "GET",
        credentials: "include",
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) {
        throw new Error(`ADMIN_SESSION_${res.status}`);
      }
      const data = await res.json();
      const loggedIn = Boolean(data?.loggedIn);
      setIsAdmin(loggedIn);
      setAdmin(data?.admin ?? null);
      setAdminStatus(loggedIn ? "admin" : "not_admin");
    } catch (e) {
      setIsAdmin(false);
      setAdmin(null);
      setError(e?.message ?? "ADMIN_SESSION_ERROR");
      setAdminStatus("not_admin");
    }
  };

  useEffect(() => {
    refreshAdmin();
  }, []);

  const value = useMemo(
    () => ({ adminStatus, isAdmin, admin, error, refreshAdmin }),
    [adminStatus, isAdmin, admin, error]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    // Fail-soft so pages don’t crash if Provider isn’t wired yet
    return { adminStatus: "unknown", isAdmin: false, admin: null, error: null, refreshAdmin: async () => {} };
  }
  return ctx;
}

export default AdminProvider;
