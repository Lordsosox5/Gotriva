import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authorization || !supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  let payload: { loan_id?: unknown; title?: unknown; body?: unknown };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400, headers: corsHeaders });
  }
  if (
    typeof payload.loan_id !== 'string' ||
    typeof payload.title !== 'string' ||
    typeof payload.body !== 'string'
  ) {
    return Response.json({ error: 'Invalid request' }, { status: 400, headers: corsHeaders });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: loan, error: loanError } = await adminClient
    .from('loans')
    .select('id,owner_id,borrower_id,status')
    .eq('id', payload.loan_id)
    .maybeSingle();
  if (loanError || !loan || loan.borrower_id !== user.id || loan.status !== 'requested') {
    return Response.json({ error: 'Loan not available' }, { status: 403, headers: corsHeaders });
  }

  const { data: owner, error: profileError } = await adminClient
    .from('profiles')
    .select('push_token')
    .eq('id', loan.owner_id)
    .maybeSingle();
  if (profileError) {
    return Response.json({ error: 'Notification unavailable' }, { status: 400, headers: corsHeaders });
  }
  if (!owner?.push_token) {
    return Response.json({ sent: false, reason: 'no_push_token' }, { headers: corsHeaders });
  }

  const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to: owner.push_token,
      title: payload.title.slice(0, 100),
      body: payload.body.slice(0, 180),
      sound: 'default',
      data: { loanId: loan.id },
    }),
  });
  if (!expoResponse.ok) {
    return Response.json({ error: 'Push delivery failed' }, { status: 502, headers: corsHeaders });
  }
  return Response.json({ sent: true }, { headers: corsHeaders });
});
