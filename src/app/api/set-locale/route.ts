import { NextRequest, NextResponse } from 'next/server';
import { setUserLocale } from '@/i18n/locale-service';

export async function POST(req: NextRequest) {
    const { locale } = await req.json();
    await setUserLocale(locale);
    return NextResponse.json({ status: 'ok' });
}
