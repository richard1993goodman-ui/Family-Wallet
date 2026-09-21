# Active Kids Passport and handover expenses

## What will change

- Add an **Active Kids Sports Passport** to each wallet so parents or nannies can log sports, outdoor challenges, confidence wins and skill progress for each child.
- Add an **End-of-Day Handover & Expenses** page so the nanny can complete a quick wrap-up and record small expenses, while parents can see and mark expenses as reimbursed.
- Add both benefits to the wallet home screen and to the public **Inside your wallet** list.

## Access and privacy

- Parents and invited nannies can view and add passport entries, handovers and expenses for their own wallet only.
- Parent access can mark expenses as reimbursed and remove entries.
- Nanny access can add daily updates and expenses, but cannot mark reimbursements.
- Agency/admin access remains separate and is not opened to public sign-up.

## Technical details

- Add three wallet-owned records: sports passport entries, handover checklists and expense claims.
- Use the existing wallet code / nanny invite session checks for access.
- Create server actions for loading, saving, deleting and reimbursing the new records.
- Add two new routes: `/passport/$slug` and `/handover/$slug`.
- Update wallet tiles and the home page benefits list with the new membership benefits.
- Verify the new pages and wallet links on desktop/mobile, then check preview health.
