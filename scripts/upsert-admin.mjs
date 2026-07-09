import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const MAIN_CLINIC_ID = "main-clinic";
const email = "admin@ocmtheclinic.test";
const password = "Admin123!";

function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

const clinic = await prisma.clinic.upsert({
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

await prisma.user.upsert({
  where: { email },
  update: {
    name: "System Admin",
    passwordHash: hashPassword(password),
    role: UserRole.ADMIN,
    isActive: true,
    clinicId: clinic.id,
  },
  create: {
    clinicId: clinic.id,
    name: "System Admin",
    email,
    passwordHash: hashPassword(password),
    role: UserRole.ADMIN,
    isActive: true,
  },
});

await prisma.$disconnect();

console.log(`Admin account ready: ${email}`);
