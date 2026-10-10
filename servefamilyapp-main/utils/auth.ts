import AsyncStorage from "@react-native-async-storage/async-storage";

// export const API_BASE_URL = "https://testapi.servefamily.com/api/docs/#/";
export const API_BASE_URL = "https://api.medi.lk/api";

const REQUEST_MIN_INTERVAL_MS = 1000;
const inFlightRequests = new Map<string, Promise<Response>>();
const lastRequestTimestamps = new Map<string, number>();

type EnhancedRequestInit = RequestInit & {
  skipThrottle?: boolean;
  throttleKey?: string;
  minIntervalMs?: number;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const executeThrottledRequest = async (
  throttleKey: string,
  interval: number,
  requestFactory: () => Promise<Response>
): Promise<Response> => {
  const existingInFlight = inFlightRequests.get(throttleKey);

  if (existingInFlight) {
    try {
      await existingInFlight;
    } catch (error) {
      console.warn("Previous request failed for", throttleKey, error);
    }
  }

  const lastTimestamp = lastRequestTimestamps.get(throttleKey);
  if (lastTimestamp) {
    const elapsed = Date.now() - lastTimestamp;
    if (elapsed < interval) {
      await sleep(interval - elapsed);
    }
  }

  const inFlightPromise = (async () => {
    try {
      return await requestFactory();
    } finally {
      lastRequestTimestamps.set(throttleKey, Date.now());
      inFlightRequests.delete(throttleKey);
    }
  })();

  inFlightRequests.set(throttleKey, inFlightPromise);
  return inFlightPromise;
};




/**
 * Authenticates the user with Google using the provided ID token
 * @param idToken - The Google ID token obtained from Google Sign-In
 * @returns The fetch response
 */
export const loginWithGoogle = async (idToken: string): Promise<Response> => {
  return fetch(`${API_BASE_URL}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      idToken: idToken,
    }),
  });
};
/**
 * Stores the authentication tokens in AsyncStorage
 * @param accessToken - The access token
 * @param refreshToken - The refresh token (optional)
 */
export const storeTokens = async (accessToken: string, refreshToken?: string): Promise<void> => {
  await AsyncStorage.setItem("authToken", accessToken);
  if (refreshToken) {
    await AsyncStorage.setItem("refreshToken", refreshToken);
  }
};


// Token refresh lock to prevent concurrent refresh attempts
let refreshPromise: Promise<string | null> | null = null;
let isRefreshing = false;

/**
 * Refreshes the access token using the stored refresh token
 * Uses a lock mechanism to prevent concurrent refresh attempts
 * @returns The new access token or null if refresh fails
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  // If a refresh is already in progress, wait for it to complete
  if (isRefreshing && refreshPromise) {
    console.log("Token refresh already in progress, waiting...");
    return refreshPromise;
  }

  // Start a new refresh
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await AsyncStorage.getItem("refreshToken");

      if (!refreshToken) {
        console.warn("No refresh token found");
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          refreshToken: refreshToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // Store the new access token
        await AsyncStorage.setItem("authToken", data.token);

        // Store the new refresh token if provided
        if (data.refreshToken) {
          await AsyncStorage.setItem("refreshToken", data.refreshToken);
        }

        console.log("Token refreshed successfully");
        return data.token;
      } else {
        console.error("Token refresh failed:", data);

        // If refresh fails, clear tokens
        await AsyncStorage.removeItem("authToken");
        await AsyncStorage.removeItem("refreshToken");

        return null;
      }
    } catch (error) {
      console.error("Error refreshing token:", error);

      // Clear tokens on error
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("refreshToken");

      return null;
    } finally {
      // Reset the lock
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Gets the current access token, refreshing it if needed
 * @returns The access token or null if unavailable
 */
export const getAccessToken = async (): Promise<string | null> => {
  const token = await AsyncStorage.getItem("authToken");
  return token;
};

/**
 * Checks if user is authenticated (has both access and refresh tokens)
 * @returns true if both tokens exist, false otherwise
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const accessToken = await AsyncStorage.getItem("authToken");
  const refreshToken = await AsyncStorage.getItem("refreshToken");
  return !!(accessToken && refreshToken);
};

/**
 * Makes an authenticated API request with automatic token refresh on 401 errors
 * @param url - The API endpoint URL
 * @param options - Fetch options (method, headers, body, etc.)
 * @param retryAttempt - Internal parameter to track retry attempts
 * @returns The fetch response
 */
export const authenticatedFetch = async (
  url: string,
  options: EnhancedRequestInit = {},
  retryAttempt: number = 0
): Promise<Response> => {
  const MAX_RETRIES = 1;
  const { skipThrottle = false, throttleKey, minIntervalMs, ...fetchOptions } =
    options;

  const method = (fetchOptions.method ?? "GET").toUpperCase();
  const shouldThrottle = !skipThrottle && method === "GET";
  const throttleKeyToUse = throttleKey ?? `${method}:${url}`;
  const effectiveInterval = minIntervalMs ?? REQUEST_MIN_INTERVAL_MS;

  const performRequest = async (authToken?: string | null) => {
    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string> | undefined),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    };

    return fetch(url, {
      ...fetchOptions,
      headers,
    });
  };

  // Get the current access token
  let token = await getAccessToken();

  const response = shouldThrottle
    ? await executeThrottledRequest(throttleKeyToUse, effectiveInterval, () =>
        performRequest(token)
      )
    : await performRequest(token);

  // If we get a 401 (Unauthorized), try to refresh the token and retry
  if (response.status === 401 && retryAttempt < MAX_RETRIES) {
    console.log("Token expired, attempting refresh...");

    const newToken = await refreshAccessToken();

    if (newToken) {
      // Retry the request with the new token. Skip throttling to avoid extra delay.
      return authenticatedFetch(
        url,
        {
          ...fetchOptions,
          skipThrottle: true,
          throttleKey: throttleKeyToUse,
          minIntervalMs: effectiveInterval,
        },
        retryAttempt + 1
      );
    } else {
      // Refresh failed, return the original response
      return response;
    }
  }

  return response;
};

/**
 * Logs out the user by calling the logout API endpoint and clearing all stored tokens
 */
export const logout = async (): Promise<void> => {
  try {
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    
    // Call the logout API endpoint if we have a refresh token
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            refreshToken: refreshToken,
          }),
        });
      } catch (apiError) {
        // Continue with token clearing even if API call fails
        console.error("Error calling logout API:", apiError);
      }
    }
    
    // Clear tokens regardless of API call success/failure
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("refreshToken");
  } catch (error) {
    console.error("Error during logout:", error);
    // Still try to clear tokens even if there's an error
    try {
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("refreshToken");
    } catch (clearError) {
      console.error("Error clearing tokens:", clearError);
    }
  }
};
/**
 * Retrieves the current user profile from AsyncStorage
 * @returns The user object or null if not found
 */
export const getCurrentUser = async (): Promise<any> => {
  try {
  const user =  await fetch(`${API_BASE_URL}/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        Authorization: `Bearer ${await getAccessToken()}`,
      },
    }).then(res => res.json());
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};


