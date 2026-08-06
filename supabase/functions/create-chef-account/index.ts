// Sets up a chef with a real, immediately-usable email+password login,
// created directly by staff (no invite email involved — see README.md in
// this repo's root for the reasoning). Needs the service-role key, so this
// can only run server-side as an Edge Function, never in the client app.
//
// Re-running this for an email that already has a chef account created
// through this same function just resets that account's password —
// deliberately doubles as a simple "reset this chef's password" tool.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    // Confirm the caller is a signed-in staff member, not just anyone
    // holding the public anon key — this endpoint uses the service role
    // internally, so it must gate on identity itself rather than relying
    // on RLS the way normal client queries do.
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) return json({ error: "Not signed in" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: staffRow } = await admin
      .from("mn_staff_users")
      .select("user_id")
      .eq("user_id", caller.id)
      .maybeSingle();
    if (!staffRow) return json({ error: "Staff only" }, 403);

    const { email, password, business_name, contact_name, phone, delivery_zone } = await req.json();
    if (!email || !password || !business_name) {
      return json({ error: "email, password and business_name are required" }, 400);
    }
    if (String(password).length < 8) {
      return json({ error: "Password must be at least 8 characters" }, 400);
    }

    const { data: existingChef, error: existingChefError } = await admin
      .from("mn_chefs")
      .select("id, user_id")
      .eq("email", email)
      .maybeSingle();
    if (existingChefError) return json({ error: existingChefError.message }, 500);

    let userId: string;
    if (existingChef?.user_id) {
      const { data, error } = await admin.auth.admin.updateUserById(existingChef.user_id, { password });
      if (error) return json({ error: error.message }, 500);
      userId = data.user.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) return json({ error: error.message }, 500);
      userId = data.user.id;
    }

    const chefFields = { business_name, contact_name, email, phone, delivery_zone, user_id: userId, active: true };
    const { data: chefRow, error: chefError } = existingChef
      ? await admin.from("mn_chefs").update(chefFields).eq("id", existingChef.id).select().single()
      : await admin.from("mn_chefs").insert(chefFields).select().single();
    if (chefError) return json({ error: chefError.message }, 500);

    return json({ chef: chefRow, password });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
