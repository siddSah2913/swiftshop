// Nepal's 7 provinces and their districts, used by the onboarding city step.
// Province ids are stable keys and their LABELS are localized via i18n keys
// "onboarding.province.<id>"; district names stay English in the DB (they are
// stored as Store.city) so they are consistent and sortable. See the Phase 1 spec §5.

export type ProvinceId =
  | "koshi"
  | "madhesh"
  | "bagmati"
  | "gandaki"
  | "lumbini"
  | "karnali"
  | "sudurpashchim";

export interface Province {
  id: ProvinceId;
  districts: string[];
}

// All 77 official districts, grouped by province, alphabetized within.
export const PROVINCES: Province[] = [
  {
    id: "koshi",
    districts: [
      "Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang",
      "Okhaldhunga", "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari",
      "Taplejung", "Terhathum", "Udayapur",
    ],
  },
  {
    id: "madhesh",
    districts: [
      "Bara", "Dhanusa", "Mahottari", "Parsa", "Rautahat", "Saptari",
      "Sarlahi", "Siraha",
    ],
  },
  {
    id: "bagmati",
    districts: [
      "Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu",
      "Kavrepalanchok", "Lalitpur", "Makwanpur", "Nuwakot", "Ramechhap",
      "Rasuwa", "Sindhuli", "Sindhupalchok",
    ],
  },
  {
    id: "gandaki",
    districts: [
      "Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang",
      "Myagdi", "Nawalpur", "Parbat", "Syangja", "Tanahun",
    ],
  },
  {
    id: "lumbini",
    districts: [
      "Arghakhanchi", "Banke", "Bardiya", "Dang", "Gulmi", "Kapilvastu",
      "Palpa", "Parasi", "Pyuthan", "Rolpa", "Rukum West", "Rupandehi",
    ],
  },
  {
    id: "karnali",
    districts: [
      "Dailekh", "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot", "Mugu",
      "Rukum East", "Salyan", "Surkhet",
    ],
  },
  {
    id: "sudurpashchim",
    districts: [
      "Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura", "Darchula",
      "Doti", "Kailali", "Kanchanpur",
    ],
  },
];

/** Every district name across all provinces (for the Zod union in Task 6). */
export const ALL_DISTRICTS: string[] = PROVINCES.flatMap((p) => p.districts);