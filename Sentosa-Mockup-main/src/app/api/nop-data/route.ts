import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import {
  INITIAL_NOPS,
  DEFAULT_BLACKOUT_DATES,
  ROUTING_MATRIX_RULES,
  DEFAULT_APPROVER_TITLES,
  DEFAULT_APPROVER_GROUPS,
  defaultUrgentDocClassification
} from '@/lib/nopData';

const DEFAULTS: Record<string, unknown> = {
  'nops': INITIAL_NOPS,
  'blackouts': DEFAULT_BLACKOUT_DATES,
  'routing': ROUTING_MATRIX_RULES,
  'approver_titles': DEFAULT_APPROVER_TITLES,
  'approver_groups': DEFAULT_APPROVER_GROUPS,
  // Function call because it returns the map
  'urgent_docs': defaultUrgentDocClassification(),
};

export async function GET(request: NextRequest) {
  try {
    const colName = request.nextUrl.searchParams.get('col');
    if (!colName || !DEFAULTS[colName]) {
      return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('sentosa-cms');
    // Using internal collection names like nop_nops, nop_blackouts
    const data = await db.collection(`nop_${colName}`).find({}, { projection: { _id: 0 } }).toArray();

    // Urgent docs is stored as a key-value map, but Mongo toArray() gives objects.
    // If it's empty, seed it.
    if (data.length === 0) {
      if (colName === 'urgent_docs') {
        const entries = Object.entries(DEFAULTS[colName] as Record<string, boolean>).map(([k, v]) => ({ key: k, value: v }));
        await db.collection(`nop_${colName}`).insertMany(entries);
        return NextResponse.json(DEFAULTS[colName]);
      } else {
        await db.collection(`nop_${colName}`).insertMany(DEFAULTS[colName] as Record<string, unknown>[]);
        return NextResponse.json(DEFAULTS[colName]);
      }
    }

    if (colName === 'urgent_docs') {
      const map: Record<string, unknown> = {};
      data.forEach((d) => {
        const item = d as unknown as { key: string; value: unknown };
        map[item.key] = item.value;
      });
      return NextResponse.json(map);
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`MongoDB unavailable, falling back to local defaults for ${request.nextUrl.searchParams.get('col')}:`, message);
    const colName = request.nextUrl.searchParams.get('col');
    return NextResponse.json(colName && DEFAULTS[colName] ? DEFAULTS[colName] : []);
  }
}

export async function POST(request: NextRequest) {
  try {
    const colName = request.nextUrl.searchParams.get('col');
    if (!colName || !DEFAULTS[colName]) {
      return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });
    }

    const payload = await request.json();
    const client = await clientPromise;
    const db = client.db('sentosa-cms');

    await db.collection(`nop_${colName}`).deleteMany({});

    if (colName === 'urgent_docs') {
      const entries = Object.entries(payload).map(([k, v]) => ({ key: k, value: v }));
      if (entries.length > 0) {
        await db.collection(`nop_${colName}`).insertMany(entries);
      }
    } else {
      if (Array.isArray(payload) && payload.length > 0) {
        await db.collection(`nop_${colName}`).insertMany(payload as Record<string, unknown>[]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`MongoDB unavailable for ${request.nextUrl.searchParams.get('col')}, simulated save:`, message);
    return NextResponse.json({ success: true, simulated: true });
  }
}
