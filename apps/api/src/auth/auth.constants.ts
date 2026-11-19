export const AUTH_USER = Symbol('AUTH_USER');

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  accessToken: string;
};
