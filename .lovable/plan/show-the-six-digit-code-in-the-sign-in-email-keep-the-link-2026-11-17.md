# Show the six-digit code in the sign-in email (keep the link)

## Current state
- Sign-in emails use the built-in default template; no custom template is set up.
- Sender: the default Lovable sender, because no email domain is configured.

## Change (only when approved)
1. Set up a sender domain you own (the Set up email domain button in chat; DNS checks run on their own).
2. Create the branded sign-in email templates.
3. In the magic link template, add the code as large text above the existing Log in button. Keep the link.
4. Show the code in the sign-up confirmation template too, because a new email through the same call gets that email.

## Effect on the website
- The website /account sign-in (email link) and the household invite claim keep working: the link stays.
- The only change people see is extra text in the email, plus your own sender address and branding.

## Not possible
- You can't edit the default template from a settings screen. A custom template needs a domain you own.
