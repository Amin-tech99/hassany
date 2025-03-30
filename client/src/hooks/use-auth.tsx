import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, registerSchema, loginSchema } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient, setAuthToken } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Response types from our JWT-based auth endpoints
interface LoginResponse {
  user: SelectUser;
  token: string;
}

interface RegisterResponse {
  user: SelectUser;
  token: string;
}

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<LoginResponse, Error, z.infer<typeof loginSchema>>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<RegisterResponse, Error, z.infer<typeof registerSchema>>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

// Get token from localStorage
const getStoredToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Save token to localStorage
const saveToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
  setAuthToken(token);
};

// Remove token from localStorage
const removeToken = (): void => {
  localStorage.removeItem('auth_token');
  setAuthToken(null);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize auth token from localStorage on component mount
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      console.log("Found stored token, setting it for API requests");
      setAuthToken(token);
    } else {
      console.log("No stored token found");
    }
  }, []);
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0, // Always refetch to keep session alive
    onSuccess: (data) => {
      console.log("Auth successful, user data:", data);
      if (data) {
        console.log("User is authenticated");
      }
    },
    onError: (error) => {
      // If there's an auth error, clear the token
      console.log("Auth error, removing token:", error);
      removeToken();
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof loginSchema>) => {
      console.log("Attempting login with:", credentials);
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json() as LoginResponse;
    },
    onSuccess: (data: LoginResponse) => {
      console.log("Login successful, received:", data);
      
      // Save token to localStorage
      saveToken(data.token);
      
      // Update user data in React Query cache
      queryClient.setQueryData(["/api/user"], data.user);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.fullName}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: z.infer<typeof registerSchema>) => {
      console.log("Attempting registration with:", userData);
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json() as RegisterResponse;
    },
    onSuccess: (data: RegisterResponse) => {
      console.log("Registration successful, received:", data);
      
      // Save token to localStorage
      saveToken(data.token);
      
      // Update user data in React Query cache
      queryClient.setQueryData(["/api/user"], data.user);
      
      toast({
        title: "Registration successful",
        description: `Welcome, ${data.user.fullName}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // For JWT, we just make a request to inform the server (optional)
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear token from localStorage
      removeToken();
      
      // Clear cached queries and user data
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out."
      });
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
      
      // Even if the server logout fails, we should still clear the token
      removeToken();
      queryClient.setQueryData(["/api/user"], null);
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
