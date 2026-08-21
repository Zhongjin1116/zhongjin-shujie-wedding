// Cloudflare Pages Function
// Handles POST /api/rsvp — writes a guest's RSVP into the D1 database "WEDDING_DB"
//
// Binding setup (Cloudflare dashboard -> Pages project -> Settings -> Functions -> D1 database bindings):
//   Variable name: WEDDING_DB
//   D1 database:   (the database created via `wrangler d1 create wedding-rsvp`)

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.WEDDING_DB) {
    return json({ error: 'WEDDING_DB binding is not configured' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const {
    name,
    hasCompanion,
    companionNames,
    hasDietaryNeed,
    dietaryDetail,
    needsLodging,
    lodgingDetail,
    contactPhone,
    mailingAddress
  } = body;

  if (!name || !hasCompanion || !hasDietaryNeed || !needsLodging || !contactPhone || !mailingAddress) {
    return json({ error: 'Missing required fields' }, 400);
  }

  if (!/^\d{11}$/.test(contactPhone)) {
    return json({ error: 'Invalid contact phone' }, 400);
  }

  if (hasCompanion === '有' && !companionNames) {
    return json({ error: 'Missing companion names' }, 400);
  }

  if (hasDietaryNeed === '有' && !dietaryDetail) {
    return json({ error: 'Missing dietary detail' }, 400);
  }

  if (needsLodging === '需要' && !lodgingDetail) {
    return json({ error: 'Missing lodging detail' }, 400);
  }

  try {
    await env.WEDDING_DB.prepare(
      `INSERT INTO rsvps (
        name,
        attending,
        has_companion,
        companion_names,
        has_dietary_need,
        dietary_detail,
        needs_lodging,
        lodging_detail,
        contact_phone,
        mailing_address,
        submitted_at
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        name.slice(0, 200),
        1,
        hasCompanion.slice(0, 20),
        (companionNames || '').slice(0, 500),
        hasDietaryNeed.slice(0, 20),
        (dietaryDetail || '').slice(0, 500),
        needsLodging.slice(0, 20),
        (lodgingDetail || '').slice(0, 500),
        contactPhone.slice(0, 20),
        mailingAddress.slice(0, 1000),
        new Date().toISOString()
      )
      .run();

    return json({ success: true });
  } catch (err) {
    return json({ error: 'Database error', detail: String(err) }, 500);
  }
}

// Simple GET for you to view all responses in a browser (basic — no auth, see README to add a secret key)
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  if (url.searchParams.get('health') === '1') {
    if (!env.WEDDING_DB) {
      return json({
        ok: false,
        error: 'WEDDING_DB binding is not configured',
        hint: 'In Cloudflare Pages, add a D1 binding named WEDDING_DB and redeploy.'
      }, 500);
    }

    try {
      await env.WEDDING_DB.prepare('SELECT 1 FROM rsvps LIMIT 1').all();
      return json({ ok: true, database: 'connected', table: 'rsvps' });
    } catch (err) {
      return json({
        ok: false,
        error: 'D1 query failed',
        detail: String(err),
        hint: 'Confirm schema.sql has been executed on the remote D1 database.'
      }, 500);
    }
  }

  if (!env.WEDDING_DB) {
    return json({ error: 'WEDDING_DB binding is not configured' }, 500);
  }

  if (!env.RSVP_VIEW_KEY) {
    return json({ error: 'RSVP_VIEW_KEY is not configured' }, 500);
  }
  const key = url.searchParams.get('key');

  if (key !== env.RSVP_VIEW_KEY) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const { results } = await env.WEDDING_DB.prepare(
    `SELECT * FROM rsvps ORDER BY submitted_at DESC`
  ).all();

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
