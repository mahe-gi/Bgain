import type { Role, SafeUser } from "./auth.js";

export type { Role, SafeUser };

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}
