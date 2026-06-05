import { cache } from "react";
import { createClient } from "./server";

/** One auth lookup per request (layout + pages share the result). */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});
