import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import keycloak from "./Configurations";
// import { useMessage } from '../customHooks/useShowMessage';
// import { Loader } from '../components/common/Loader';
import { AuthContext } from "@/contexts/authContext";
import useAuthStore from "@/stores/authStore"; // import store
import { Cookies } from "react-cookie";

interface KeycloakContextProps {
  authenticated: boolean;
  token: string | null;
  logout: () => void;
}

const KeycloakContext = createContext<KeycloakContextProps>({
  authenticated: false,
  token: null,
  logout: () => {},
});

interface KeycloakProviderProps {
  children: ReactNode;
  // roles: string[];
}

export function KeycloakProvider({ children }: KeycloakProviderProps) {
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);
  // const { showMessage } = useMessage();
  const cookies = new Cookies();
  const { login } = useContext(AuthContext);

  useEffect(() => {
    initializeKeycloak();
  }, []);

//logout func
  const logout = useCallback(() => {
    keycloak.logout();
    sessionStorage.removeItem('access_token'); // Clear session storage
    setAuthenticated(false);
    setToken(null);
    cookies.remove("access_token_lf", { path: "/" });
    cookies.remove("refresh_token_lf", { path: "/" });
  }, []);

  const authenticate = useCallback(async () => {
    //manage auth store
    const setIsAuthenticated = useAuthStore.getState().setIsAuthenticated;
    const setAccessToken = useAuthStore.getState().setAccessToken;
    try {
      const authenticatedResponse = await keycloak.init({
        onLoad: "login-required",
        checkLoginIframe: false,
        redirectUri: window.location.origin + window.location.pathname,
      });

      if (authenticatedResponse) {
        const access_Token = keycloak.token || "";
        const refresh_Token = keycloak.refreshToken || ""; /// to test
        setToken(access_Token);
        // sessionStorage.setItem("access_token", access_Token);
        setAuthenticated(true);

        // to auth store Update zustand global store
        setIsAuthenticated(true);
        setAccessToken(access_Token);
        console.log("token setting to cookies keycloak");

        //set access token and refresh token  to cookies

        // cookies.set("access_token_lf", access_Token, {
        //   path: "/",
        //   httpOnly: true, // This flag makes the cookie inaccessible from JavaScript (security feature)
        //   secure: process.env.NODE_ENV === "production", // Only send cookies over HTTPS in production
        //   sameSite: "strict", // or 'Lax' based on your needs
        //   expires: new Date(Date.now() + 60 * 60 * 1000), // Expires in 1 hour (can adjust)
        // });

        // cookies.set("refresh_token_lf", refresh_Token, {
        //   path: "/",
        //   httpOnly: true,
        //   secure: process.env.NODE_ENV === "production", // Secure only in production
        //   sameSite: "strict",
        //   expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 1 day (or you can refresh as needed)
        // });
        cookies.set("access_token_lf", access_Token);
        cookies.set("refresh_token_lf", refresh_Token);

        console.log("boath token set sucessfully");

        sessionStorage.setItem("access_token_lf", access_Token);
        //document.cookie = "access_token_lf=access_Token; path=/";
        console.log("Current cookies after setting:", cookies.getAll());

        console.log("refresh token setting to cookies keycloak");
        cookies.set("refresh_token_lf", refresh_Token);
        console.log("Access Token:", access_Token);
        console.log("Refresh Token:", refresh_Token); // <- PRINT REFRESH TOKEN
        // Refresh token logic

        startTokenRefresh();
      } else {
        setAuthenticated(false);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      // showMessage({
      //   type: 'error',
      //   title: 'Authentication Error',
      //   message:
      //     'An error occurred during authentication. Please try again later.'
      // });
      setAuthenticated(false);
    }
  }, []); //"showMessage" make empty dependency

  useEffect(() => {
    console.log(
      "is authenticate log from keycloak provider ++++++++++++++___________",
      authenticated,
    );
  }, [authenticated]);

  const initializeKeycloak = async () => {
    setLoading(true);
    try {
      await authenticate();
    } catch (error) {
      console.error("Initialization error:", error);
      // showMessage({
      //   type: 'error',
      //   title: 'Initialization Error',
      //   message: 'Failed to initialize Keycloak. Please try again later.'
      // });
    } finally {
      setLoading(false);
    }
  };

  const startTokenRefresh = () => {
    const refreshInterval = setInterval(async () => {
      try {
        const refreshed = await keycloak.updateToken(60); // Refresh if token will expire in 60 seconds
        if (refreshed) {
          const newToken = keycloak.token || "";
          setToken(newToken);
          sessionStorage.setItem("access_token", newToken);
          console.log("Token refreshed successfully");
        }
      } catch (error) {
        console.error("Token refresh error:", error);
        clearInterval(refreshInterval);
        // showMessage({
        //   type: 'error',
        //   title: 'Session Expired',
        //   message: 'Your session has expired. Please log in again.'
        // });
        keycloak.logout();
      }
    }, 60000); // Check every 60 seconds
  };

  // Memoize the value passed to the context provider to prevent unnecessary re-renders
  const authenticationStatus = useMemo(
    () => ({ authenticated, token,logout }),
    [authenticated, token,logout],
  );

  // Role-based authentication
  // const hasRequiredRole = useMemo(() => {
  //   if (roles.length > 0) {
  //     return roles.some((role) => keycloak.hasResourceRole(role));
  //   }
  //   return true;
  // }, [roles, loading]);

  //display loader until auth flow complete
  if (loading)
    return (
      <div className="wr-spinner">{/* <Loader variant="spinner" /> */}</div>
    );

  // if (!loading && (!authenticated || !hasRequiredRole)) {
  //   keycloak.logout();
  // }

  return (
    <KeycloakContext.Provider value={authenticationStatus}>
      {children}
    </KeycloakContext.Provider>
  );
}

export default KeycloakContext;
