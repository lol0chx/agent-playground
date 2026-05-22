import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

interface RouteContext {
  params: { id: string };
}

export async function DELETE(
  _req: Request,
  context: RouteContext,
): Promise<Response> {
  const id = Number.parseInt(context.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL is not configured.' },
      { status: 500 },
    );
  }

  const rows = (await sql`
    DELETE FROM documents WHERE id = ${id} RETURNING id
  `) as Array<{ id: number }>;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
