import KcAdminClient from "@keycloak/keycloak-admin-client";
import { IIdentityProviderAdmin } from "../interfaces/IIdentityProviderAdmin";

/**
 * Keycloak implementation of IIdentityProviderAdmin.
 * Adapts Keycloak Admin Client operations to the identity provider port.
 */
export class KeycloakIdentityProviderAdmin implements IIdentityProviderAdmin {
  constructor(private readonly kcAdmin: KcAdminClient) {}

  async disableUser(externalUserId: string): Promise<void> {
    await this.kcAdmin.users.update(
      { id: externalUserId },
      { enabled: false },
    );
  }

  async enableUser(externalUserId: string): Promise<void> {
    await this.kcAdmin.users.update(
      { id: externalUserId },
      { enabled: true },
    );
  }

  async updateUser(
    externalUserId: string,
    updates: {
      firstName?: string;
      email?: string;
      enabled?: boolean;
    },
  ): Promise<void> {
    const kcUpdate: Record<string, any> = {};
    if (updates.firstName !== undefined) {
      kcUpdate.firstName = updates.firstName;
    }
    if (updates.email !== undefined) {
      kcUpdate.email = updates.email;
    }
    if (updates.enabled !== undefined) {
      kcUpdate.enabled = updates.enabled;
    }

    if (Object.keys(kcUpdate).length > 0) {
      await this.kcAdmin.users.update({ id: externalUserId }, kcUpdate);
    }
  }
}
