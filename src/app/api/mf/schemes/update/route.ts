import { NextResponse } from 'next/server';
import { updateSchemeMaster } from '@/lib/mf-scheme-master';

export async function POST() {
  await updateSchemeMaster();
  return NextResponse.json({
    success: true,
    message: 'MF scheme master updated',
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'MF scheme master route alive',
  });
}
