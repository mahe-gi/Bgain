import { Role } from "../generated/prisma/index.js";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface JwtPayload {
  sub: string;
}

export interface LoginResponseData {
  accessToken: string;
  user: SafeUser;
}
