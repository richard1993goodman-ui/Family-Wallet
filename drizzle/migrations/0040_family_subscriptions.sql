CREATE TABLE public.family_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
 stripe_customer_id text NOT NULL,
 stripe_subscription_id text UNIQUE,
 stripe_checkout_session_id text NOT NULL UNIQUE,
 plan text NOT NULL CHECK (plan IN ('family','household')),
 billing_interval text NOT NULL CHECK (billing_interval IN ('month','year')),
 status text NOT NULL DEFAULT 'active',
 current_period_end timestamptz,
 cancel_at_period_end boolean NOT NULL DEFAULT false,
 customer_email text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.family_subscriptions TO service_role;
ALTER TABLE public.family_subscriptions ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.family_subscriptions IS 'Stripe subscriptions bought through the pricing page. Service-role only; written by the checkout success page and the Stripe webhook.';
CREATE INDEX family_subscriptions_family_idx ON public.family_subscriptions(family_id);
CREATE INDEX family_subscriptions_customer_idx ON public.family_subscriptions(stripe_customer_id);