export const getCurrentPlanName = async (): Promise<string> => {
  try {
    const plan = await fetch(`${API_BASE_URL}/subscription/current`, { 
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        Authorization: `Bearer ${await getAccessToken()}`,
      },
    }).then(res => res.json());
    console.log("Current subscription plan:", plan);
    return plan.data.Plan.name;
  } catch (error) {
    console.error("Error getting current plan:", error);
    return "Free";
  }
};

export const getPlanId = async (planName: string): Promise<string> => {  
  try {
    const plans = await fetch(`${API_BASE_URL}/subscription/plans`, { 
      method: "GET",  
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        Authorization: `Bearer ${await getAccessToken()}`,
      },
    }).then(res => res.json());
    const plan = plans.data.find((p: any) => p.name === planName);
    if (!plan) {
      throw new Error(`Plan not found: ${planName}`);
    } 
    console.log(`Found plan ID for ${planName}:`, plan.id);
    return plan.id;
  } catch (error) {
    console.error("Error getting plan ID:", error);
    throw error;
  }
};

export const UpgradeToPlan = async (planId: string): Promise<Response> => {
  try {
    const response = await fetch(`${API_BASE_URL}/subscription/subscribe`, {  
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        Authorization: `Bearer ${await getAccessToken()}`,
      },
      body: JSON.stringify({ planId }),
    });
    return response;
  } catch (error) {
    console.error("Error upgrading plan:", error);
    throw error;
  }
};
