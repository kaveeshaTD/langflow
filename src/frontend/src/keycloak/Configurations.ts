import Keycloak from "keycloak-js";

import {
  KEYCLOACK_AUTH_URL,
  KEYCLOACK_CLIENTID,
  KEYCLOACK_REALM,
} from "../config";

// Initialize Keycloak
const keycloak = new (Keycloak as any)({
  url: KEYCLOACK_AUTH_URL,
  realm: KEYCLOACK_REALM,
  clientId: KEYCLOACK_CLIENTID,
});

export default keycloak;
