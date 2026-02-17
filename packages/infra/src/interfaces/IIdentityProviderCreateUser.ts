/**
 * Port for creating a user in the identity provider (e.g. signup flow).
 * Caller is responsible for ensuring the IdP client is authenticated (e.g. admin auth)
 * before calling createUser.
 */
export interface IIdentityProviderCreateUser {
  /**
   * Create a user in the identity provider with credentials.
   * @returns The external user id (e.g. Keycloak user id) to link with the app user
   */
  createUser(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<string>;
}
