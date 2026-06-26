import { useAuthStore } from "../store/authStore";

const BASE_URL = "/api";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch(path: string, options: RequestOptions = {}) {
  const { skipAuth = false, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);

  // Set Content-Type by default to application/json if sending a body
  if (fetchOptions.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Inject Access Token
  if (!skipAuth) {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  fetchOptions.headers = headers;

  const url = `${BASE_URL}${path}`;
  let response = await fetch(url, fetchOptions);

  // If unauthorized, try to refresh tokens
  if (response.status === 403 || response.status === 401) {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          // Fetch current user details to update login state
          const meResponse = await fetch(`${BASE_URL}/auth/me`, {
            headers: {
              "Authorization": `Bearer ${data.access_token}`,
            }
          });
          
          if (meResponse.ok) {
            const meData = await meResponse.json();
            useAuthStore.getState().login(data.access_token, data.refresh_token, meData);
            
            // Retry the original failed request
            headers.set("Authorization", `Bearer ${data.access_token}`);
            fetchOptions.headers = headers;
            response = await fetch(url, fetchOptions);
            return response;
          }
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
      }
    }

    // Refresh failed or no refresh token, perform logout
    useAuthStore.getState().logout();
  }

  return response;
}

// Wrapper utilities
export const api = {
  get: async (path: string, options: RequestOptions = {}) => {
    const response = await apiFetch(path, { ...options, method: "GET" });
    if (!response.ok) {
      throw new Error(`API GET request failed with status ${response.status}`);
    }
    return response.json();
  },
  post: async (path: string, body?: any, options: RequestOptions = {}) => {
    const response = await apiFetch(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`API POST request failed with status ${response.status}`);
    }
    return response.json();
  },
  delete: async (path: string, options: RequestOptions = {}) => {
    const response = await apiFetch(path, { ...options, method: "DELETE" });
    if (!response.ok) {
      throw new Error(`API DELETE request failed with status ${response.status}`);
    }
    return response.json();
  },
};
