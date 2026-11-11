UPDATE public.family_subscriptions SET environment = 'live', updated_at = now() WHERE environment = 'sandbox' AND stripe_checkout_session_id LIKE 'cs_live_%';
