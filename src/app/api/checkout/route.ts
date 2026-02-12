import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_MAP: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  agent: process.env.STRIPE_AGENT_PRICE_ID,
  ultra: process.env.STRIPE_ULTRA_PRICE_ID,
};

const SUCCESS_MAP: Record<string, string> = {
  pro: '/search?upgraded=true',
  agent: '/agent?upgraded=true',
  ultra: '/agent?upgraded=true',
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const plan = (body.plan as string) || 'pro';

    const priceId = PRICE_MAP[plan];
    if (!priceId) {
      return NextResponse.json({ error: `Invalid plan: ${plan}` }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || '',
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        plan,
      },
      success_url: `${origin}${SUCCESS_MAP[plan] || '/search?upgraded=true'}`,
      cancel_url: `${origin}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
