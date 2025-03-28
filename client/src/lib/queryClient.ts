import { QueryClient, QueryFunction } from "@tanstack/react-query";

// JWT token storage
let authToken: string | null = null;

// Set the JWT token for requests
export function setAuthToken(token: string | null) {
  console.log("Setting auth token:", token ? "Token provided" : "Token cleared");
  authToken = token;
}

// Get authorization headers depending on token presence
function getAuthHeaders() {
  const headers: Record<string, string> = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  };
  
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    console.log(`API Request: ${method} ${url}`, data);
    
    const headers = getAuthHeaders();
    if (data) {
      headers["Content-Type"] = "application/json";
    }
    
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      // Prevent caching for auth requests
      cache: "no-store",
    });

    console.log(`API Response: ${method} ${url}`, { 
      status: res.status, 
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      token: authToken ? "Present" : "None"
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API request error for ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      console.log(`Query Request: GET ${queryKey[0]}`, { token: authToken ? "Present" : "None" });
      
      const res = await fetch(queryKey[0] as string, {
        headers: getAuthHeaders(),
        // Ensure we're not using cache for auth endpoints
        cache: "no-store"
      });

      console.log(`Query Response: GET ${queryKey[0]}`, { 
        status: res.status, 
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        token: authToken ? "Present" : "None"
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`${queryKey[0]} returned 401, returning null as configured`);
        return null;
      }

      await throwIfResNotOk(res);
      
      // Check for empty response
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        console.log(`Query Data: GET ${queryKey[0]}`, data);
        return data;
      } else {
        console.log(`Query Data: GET ${queryKey[0]} - No JSON content`);
        return null;
      }
    } catch (error) {
      console.error(`Query error for ${queryKey[0]}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      refetchIntervalInBackground: false,
      staleTime: 0, // Always refetch
      retry: 1, // Retry once in case of network issues
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
