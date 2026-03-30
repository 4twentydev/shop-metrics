import { toNextJsHandler } from "better-auth/integrations/next-js";

import { auth } from "@/lib/auth/server";

export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(auth);
