import fs from "fs";
import path from "path";

const firstNamesMale = [
  "Juan",
  "Jose",
  "Mark",
  "John",
  "Paolo",
  "Miguel",
  "Carlo",
  "Ryan",
  "Christian",
  "Jerome",
];

const firstNamesFemale = [
  "Maria",
  "Ana",
  "Joy",
  "Angel",
  "Grace",
  "Mae",
  "Jenny",
  "Rose",
  "Kim",
  "Princess",
];

const lastNames = [
  "Dela Cruz",
  "Santos",
  "Reyes",
  "Garcia",
  "Mendoza",
  "Torres",
  "Flores",
  "Aquino",
  "Castillo",
  "Ramos",
  "Fernandez",
  "Navarro",
  "Morales",
];

const barangays = [
  "Poblacion I",
  "Poblacion II",
  "Poblacion III",
  "San Isidro",
  "Bagumbayan",
  "Mabini",
  "Palanan",
  "Biniruan",
  "Purok 5",
  "Balogo",
];

const agencies = [
  "Municipal Office",
  "Health Office",
  "Treasurer's Office",
  "Engineering Office",
  "Agriculture Office",
  "MDRRMO",
  "Mayor's Office",
  "Public School",
  "Barangay Health Station",
];

const designations = [
  "Staff",
  "Driver",
  "Nurse",
  "Utility Worker",
  "Admin Aide",
  "Teacher",
  "Clerk",
  "Officer",
  "Midwife",
  "Volunteer",
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBirthDate() {
  const start = new Date(1958, 0, 1);
  const end = new Date(2005, 11, 31);

  const date = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );

  return date.toISOString().split("T")[0];
}

function randomPhone() {
  return "09" + Math.floor(100000000 + Math.random() * 900000000);
}

const patients = [];

for (let i = 0; i < 3000; i++) {
  const gender = Math.random() > 0.5 ? "MALE" : "FEMALE";

  const firstName =
    gender === "MALE"
      ? randomItem(firstNamesMale)
      : randomItem(firstNamesFemale);

  patients.push({
    lastName: randomItem(lastNames),
    firstName,
    middleName: randomItem(lastNames),
    birthDate: randomBirthDate(),
    gender,
    address: `${randomItem(barangays)}, Cotabato`,
    contactNo: randomPhone(),
    agency: randomItem(agencies),
    designation: randomItem(designations),
  });
}

const outputDir = path.join(process.cwd(), "data", "imports");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outputDir, "patients.json"),
  JSON.stringify(patients, null, 2)
);

console.log("Generated 3000 patient records.");