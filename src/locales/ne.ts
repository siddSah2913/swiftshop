// All UI text — Nepali (नेपाली). Must have ONE entry for every English key.
// Typed as Dict so a missing translation fails to compile.

import type { Dict } from "./en";

export const ne: Dict = {
  // Brand
  "brand.name": "SwiftShop",

  // Navigation
  "nav.home": "गृहपृष्ठ",
  "nav.signIn": "लगइन गर्नुहोस्",
  "nav.signUp": "मेरो पसल बनाउनुहोस्",
  "nav.signOut": "लगआउट",
  "nav.dashboard": "ड्यासबोर्ड",

  // Landing page
  "home.hero": "आफ्नै पसल, केही मिनेटमा।",
  "home.sub":
    "फोटो राख्नुहोस्, WhatsApp र आफ्नै लिंकमा अर्डर लिनुहोस्, नेपाली तरिकाले भुक्तानी पाउनुहोस् (eSewa, Khalti, Fonepay QR, COD), र डेलिभरी साझेदारलाई अर्डर सुम्पनुहोस् — सबै आफ्नै फोनबाट।",
  "home.how": "कसरी काम गर्छ",
  "home.how1": "आफ्नो पसलबारे ३ प्रश्नको जवाफ दिनुहोस्।",
  "home.how2": "फोटो र मूल्य (रुपैयाँमा) राख्नुहोस्।",
  "home.how3": "आफ्नो लिंक सेयर गर्नुहोस् — WhatsApp मा अर्डर लिनुहोस्।",
  "home.cta": "अहिले नै सुरू गर्नुहोस् — निःशुल्क",
  "home.demoNote": "डेमो लगइन: demo@swiftshop.local / demo1234",

  // Auth pages
  "auth.loginTitle": "फेरि स्वागत छ",
  "auth.signupTitle": "आफ्नो पसल बनाउनुहोस्",
  "auth.name": "तपाईंको नाम",
  "auth.email": "इमेल",
  "auth.password": "पासवर्ड",
  "auth.login": "लगइन",
  "auth.createAccount": "खाता बनाउनुहोस्",
  "auth.noAccount": "नयाँ हुनुहुन्छ?",
  "auth.haveAccount": "पहिले नै खाता छ?",
  "auth.invalidCredentials": "इमेल वा पासवर्ड मिलेन।",
  "auth.emailTaken": "यो इमेलले पहिले नै खाता बनाएको छ — लगइन गर्नुहोस्।",
  "auth.passwordTooShort": "पासवर्ड कम्तीमा ६ अक्षर हुनुपर्छ।",

  // Dashboard shell (full dashboard ships in Phase 3)
  "dashboard.title": "ड्यासबोर्ड",
  "dashboard.welcome": "तपाईं लगइन गरिसक्नुभयो",
  "dashboard.demoDataTitle": "डेमो पसल तयार छ",
  "dashboard.demoDataBody":
    "तपाईंको डेमो पसल “Sita's Fashion” slug “sitasfashion” मा छ। उत्पादनहरू: Cotton Kurta · Daura Suruwal · Pashmina Shawl।",
  "dashboard.nextSteps":
    "फेज १ ले अनबोर्डिङ विजार्ड र उत्पादन उपकरण ल्याउँछ। त्यतिन्जेल Prisma Studio मा डेमो डाटा हेर्नुहोस्, अनि नयाँ खाता बनाएर हेर्नुहोस्। ",

  // Generic
  "common.error": "केही गडबड भयो। फेरि प्रयास गर्नुहोस्।",

  "nav.setupYourShop": "पसल खोल्नुहोस्",
  "onboarding.title": "आफ्नो पसल बनाउनुहोस्",
  "onboarding.subtitle": "चार चरणमा तपाईंको पसल — जतनसँग।",
  "onboarding.shopName": "पसलको नाम",
  "onboarding.shopNameHint": "ग्राहकले ट्याबमा यही नाम हेर्नेछन्।",
  "onboarding.category": "के बेच्नुहुन्छ?",
  "onboarding.category.clothing": "कपडा र फेसन",
  "onboarding.category.electronics": "इलेक्ट्रोनिक्स र ग्याजेट",
  "onboarding.category.general": "सामान्य / किराना / हस्तनिर्मित",
  "onboarding.city": "तपाईंको पसल कहाँ छ?",
  "onboarding.selectProvince": "प्रदेश छान्नुहोस्",
  "onboarding.selectDistrict": "जिल्ला छान्नुहोस्",
  "onboarding.slug": "तपाईंको पसल लिंक",
  "onboarding.slugHint": "नामबाट बनाइएको — चाहेमा परिवर्तन गर्नुहोस्।",
  "onboarding.slugTaken": "यो नाम पहिल्यै लिइएको छ — अर्को रोज्नुहोस्।",
  "onboarding.slugAvailable": "उपलब्ध ✓",
  "onboarding.slugInvalid": "अक्षर र नम्बर मात्र, बीचमा - राख्नुहोस्।",
  "onboarding.createButton": "मेरो पसल बनाउनुहोस्",
  "onboarding.province.koshi": "कोशी प्रदेश",
  "onboarding.province.madhesh": "मधेश प्रदेश",
  "onboarding.province.bagmati": "बागमती प्रदेश",
  "onboarding.province.gandaki": "गण्डकी प्रदेश",
  "onboarding.province.lumbini": "लुम्बिनी प्रदेश",
  "onboarding.province.karnali": "कर्णाली प्रदेश",
  "onboarding.province.sudurpashchim": "सुदूरपश्चिम प्रदेश",
  "design.title": "आफ्नो शैली",
  "design.template": "टेम्पलेट छान्नुहोस्",
  "design.template.clothing": "कपडा",
  "design.template.electronics": "इलेक्ट्रोनिक्स",
  "design.template.general": "सामान्य",
  "design.colorLabel": "ब्रान्ड रङ",
  "design.logo": "लोगो",
  "design.logoHint": "ऐच्छिक — वर्गाकार फोटो उपयुक्त हुन्छ।",
  "design.save": "बचत गर्नुहोस्",
  "design.invalidColor": "सही रङ छान्नुहोस्।",
  "products.title": "तपाईंका उत्पादनहरू",
  "products.add": "उत्पादन थप्नुहोस्",
  "products.empty": "अझै उत्पादन छैन — पहिलो उत्पादन थप्नुहोस्।",
  "products.name": "उत्पादनको नाम",
  "products.caption": "विवरण",
  "products.priceNpr": "मूल्य (रुपैयाँ)",
  "products.saveAll": "सबै बचत गर्नुहोस्",
  "products.save": "उत्पादन बचत गर्नुहोस्",
  "products.bulkMode": "धेरै उत्पादन थप्नुहोस्",
  "products.singleMode": "एक एक गरेर थप्नुहोस्",
  "products.bulkHint": "हरेक फोटो एउटा उत्पादन बन्छ।",
  "products.photo": "फोटोहरू",
  "products.addPhoto": "फोटो थप्नुहोस्",
  "products.remove": "हटाउनुहोस्",
  "products.edit": "सम्पादन",
  "products.delete": "मेट्ने",
  "products.deleteConfirm": "यो उत्पादन मेट्ने?",
  "products.invalidName": "उत्पादनको नाम लेख्नुहोस्।",
  "products.invalidPrice": "मूल्य रुपैयाँमा लेख्नुहोस् (पूर्ण संख्या)।",
  "products.invalidImage": "JPG, PNG वा WebP फोटो प्रयोग गर्नुहोस्।",
  "products.imageTooBig": "फोटो ठूलो भयो — बढीमा ५ MB प्रति फोटो।",
  "products.tooManyPhotos": "धेरै फोटो — बढीमा ६ वटा।",
  "products.saved": "बचत भयो।",

  // Storefront
  "store.notFound": "पसल भेटिएन।",
  "store.backToShop": "पसलमा फर्कनुहोस्",

  // Product
  "product.addToCart": "कार्टमा राख्नुहोस्",
  "product.added": "राखियो ✓",
  "product.outOfStock": "सकिएको छ",
  "product.priceNpr": "रु.",
  "product.backToShop": "← पसलमा फर्कनुहोस्",

  // Cart
  "cart.title": "तपाईंको कार्ट",
  "cart.empty": "तपाईंको कार्ट खाली छ।",
  "cart.removeItem": "हटाउनुहोस्",
  "cart.total": "जम्मा",
  "cart.checkout": "अर्डर गर्नुहोस्",
  "cart.continueShopping": "किनमेल जारी राख्नुहोस्",
  "cart.qtyLabel": "परिमाण",

  // Checkout
  "checkout.title": "अर्डर फारम",
  "checkout.name": "तपाईंको नाम",
  "checkout.phone": "फोन नम्बर",
  "checkout.phoneHint": "१० अंकको मोबाइल (जस्तै 98XXXXXXXX)",
  "checkout.address": "डेलिभरी ठेगाना",
  "checkout.addressHint": "वडा, सडक, सहर — कहाँ डेलिभरी गर्ने?",
  "checkout.payment": "भुक्तानी विधि",
  "checkout.cod": "बुझेपछि भुक्तानी (COD)",
  "checkout.qr": "QR स्क्यान गरेर भुक्तानी",
  "checkout.qrHint": "काउन्टरमा यो QR देखाउनुहोस् वा आफ्नो बैंक एपबाट स्क्यान गर्नुहोस्।",
  "checkout.placeOrder": "अर्डर पक्का गर्नुहोस्",
  "checkout.invalidName": "तपाईंको नाम लेख्नुहोस्।",
  "checkout.invalidPhone": "१० अंकको मान्य मोबाइल नम्बर लेख्नुहोस्, जस्तै 98XXXXXXXX।",
  "checkout.invalidAddress": "डेलिभरी ठेगाना लेख्नुहोस्।",
  "checkout.invalidPayment": "भुक्तानी विधि छान्नुहोस्।",
  "checkout.noQr": "QR भुक्तानी अझ उपलब्ध छैन — पसल मालिकले QR कोड राखेका छैनन्। कृपया बुझेपछि भुक्तानी गर्नुहोस्।",
  "checkout.cartEmpty": "तपाईंको कार्ट खाली छ — पहिले केही उत्पादन थप्नुहोस्।",
  "checkout.orderSummary": "अर्डर विवरण",

  // Order confirmed
  "order.confirmed": "अर्डर पक्का भयो!",
  "order.number": "अर्डर नं.",
  "order.thankYou": "तपाईंको अर्डरका लागि धन्यवाद। पक्का गर्न हामी फोन गर्छौं।",
  "order.whatsapp": "WhatsApp मा सन्देश पठाउनुहोस्",
  "order.backToShop": "← पसलमा फर्कनुहोस्",
};