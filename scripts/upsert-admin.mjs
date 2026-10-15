import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient, UserRole } from "@prisma/client";

const MAIN_CLINIC_ID = "main-clinic";
const email = process.env.SEED_ADMIN_EMAIL?.trim();
const password = process.env.SEED_ADMIN_PASSWORD;
const name = process.env.SEED_ADMIN_NAME?.trim();
if (
  !email ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  !name ||
  !password ||
  password.trim().length < 16
) {
  console.error(
    "Set SEED_ADMIN_EMAIL, SEED_ADMIN_NAME, and a unique SEED_ADMIN_PASSWORD of at least 16 non-padding characters. No accounts changed.",
  );
  process.exit(1);
}
const prisma = new PrismaClient();

function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

try {
  await prisma.$transaction(async (tx) => {
    // Bootstrap must never reset passwords, reactivate users, or promote accounts.
    if (await tx.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new Error("Account already exists");
    }
    const clinic = await tx.clinic.upsert({
      where: { id: MAIN_CLINIC_ID },
      update: {},
      create: {
        id: MAIN_CLINIC_ID,
        name: "The Clinic",
        address: "",
        contact: "",
        email: "",
      },
    });

    await tx.user.create({
      data: {
        clinicId: clinic.id,
        name,
        email,
        passwordHash: hashPassword(password),
        role: UserRole.ADMIN,
        isActive: true,
      },
    });
  });
  console.log("Admin initialization completed.");
} catch {
  console.error(
    "Admin initialization failed. An existing account is never overwritten. Verify the configuration, migration status, and account existence through approved administration tools.",
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
