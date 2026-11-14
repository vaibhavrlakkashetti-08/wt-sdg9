import { createContext, useEffect, useState } from "react";
import { getCurrentUser, loginAccount, logoutAccount, registerAccount } from "../services/apiClient.js";
import { SESSION_EXPIRED_EVENT } from "../services/session-events.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");

    getCurrentUser({ signal: controller.signal })
      .then((currentUser) => {
        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setUser(null);
        setStatus(error.response?.status === 401 ? "anonymous" : "error");
      });

    return () => controller.abort();
  }, [refreshKey]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setStatus("anonymous");
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  async function establishSession(request) {
    setStatus("loading");
    try {
      await request();
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setStatus("authenticated");
      return currentUser;
    } catch (error) {
      setUser(null);
      setStatus("anonymous");
      throw error;
    }
  }

  async function login(credentials) {
    return establishSession(() => loginAccount(credentials));
  }

  async function register(credentials) {
    return establishSession(() => registerAccount(credentials));
  }

  async function logout() {
    await logoutAccount();
    setUser(null);
    setStatus("anonymous");
  }

  const refresh = () => setRefreshKey((key) => key + 1);
  return <AuthContext.Provider value={{ user, status, login, register, logout, refresh }}>{children}</AuthContext.Provider>;
}