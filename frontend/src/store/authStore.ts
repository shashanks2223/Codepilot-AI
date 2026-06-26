import { create } from "zustand";

interface UserProfile {
  id: number;
  username: string;
  email: string | null;
  avatar_url: string | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: UserProfile) => void;
  logout: () => void;
  updateUser: (user: UserProfile) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Read tokens from localStorage on initialize
  const initialAccessToken = localStorage.getItem("accessToken");
  const initialRefreshToken = localStorage.getItem("refreshToken");
  const storedUser = localStorage.getItem("user");
  const initialUser = storedUser ? JSON.parse(storedUser) : null;

  return {
    accessToken: initialAccessToken,
    refreshToken: initialRefreshToken,
    user: initialUser,
    isAuthenticated: !!initialAccessToken,
    login: (accessToken, refreshToken, user) => {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));
      set({
        accessToken,
        refreshToken,
        user,
        isAuthenticated: true,
      });
    },
    logout: () => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      set({
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
      });
    },
    updateUser: (user) => {
      localStorage.setItem("user", JSON.stringify(user));
      set({ user });
    },
  };
});
