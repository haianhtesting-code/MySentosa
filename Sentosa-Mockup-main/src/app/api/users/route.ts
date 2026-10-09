import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { DEFAULT_USERS, UserAccount } from '@/lib/users';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('sentosa-cms');
    const users = await db.collection('users').find({}, { projection: { _id: 0 } }).toArray();
    
    if (users.length === 0) {
      // Seed if empty
      await db.collection('users').insertMany(DEFAULT_USERS as any[]);
      return NextResponse.json(DEFAULT_USERS);
    }
    
    return NextResponse.json(users);
  } catch (error: any) {
    console.warn('MongoDB unavailable for users, returning DEFAULT_USERS:', error?.message);
    return NextResponse.json(DEFAULT_USERS);
  }
}

export async function POST(request: NextRequest) {
  try {
    const users: UserAccount[] = await request.json();
    const client = await clientPromise;
    const db = client.db('sentosa-cms');
    
    // Replace all users
    await db.collection('users').deleteMany({});
    if (users.length > 0) {
      await db.collection('users').insertMany(users as any[]);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.warn('MongoDB unavailable for users save, simulated success:', error?.message);
    return NextResponse.json({ success: true, simulated: true });
  }
}
