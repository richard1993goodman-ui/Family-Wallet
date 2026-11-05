# Family-first wallet refinements

## What will change

- Make the Emergency Card editable for parents. They can update the home address, GP, medical and emergency instructions, add/remove family emergency contacts, and maintain the nanny's emergency contact. Nannies keep a read-only emergency view.
- Move **Your family** and **This week** directly beneath the wallet heading so family information and the shared calendar are encountered first.
- Show **Signing progress** only while a current agreement still needs a parent or nanny signature. Once both have signed, the completed agreement remains available under documents without the progress panel.
- Move **Ask Athlete Mannies** and the **Nanny Training Hub** to the final section of the wallet.
- Replace the embedded Activity Guide and Nanny Fuel destinations with external links to the original Lovable apps, while keeping timesheets inside the wallet.
- Redesign **Ask Athlete Mannies** as a familiar message conversation: agency replies on one side and family/nanny messages on the other, with sender labels and timestamps. Both family and nanny access codes can open the conversation; outgoing messages are saved as either `family` or `nanny` according to who unlocked the wallet.

## Access and privacy

- Only parent/family access can change emergency information.
- Nanny access can read the emergency card and participate in support conversations, but cannot change family details.
- Existing wallet and nanny invitation codes remain the only sign-in method.

## Technical details

- Reuse the existing family profile, contact, nanny emergency, support thread, and support message records.
- Add family-session save actions for emergency details and contacts; no new tables are needed.
- Broaden support functions from family-only to shared wallet access and derive the message sender from the verified session.
- Keep the existing support administration screen compatible with the new `nanny` sender value.
- Verify the wallet, emergency card, support messages, link-outs, and completed-signing state at desktop and mobile sizes.