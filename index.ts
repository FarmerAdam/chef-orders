// Supabase Edge Function: invite-chef
// Deploy with: supabase functions deploy invite-chef
// Set secret:  supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your service role key>
//
// Called from the chef-orders admin screen when Adam/Em add a new chef.
// Keeps the service-role key off the public front-end entirely — the
// front-end only ever holds the anon key.
//
// Request body: { email: string, business_name: string, contact_name?: string, phone?: string }
// Response: { chef_id: string } on success

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  try {
    const { email, business_name, contact_name, phone } = await req.json();
    if (!email || !business_name) {
      return new Response(JSON.stringify({ error: "email and business_name are required" }), { status: 400 });
    }

    // This function must only be callable by an authenticated staff member.
    // Check the caller's JWT (passed through from the front-end's supabase client).
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerUser, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !callerUser?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }
    // Confirm caller is staff (no mn_chefs row of their own).
    const { data: existingChefRow } = await callerClient
      .from("mn_chefs")
      .select("id")
      .eq("user_id", callerUser.user.id)
      .maybeSingle();
    if (existingChefRow) {
      return new Response(JSON.stringify({ error: "Only staff can invite chefs" }), { status: 403 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Invite the chef — sends them a magic-link email to set up access.
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
    if (inviteErr) {
      return new Response(JSON.stringify({ error: inviteErr.message }), { status: 400 });
    }

    const { data: chefRow, error: insertErr } = await admin
      .from("mn_chefs")
      .insert({
        user_id: invited.user.id,
        business_name,
        contact_name: contact_name ?? null,
        email,
        phone: phone ?? null,
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ chef_id: chefRow.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
