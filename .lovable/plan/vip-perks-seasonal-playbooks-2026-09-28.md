# VIP Perks & Seasonal Playbooks

## What I’ll build

### VIP Member Perks & London Partner Concierge
- Add a premium wallet page where parents can browse curated London partners by category, such as activities, tutors, wellbeing, family services and children’s equipment.
- Show each partner’s offer, area, member instructions, expiry date and a clear website/contact action.
- Keep private offer codes visible only inside an unlocked family wallet; nanny access will be read-only and will not reveal parent-only redemption details.
- Add an agency management panel to create, edit, publish/unpublish and delete partner perks.

### Curated Seasonal Playbooks
- Add a wallet library for agency content drops, grouped by season and topic, with a featured/current playbook at the top.
- Each playbook can contain a title, short introduction, practical sections, age guidance, a cover image URL and an optional external resource link.
- Add an agency management panel to draft, publish/unpublish, edit and delete playbooks, either for all active wallets or selected families.
- Track when a family or nanny opens a playbook so new content can be clearly marked in the wallet.

### Wallet and home updates
- Add both features as tiles in the family wallet under a new premium-membership area.
- Add both benefits to the public “Inside your wallet” list.
- Keep the existing link-and-code access model and add “Back to wallet” navigation on both pages.

## Technical details
- Add database tables for partner perks, playbooks, selected-family recipients and playbook reads, with explicit grants and row-level security enabled.
- Use protected agency functions for content management and existing wallet-session checks for family/nanny reading.
- Add route-specific page titles and social descriptions for both new pages.
- Validate the build and test the new agency-to-wallet flow in desktop and mobile preview sizes.
