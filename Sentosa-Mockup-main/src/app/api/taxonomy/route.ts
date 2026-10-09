import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { DEFAULT_REFERENCE_DATA, TaxonomyItem } from '@/lib/taxonomy';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('sentosa-cms');
    const taxonomy = await db.collection('taxonomy').find({}, { projection: { _id: 0 } }).toArray();
    
    if (taxonomy.length === 0) {
      // Seed if empty
      await db.collection('taxonomy').insertMany(DEFAULT_REFERENCE_DATA as any[]);
      return NextResponse.json(DEFAULT_REFERENCE_DATA);
    }
    
    return NextResponse.json(taxonomy);
  } catch (error: any) {
    console.warn('MongoDB unavailable for taxonomy, returning DEFAULT_REFERENCE_DATA:', error?.message);
    return NextResponse.json(DEFAULT_REFERENCE_DATA);
  }
}

export async function POST(request: NextRequest) {
  try {
    const taxonomy: TaxonomyItem[] = await request.json();
    const client = await clientPromise;
    const db = client.db('sentosa-cms');
    
    // Replace all taxonomy
    await db.collection('taxonomy').deleteMany({});
    if (taxonomy.length > 0) {
      await db.collection('taxonomy').insertMany(taxonomy as any[]);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.warn('MongoDB unavailable for taxonomy save, simulated success:', error?.message);
    return NextResponse.json({ success: true, simulated: true });
  }
}
