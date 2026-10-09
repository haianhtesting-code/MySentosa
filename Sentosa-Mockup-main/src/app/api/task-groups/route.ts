import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { DEFAULT_GROUPS, DistributionGroup } from '@/lib/groups';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('sentosa-cms');
    const groups = await db.collection('task_groups').find({}, { projection: { _id: 0 } }).toArray();
    
    if (groups.length === 0) {
      await db.collection('task_groups').insertMany(DEFAULT_GROUPS as any[]);
      return NextResponse.json(DEFAULT_GROUPS);
    }
    
    return NextResponse.json(groups);
  } catch (error: any) {
    console.warn('MongoDB unavailable for task-groups, returning DEFAULT_GROUPS:', error?.message);
    return NextResponse.json(DEFAULT_GROUPS);
  }
}

export async function POST(request: NextRequest) {
  try {
    const groups: DistributionGroup[] = await request.json();
    const client = await clientPromise;
    const db = client.db('sentosa-cms');
    
    await db.collection('task_groups').deleteMany({});
    if (groups.length > 0) {
      await db.collection('task_groups').insertMany(groups as any[]);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.warn('MongoDB unavailable for task-groups save, simulated success:', error?.message);
    return NextResponse.json({ success: true, simulated: true });
  }
}
