// SwiftShop seed — creates a demo owner, store, and a few products.
// Run: npm run seed   (or: npx prisma db seed)
// Safe to re-run: it finds-or-creates rows (no duplicates).

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // --- Demo owner (find or create) ---
  const email = "demo@swiftshop.local";
  const passwordHash = await bcrypt.hash("demo1234", 10);

  let owner = await prisma.user.findUnique({ where: { email } });
  if (!owner) {
    owner = await prisma.user.create({
      data: { email, name: "Demo Owner", passwordHash },
    });
    console.log("Created demo owner:", email);
  } else {
    console.log("Demo owner already exists:", email);
  }

  // --- Demo store (one per owner) ---
  let store = await prisma.store.findUnique({ where: { ownerId: owner.id } });
  if (!store) {
    store = await prisma.store.create({
      data: {
        ownerId: owner.id,
        slug: "sitasfashion",
        name: "Sita's Fashion",
        category: "clothing",
        city: "Kathmandu",
        template: "clothing",
        whatsappNumber: "9800000000",
      },
    });
    console.log("Created demo store: sitasfashion");
  } else {
    console.log("Demo store already exists:", store.slug);
  }

  // --- Demo products (find-or-create by name per store) ---
  const products = [
    { name: "Cotton Kurta (Black)", caption: "Soft pure-cotton kurta, breathable for summer.", priceNpr: 1500, stock: 10 },
    { name: "Handwoven Daura Suruwal", caption: "Traditional Nepali outfit, hand-tailored.", priceNpr: 4200, stock: 5 },
    { name: "Pashmina Shawl", caption: "Warm hand-woven pashmina, 60x200cm.", priceNpr: 2800, stock: 8 },
  ];

  for (const p of products) {
    const exists = await prisma.product.findFirst({
      where: { storeId: store.id, name: p.name },
    });
    if (!exists) {
      await prisma.product.create({
        data: { storeId: store.id, ...p },
      });
      console.log("Created product:", p.name);
    } else {
      console.log("Product already exists:", p.name);
    }
  }

  console.log("\nSeed complete. Login: demo@swiftshop.local / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());