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

  // Navigation (Phase 1)
  "nav.setupYourShop": "Set up your shop",

  // Onboarding wizard
  "onboarding.title": "Set up your shop",
  "onboarding.subtitle": "Four quick steps and your store is live.",
  "onboarding.shopName": "Shop name",
  "onboarding.shopNameHint": "What customers will see in their browser tab.",
  "onboarding.category": "What do you sell?",
  "onboarding.category.clothing": "Clothing & Fashion",
  "onboarding.category.electronics": "Electronics & Gadgets",
  "onboarding.category.general": "General / Kirana / Handmade",
  "onboarding.city": "Where is your shop?",
  "onboarding.selectProvince": "Select province",
  "onboarding.selectDistrict": "Select district",
  "onboarding.slug": "Your store link",
  "onboarding.slugHint": "We made one from your shop name — you can change it.",
  "onboarding.slugTaken": "That name is taken — try another.",
  "onboarding.slugAvailable": "Available ✓",
  "onboarding.slugInvalid": "Use letters and numbers only, separated by -.",
  "onboarding.createButton": "Create my shop",
  "onboarding.province.koshi": "Koshi Province",
  "onboarding.province.madhesh": "Madhesh Province",
  "onboarding.province.bagmati": "Bagmati Province",
  "onboarding.province.gandaki": "Gandaki Province",
  "onboarding.province.lumbini": "Lumbini Province",
  "onboarding.province.karnali": "Karnali Province",
  "onboarding.province.sudurpashchim": "Sudurpashchim Province",

  // Design page
  "design.title": "Make it yours",
  "design.template": "Pick a template",
  "design.template.clothing": "Clothing",
  "design.template.electronics": "Electronics",
  "design.template.general": "General",
  "design.colorLabel": "Brand color",
  "design.logo": "Logo",
  "design.logoHint": "Optional — a square photo works best.",
  "design.save": "Save & see my products",
  "design.invalidColor": "Choose a valid color.",

  // Products
  "products.title": "Your products",
  "products.add": "Add product",
  "products.empty": "No products yet — add your first one.",
  "products.name": "Product name",
  "products.caption": "Caption",
  "products.priceNpr": "Price (NPR)",
  "products.saveAll": "Save all",
  "products.save": "Save product",
  "products.bulkMode": "Add several products",
  "products.singleMode": "Add one product at a time",
  "products.bulkHint": "Each photo becomes its own product.",
  "products.photo": "Photos",
  "products.addPhoto": "Add photo",
  "products.remove": "Remove",
  "products.edit": "Edit",
  "products.delete": "Delete",
  "products.deleteConfirm": "Delete this product?",
  "products.invalidName": "Give the product a name.",
  "products.invalidPrice": "Enter a price in rupees (whole number).",
  "products.invalidImage": "Use a JPG, PNG, or WebP photo.",
  "products.imageTooBig": "Photo is too big — max 5 MB per photo.",
  "products.tooManyPhotos": "Too many photos — max 6 per upload.",
  "products.saved": "Saved.",
} as const;

/** Type of a dictionary: one string value for every key. */
export type Dict = Record<keyof typeof en, string>;