import "server-only";
import { auth } from "./auth/server";
export const getAuth = () => auth;
