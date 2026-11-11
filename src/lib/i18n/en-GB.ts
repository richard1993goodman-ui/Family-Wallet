// The source language. Every screen's words live here, keyed by area, so they can be translated and reviewed in one place.
// Wave 1: invitations, login creation and the account page. Later waves move the wallet menu and feature pages here.
import type { Message } from "./core";

export const enGB = {
  // Invitation by link
  "join.checking": "Checking your invitation…",
  "join.activateTitle": "Activate your Family Wallet",
  "join.activateIntro": "{agency} has set you up with a Family Wallet. It's private to your family: {agency} can't see what you add.",
  "join.familyName": "Your family name",
  "join.familyPlaceholder": "The Harrington Family",
  "join.create": "Create my wallet",
  "join.invalidTitle": "This invitation isn't valid",
  "join.invalidBody": "It may have expired or already been used. Ask your agency to send a new one.",
  "join.goHome": "Go to Family Wallet",
  "join.errorFallback": "Couldn't activate your wallet.",
  // Invitation by code
  "joinCode.title": "Enter your invitation code",
  "joinCode.intro": "Use this if the link from your agency won't open. The code has 8 letters and numbers.",
  "joinCode.continue": "Continue",
  "joinCode.errorFallback": "Something went wrong.",
  // Wallet ready
  "done.title": "Your wallet is ready",
  "done.intro": "Save these now. We've also emailed them to you if we have your address. Only your family can open your wallet.",
  "done.link": "Your private link",
  "done.code": "Access code",
  "done.copyBoth": "Copy both",
  "done.open": "Open my wallet",
  "done.loginHint": "Once you're in, choose \"My login\" in the menu to sign in with your email instead. Your code stays as a backup.",
  // Creating your own login
  "login.title": "Create your own login",
  "login.intro": "Optional. Sign in with your email on any device, and keep your code as a backup. We'll email you a link that works once.",
  "login.emailPlaceholder": "you@example.com",
  "login.send": "Email me a link",
  "login.sent": "Check your email for the link.",
  "login.have": "You have your own login. Sign in with your email any time.",
  "login.signInLink": "Go to sign in",
  "login.sendError": "Couldn't send that.",
  // Claim page
  "claim.creating": "Creating your login…",
  "claim.failedTitle": "We couldn't create your login",
  "claim.failedFallback": "This link couldn't be used.",
  // Account page
  "account.loading": "One moment…",
  "account.signInTitle": "Sign in",
  "account.signInIntro": "We'll email you a link. No password needed.",
  "account.emailLink": "Email me a link",
  "account.checkTitle": "Check your email",
  "account.checkBody": "If that address has a Family Wallet login, we've sent a sign-in link to it.",
  "account.sendError": "We couldn't send that. Please try again.",
  "account.householdsTitle": "Your households",
  "account.householdsLoading": "Loading…",
  "account.householdsNone": "No households yet. Open your wallet with its code and choose \"Create your own login\".",
  "account.signOut": "Sign out",
  "account.language": "Language",
  // Household switcher
  "switcher.label": "Switch household",
  // Plural example, used by tests and later screens
  "households.count": { one: "{count} household", other: "{count} households" },
} as const satisfies Record<string, Message>;

export type MessageKey = keyof typeof enGB;
