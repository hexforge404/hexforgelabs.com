import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const AdminContext = createContext(null);

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 8000,
});

export function AdminProvider({ children }) {
  const [adminStatus, setAdminStatus] = useState("unknown"); // unknown | checking | admin | not_admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [error, setError] = useState(null);

  const refreshAdmin = async () => {
    setAdminStatus("checking");
    setError(null);
    try {
      const res = await api.get("/admin/session");
      const loggedIn = Boolean(res?.data?.loggedIn);
      setIsAdmin(loggedIn);
      setAdmin(res?.data?.admin ?? null);
      setAdminStatus(loggedIn ? "admin" : "not_admin");
    } catch (e) {
      setIsAdmin(false);
      setAdmin(null);
      setError(e?.response?.data ?? e?.message ?? "ADMIN_SESSION_ERROR");
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
  // Fail-soft so pages don’t crash if Provider isn’t wired yet
  if (!ctx) {
    return { adminStatus: "unknown", isAdmin: false, admin: null, error: null, refreshAdmin: async () => {} };
  }
  return ctx;
}
