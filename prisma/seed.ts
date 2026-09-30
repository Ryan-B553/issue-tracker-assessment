/**
 * Seed script: creates one admin user and one standard user.
 *
 * Run with:  npx tsx prisma/seed.ts
 * Or via:    npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const SALT_ROUNDS = 12;

  // ------------------------------------------------------------------
  // Admin user
  // ------------------------------------------------------------------
  const adminEmail = "admin@example.com";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Admin User",
      email: adminEmail,
      passwordHash: await bcrypt.hash("Admin1234!", SALT_ROUNDS),
      role: "admin",
    },
  });
  console.log(`✅  Admin created/found  id=${admin.id}  email=${admin.email}`);

  // ------------------------------------------------------------------
  // Standard user
  // ------------------------------------------------------------------
  const userEmail = "user@example.com";
  const standardUser = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      name: "Standard User",
      email: userEmail,
      passwordHash: await bcrypt.hash("User1234!", SALT_ROUNDS),
      role: "user",
    },
  });
  console.log(
    `✅  User  created/found  id=${standardUser.id}  email=${standardUser.email}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
