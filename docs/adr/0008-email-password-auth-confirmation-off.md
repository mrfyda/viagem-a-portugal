# Email+password auth with confirmation disabled

Travelers sign in with email+password; Supabase's signup email confirmation
is turned off, so the address is an unverified login identifier. This is
deliberate: the free tier's built-in mailer allows only a handful of emails
per hour, and putting it in the signup path would break sign-up at exactly
the moment someone tries the app. A Visit log is low-sensitivity and nothing
is ever emailed to Travelers, so verified addresses buy nothing. Password
resets ride the rate-limited default mailer (or the dashboard) at this
scale; OAuth providers or custom SMTP remain additive changes if needed.
