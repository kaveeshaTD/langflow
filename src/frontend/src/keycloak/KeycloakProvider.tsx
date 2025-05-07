import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback
} from 'react';
import keycloak from './Configurations';
// import { useMessage } from '../customHooks/useShowMessage';
// import { Loader } from '../components/common/Loader';

interface KeycloakContextProps {
  authenticated: boolean;
  token: string | null;
}

const KeycloakContext = createContext<KeycloakContextProps>({
  authenticated: false,
  token: null
});

interface KeycloakProviderProps {
  children: ReactNode;
  roles: string[];
}

export function KeycloakProvider({ children, roles }: KeycloakProviderProps) {
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);
  // const { showMessage } = useMessage();

  useEffect(() => {
    initializeKeycloak();
  }, []);

  const authenticate = useCallback(async () => {
    try {
      const authenticatedResponse = await keycloak.init({
        onLoad: 'login-required',
        checkLoginIframe: false
      });

      if (authenticatedResponse) {
        const access_Token = keycloak.token || '';
        setToken(access_Token);
        sessionStorage.setItem('access_token', access_Token);
        setAuthenticated(true);

        // Refresh token logic
        startTokenRefresh();
      } else {
        setAuthenticated(false);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      // showMessage({
      //   type: 'error',
      //   title: 'Authentication Error',
      //   message:
      //     'An error occurred during authentication. Please try again later.'
      // });
      setAuthenticated(false);
    }
  }, []); //"showMessage" make empty dependency

  const initializeKeycloak = async () => {
    setLoading(true);
    try {
      await authenticate();
    } catch (error) {
      console.error('Initialization error:', error);
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
          const newToken = keycloak.token || '';
          setToken(newToken);
          sessionStorage.setItem('access_token', newToken);
          console.log('Token refreshed successfully');
        }
      } catch (error) {
        console.error('Token refresh error:', error);
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
    () => ({ authenticated, token }),
    [authenticated, token]
  );

  // Role-based authentication
  const hasRequiredRole = useMemo(() => {
    if (roles.length > 0) {
      return roles.some((role) => keycloak.hasResourceRole(role));
    }
    return true;
  }, [roles, loading]);

  //display loader until auth flow complete
  if (loading)
    return (
      <div className="wr-spinner">
        {/* <Loader variant="spinner" /> */}
      </div>
    );

  if (!loading && (!authenticated || !hasRequiredRole)) {
    keycloak.logout();
  }

  return (
    <KeycloakContext.Provider value={authenticationStatus}>
      {children}
    </KeycloakContext.Provider>
  );
}

export default KeycloakContext;
