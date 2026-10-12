-- Adds an optional custom review-reminder message text for hosts to customize
-- the WhatsApp review-request message sent the morning after checkout.

ALTER TABLE users ADD COLUMN IF NOT EXISTS review_message_text TEXT;

COMMENT ON COLUMN users.review_message_text IS 'Host-customized template/text for the post-checkout WhatsApp review-request message';
