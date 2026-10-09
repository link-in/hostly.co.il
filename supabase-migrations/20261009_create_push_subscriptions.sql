CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow backend access to push_subscriptions
-- NextAuth handles authentication in the API route, so we bypass RLS for authenticated API calls
CREATE POLICY "Allow backend access to push_subscriptions"
    ON public.push_subscriptions FOR ALL
    USING (true)
    WITH CHECK (true);
