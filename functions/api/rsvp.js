// Cloudflare Pages Function
// Handles POST /api/rsvp — writes a guest's RSVP into the D1 database "WEDDING_DB"
//
// Binding setup (Cloudflare dashboard -> Pages project -> Settings -> Functions -> D1 database bindings):
//   Variable name: WEDDING_DB
//   D1 database:   (the database created via `wrangler d1 create wedding-rsvp`)

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { name, attending, guestCount, dietary, message } = body;

  if (!name || typeof attending !== 'boolean') {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await env.WEDDING_DB.prepare(
      `INSERT INTO rsvps (name, attending, guest_count, dietary, message, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        name.slice(0, 200),
        attending ? 1 : 0,
        parseInt(guestCount, 10) || 0,
        (dietary || '').slice(0, 200),
        (message || '').slice(0, 1000),
        new Date().toISOString()
      )
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Database error', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Simple GET for you to view all responses in a browser (basic — no auth, see README to add a secret key)
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (key !== env.RSVP_VIEW_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { results } = await env.WEDDING_DB.prepare(
    `SELECT * FROM rsvps ORDER BY submitted_at DESC`
  ).all();

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
