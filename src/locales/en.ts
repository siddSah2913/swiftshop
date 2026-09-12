// All UI text — English. Keys are dotted strings; EVERY key here must also
// exist in ne.ts (the ne dictionary is typed as a copy of this shape, so a
// missing Nepali word is a compile error, not a silent gap). See webplan.md §12.

export const en = {
  // Brand
  "brand.name": "SwiftShop",

  // Navigation
  "nav.home": "Home",
  "nav.signIn": "Sign in",
  "nav.signUp": "Create my shop",
  "nav.signOut": "Sign out",
  "nav.dashboard": "Dashboard",

  // Landing page
  "home.hero": "Own your shop. In minutes.",
  "home.sub":
    "Upload product photos, take orders on WhatsApp and your own link, get paid the Nepali way (eSewa, Khalti, Fonepay QR, COD), and hand orders to Nepal's delivery partners — all from your phone.",
  "home.how": "How it works",
  "home.how1": "Answer 3 questions about your shop.",
  "home.how2": "Add product photos with prices in Nepali rupees.",
  "home.how3": "Share your link — receive orders by WhatsApp.",
  "home.cta": "Start now — it's free",
  "home.demoNote": "Demo login: demo@swiftshop.local / demo1234",

  // Auth pages
  "auth.loginTitle": "Welcome back",
  "auth.signupTitle": "Create your shop",
  "auth.name": "Your name",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.login": "Sign in",
  "auth.createAccount": "Create account",
  "auth.noAccount": "New here?",
  "auth.haveAccount": "Already have an account?",
  "auth.invalidCredentials": "Wrong email or password.",
  "auth.emailTaken": "That email is already signed up — sign in instead.",
  "auth.passwordTooShort": "Password must be at least 6 characters.",

  // Dashboard shell (full dashboard ships in Phase 3)
  "dashboard.title": "Dashboard",
  "dashboard.welcome": "You're logged in",
  "dashboard.demoDataTitle": "Demo store ready",
  "dashboard.demoDataBody": "Your demo shop “Sita's Fashion” is at the slug “sitasfashion”. Products: Cotton Kurta · Daura Suruwal · Pashmina Shawl.",
  "dashboard.nextSteps": "Phase 1 brings the onboarding wizard and product tools. For now, inspect the demo rows with Prisma Studio, then sign up a real account and browse the API. ",

  // Generic
  "common.error":
    "Something went wrong. Please try again.",
} as const;

/** Type of a dictionary: one string value for every key. */
export type Dict = Record<keyof typeof en, string>;