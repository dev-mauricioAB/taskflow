/**
 * Port for identity provider administration operations.
 * Abstracts operations needed to sync user state with an external identity provider
 * (e.g., Keycloak, Auth0). This allows the application layer to remain agnostic
 * of the specific identity provider implementation.
 */
export interface IIdentityProviderAdmin {
  /**
   * Disable a user in the identity provider (e.g., soft delete scenario).
   * @param externalUserId - The user's ID in the identity provider system
   */
  disableUser(externalUserId: string): Promise<void>;

  /**
   * Enable a user in the identity provider (e.g., reactivation scenario).
   * @param externalUserId - The user's ID in the identity provider system
   */
  enableUser(externalUserId: string): Promise<void>;

  /**
   * Update user attributes in the identity provider.
   * @param externalUserId - The user's ID in the identity provider system
   * @param updates - Fields to update (only provided fields will be updated)
   */
  updateUser(
    externalUserId: string,
    updates: {
      firstName?: string;
      email?: string;
      enabled?: boolean;
    },
  ): Promise<void>;
}
