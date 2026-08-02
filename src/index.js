function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleRsvpPost(request, env) {
  if (!env.WEDDING_DB) {
    return json({ error: 'WEDDING_DB binding is not configured' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { name, attending, guestCount, dietary, message } = body;

  if (!name || typeof attending !== 'boolean') {
    return json({ error: 'Missing required fields' }, 400);
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

    return json({ success: true });
  } catch (err) {
    return json({ error: 'Database error', detail: String(err) }, 500);
  }
}

async function handleRsvpGet(request, env) {
  const url = new URL(request.url);

  if (url.searchParams.get('health') === '1') {
    if (!env.WEDDING_DB) {
      return json({
        ok: false,
        error: 'WEDDING_DB binding is not configured',
        hint: 'Confirm the WEDDING_DB D1 binding in wrangler.toml or the Cloudflare dashboard.',
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
        hint: 'Confirm schema.sql has been executed on the remote D1 database.',
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/rsvp') {
      if (request.method === 'POST') {
        return handleRsvpPost(request, env);
      }

      if (request.method === 'GET') {
        return handleRsvpGet(request, env);
      }

      return json({ error: 'Method not allowed' }, 405);
    }

    return env.ASSETS.fetch(request);
  },
};
