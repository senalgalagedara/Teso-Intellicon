import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
