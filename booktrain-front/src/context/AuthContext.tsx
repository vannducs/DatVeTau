import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { authApi } from "../api/auth";

interface User {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      authApi.getMe()
        .then((res) => {
          if (res.data.success) {
            setUser(res.data.data);
          } else {
            logout();
          }
        })
        .catch(() => logout())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password);
    if (!res.data.success) throw new Error(res.data.message);
    const { token: t, user: u } = res.data.data;
    localStorage.setItem("token", t);
    setToken(t);
    setUser(u);
  }

  async function register(data: { email: string; password: string; fullName: string; phone?: string }) {
    const res = await authApi.register(data);
    if (!res.data.success) throw new Error(res.data.message);
    const { token: t, user: u } = res.data.data;
    localStorage.setItem("token", t);
    setToken(t);
    setUser(u);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
