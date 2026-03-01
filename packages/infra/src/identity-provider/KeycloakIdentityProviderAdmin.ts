import KcAdminClient from "@keycloak/keycloak-admin-client";
import { IIdentityProviderAdmin } from "../interfaces/IIdentityProviderAdmin";
import { IIdentityProviderCreateUser } from "../interfaces/IIdentityProviderCreateUser";

/**
 * Keycloak implementation of identity provider ports.
 * Adapts Keycloak Admin Client for admin operations and user creation (signup).
 * Caller must authenticate the client (e.g. admin auth) before createUser.
 */
export class KeycloakIdentityProviderAdmin
  implements IIdentityProviderAdmin, IIdentityProviderCreateUser
{
  constructor(private readonly kcAdmin: KcAdminClient) {}

  async createUser(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<string> {
    const kcUser = await this.kcAdmin.users.create({
      username: input.email,
      email: input.email,
      firstName: input.name,
      enabled: true,
      credentials: [
        {
          type: "password",
          value: input.password,
          temporary: false,
        },
      ],
    });
    const id = kcUser.id;
    if (!id) {
      throw new Error("Identity provider did not return user ID");
    }
    return id;
  }

  async disableUser(externalUserId: string): Promise<void> {
    await this.kcAdmin.users.update({ id: externalUserId }, { enabled: false });
  }

  async enableUser(externalUserId: string): Promise<void> {
    await this.kcAdmin.users.update({ id: externalUserId }, { enabled: true });
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
