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
  "nav.orders": "Orders",
  "nav.products": "Products",
  "nav.customers": "Customers",
  "nav.more": "More",
  "nav.viewShop": "View my shop",

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

  // Dashboard home (Phase 3 — "Today" strip)
  "dashboard.today": "Today",
  "dashboard.newOrders": "New orders",
  "dashboard.salesToday": "Sales today",

  // Generic
  "common.error":
    "Something went wrong. Please try again.",

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

  // Storefront
  "store.notFound": "Shop not found.",
  "store.backToShop": "Back to shop",

  // Product
  "product.addToCart": "Add to cart",
  "product.added": "Added ✓",
  "product.outOfStock": "Out of stock",
  "product.priceNpr": "NPR",
  "product.backToShop": "← Back to shop",

  // Cart
  "cart.nav": "Cart",
  "cart.title": "Your cart",
  "cart.empty": "Your cart is empty.",
  "cart.removeItem": "Remove",
  "cart.total": "Total",
  "cart.checkout": "Checkout",
  "cart.continueShopping": "Continue shopping",
  "cart.qtyLabel": "Qty",

  // Checkout
  "checkout.title": "Checkout",
  "checkout.name": "Your name",
  "checkout.phone": "Phone number",
  "checkout.phoneHint": "10-digit mobile (e.g. 98XXXXXXXX)",
  "checkout.address": "Delivery address",
  "checkout.addressHint": "Ward, street, city — where should we deliver?",
  "checkout.payment": "Payment method",
  "checkout.cod": "Cash on delivery",
  "checkout.qr": "Scan QR to pay",
  "checkout.qrHint": "Show this QR at the counter or scan from your banking app.",
  "checkout.placeOrder": "Place order",
  "checkout.invalidName": "Enter your name.",
  "checkout.invalidPhone": "Enter a valid 10-digit mobile number like 98XXXXXXXX.",
  "checkout.invalidAddress": "Enter a delivery address.",
  "checkout.invalidPayment": "Choose a payment method.",
  "checkout.noQr": "QR payment is not available yet — the shop owner hasn't uploaded a QR code. Please pay by cash on delivery.",
  "checkout.cartEmpty": "Your cart is empty — add some products first.",
  "checkout.orderSummary": "Order summary",

  // Order confirmed
  "order.confirmed": "Order confirmed!",
  "order.number": "Order #",
  "order.thankYou": "Thank you for your order. We'll call you to confirm.",
  "order.whatsapp": "Message us on WhatsApp",
  "order.backToShop": "← Back to shop",

  // More page (dashboard settings / overflow)
  "more.title": "More",
  "more.subtitle": "Tools and shop setup",

  // Order statuses (dashboard — Phase 3)
  "orders.new": "New",
  "orders.confirmed": "Confirmed",
  "orders.handed": "Handed",
  "orders.delivered": "Delivered",
  "orders.cancelled": "Cancelled",
  "orders.paid": "Paid",
  "orders.unpaid": "Unpaid",

  // Orders list (dashboard — Phase 3)
  "orders.searchPlaceholder": "Search by name, phone, or order number",
  "orders.search": "Search",
  "orders.all": "All",
  "orders.empty": "No orders yet.",
  "orders.noMatch": "No orders match — try a different search.",

  // Orders actions (dashboard — Phase 3)
  "orders.invalidOrderId": "Invalid order.",
  "orders.invalidAction": "That action isn't available for this order right now.",

  // Order detail (dashboard — Phase 3)
  "orders.items": "Items",
  "orders.customer": "Customer",
  "orders.phone": "Phone",
  "orders.address": "Address",
  "orders.payment": "Payment",
  "orders.placedOn": "Placed",
  "orders.backToList": "← Back to orders",
  "orders.confirm": "Confirm order",
  "orders.markDelivered": "Mark delivered",
  "orders.markPaid": "Mark paid (Received ✓)",
  "orders.whatsapp": "WhatsApp",
} as const;

/** Type of a dictionary: one string value for every key. */
export type Dict = Record<keyof typeof en, string>;