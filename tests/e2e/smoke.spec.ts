import { expect, test, type Page } from "@playwright/test";

const stamp = Date.now();
const email = `e2e-${stamp}@homeledger.test`;
const password = "E2e-Test-12345";
const MAX_LOGIN_MS = Number(process.env.E2E_MAX_LOGIN_MS ?? 20000);
const MAX_ADD_MS = Number(process.env.E2E_MAX_ADD_MS ?? 10000);

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const t0 = Date.now();
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: MAX_LOGIN_MS });
  return Date.now() - t0;
}

test("register, log out, log in, then use the app", async ({ page }) => {
  test.setTimeout(240_000);

  // 1. Register
  await page.goto("/register");
  await page.getByLabel("Your name").fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Household name").fill(`E2E household ${stamp}`);
  const t0 = Date.now();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard", { timeout: 60_000 });
  console.log(`TIMING register -> dashboard: ${Date.now() - t0} ms`);
  await expect(page.getByText("Invite code for family members")).toBeVisible();

  // 2. Log out, then log in again
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL("**/login**");
  const loginMs = await signIn(page);
  console.log(`TIMING login -> dashboard: ${loginMs} ms`);
  expect(loginMs).toBeLessThan(MAX_LOGIN_MS);

  // 3. Add several transactions in a row; every one must appear
  await page.goto("/transactions");
  const notes: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const note = `e2e-note-${stamp}-${i}`;
    notes.push(note);
    await page.getByLabel("Amount").fill(String(100 * i));
    await page.getByLabel("Category").selectOption({ label: "Groceries" });
    await page.getByLabel("Note").fill(note);
    const start = Date.now();
    await page.getByRole("button", { name: "Add transaction" }).click();
    await expect(page.getByText(note)).toBeVisible({ timeout: MAX_ADD_MS });
    console.log(`TIMING add transaction #${i}: ${Date.now() - start} ms`);
  }
  await expect(page.getByText("₹1,500").first()).toBeVisible(); // 100+200+300+400+500

  // 4. Delete one of them
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("listitem")
    .filter({ hasText: notes[0] })
    .getByRole("button", { name: "Delete transaction" })
    .click();
  await expect(page.getByText(notes[0])).toHaveCount(0);

  // 5. Add a bill and mark it paid
  await page.goto("/bills");
  await page.getByLabel("Bill name").fill("E2E rent");
  await page.getByLabel("Amount", { exact: true }).fill("1000");
  await page.getByLabel("Category", { exact: true }).selectOption({ label: "Rent" });
  await page.getByRole("button", { name: "Add bill" }).click();
  await expect(page.getByText("E2E rent").first()).toBeVisible();
  await page.getByRole("button", { name: "Mark paid" }).click();
  await expect(page.getByText("Marked E2E rent as paid")).toBeVisible();

  // 6. Every page opens, has no 404, and shows the sidebar
  for (const path of ["/dashboard", "/transactions", "/budgets", "/bills", "/insights", "/settings", "/account"]) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} status`).toBeLessThan(400);
    await expect(page.getByRole("navigation", { name: "Main" }).first(), `${path} sidebar`).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }).first(), `${path} heading`).toBeVisible();
  }
});

test("private pages send a logged-out visitor to the login page", async ({ page }) => {
  for (const path of ["/dashboard", "/transactions", "/budgets", "/bills", "/insights", "/settings", "/account", "/transactions/abc/edit"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/login/);
  }
});

test("a wrong password shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`nobody-${stamp}@homeledger.test`);
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Wrong email or password")).toBeVisible();
});
