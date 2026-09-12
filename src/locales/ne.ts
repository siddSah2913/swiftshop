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
};