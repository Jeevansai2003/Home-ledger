// Demo data for local testing only. Run: node prisma/seed-demo.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

let seed = 42;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const between = (lo, hi) => Math.round(lo + rnd() * (hi - lo));

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production");

  const ownerEmail = "demo@homeledger.test";
  if (await prisma.user.findUnique({ where: { email: ownerEmail } })) {
    console.log("Demo data already exists. Nothing to do.");
    return;
  }

  const passwordHash = await bcrypt.hash("Demo@12345", 10);
  const household = await prisma.household.create({ data: { name: "Demo Family" } });
  const hid = household.id;

  const owner = await prisma.user.create({
    data: { name: "Asha Demo", email: ownerEmail, passwordHash, role: "OWNER", householdId: hid },
  });
  const member = await prisma.user.create({
    data: { name: "Ravi Demo", email: "ravi@homeledger.test", passwordHash, role: "MEMBER", householdId: hid },
  });

  const catDefs = [
    ["Groceries", "EXPENSE", "#16a34a"], ["Rent", "EXPENSE", "#0e4f4a"],
    ["Electricity", "EXPENSE", "#e9a23b"], ["Internet", "EXPENSE", "#2563eb"],
    ["Fuel", "EXPENSE", "#be3d2a"], ["School Fees", "EXPENSE", "#7c3aed"],
    ["Medical", "EXPENSE", "#db2777"], ["Dining Out", "EXPENSE", "#ea580c"],
    ["Shopping", "EXPENSE", "#0891b2"], ["Salary", "INCOME", "#1b7f55"],
    ["Business", "INCOME", "#15803d"],
  ];
  await prisma.category.createMany({
    data: catDefs.map(([name, type, color]) => ({ name, type, color, householdId: hid })),
  });
  const cats = Object.fromEntries(
    (await prisma.category.findMany({ where: { householdId: hid } })).map((c) => [c.name, c.id]),
  );

  const accDefs = [["Cash", "CASH", 5000], ["HDFC Savings", "BANK", 40000], ["Google Pay", "UPI", 0]];
  const accounts = [];
  for (const [name, type, opening] of accDefs) {
    accounts.push(await prisma.account.create({ data: { name, type, openingBalance: opening, householdId: hid } }));
  }

  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const rows = [];
  let n = 0;
  const add = (type, cat, amount, y, m, d, note) => {
    const date = Date.UTC(y, m, d);
    if (date > today) return; // no future entries
    n += 1;
    rows.push({
      type, amount, date: new Date(date), note: note ?? null,
      householdId: hid, categoryId: cats[cat],
      accountId: accounts[n % 3 === 0 ? 0 : n % 3 === 1 ? 1 : 2].id,
      userId: n % 2 === 0 ? owner.id : member.id,
    });
  };

  for (let k = 3; k >= 0; k--) {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1));
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth();

    add("INCOME", "Salary", 85000, y, m, 1, "Monthly salary");
    if (k % 2 === 0) add("INCOME", "Business", between(6000, 14000), y, m, 15, "Side income");
    add("EXPENSE", "Rent", 22000, y, m, 3, "House rent");
    add("EXPENSE", "Electricity", between(1900, 3100), y, m, 8, "Electricity bill");
    add("EXPENSE", "Internet", 999, y, m, 10, "Broadband");
    if (m % 3 === 0) add("EXPENSE", "School Fees", 12000, y, m, 5, "Quarterly fees");
    [2, 7, 13, 19, 25].forEach((d) => add("EXPENSE", "Groceries", between(550, 2300), y, m, d, "Groceries"));
    [6, 21].forEach((d) => add("EXPENSE", "Fuel", between(900, 1800), y, m, d, "Petrol"));
    [9, 16, 27].forEach((d) => add("EXPENSE", "Dining Out", between(450, 1700), y, m, d));
    add("EXPENSE", "Shopping", between(1200, 4800), y, m, 18);
    if (rnd() > 0.5) add("EXPENSE", "Medical", between(300, 2200), y, m, 22, "Pharmacy");
  }
  await prisma.transaction.createMany({ data: rows });

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const budgets = { Groceries: 9000, Rent: 22000, Electricity: 3000, "Dining Out": 3000, Fuel: 3500, Shopping: 4000 };
  await prisma.budget.createMany({
    data: Object.entries(budgets).map(([name, amount]) => ({
      amount, month: monthStart, householdId: hid, categoryId: cats[name],
    })),
  });

  console.log(`Created demo household with ${rows.length} transactions.`);
  console.log("Login: demo@homeledger.test   Password: Demo@12345   (second member: ravi@homeledger.test)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());