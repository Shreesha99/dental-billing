// tests/billing-flows.spec.js
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const BASE = "https://dental-billing-eeoa.vercel.app";
const OUT_DIR = path.join(__dirname, "..", "test-results", "pdfs");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function login(page) {
  await page.goto(BASE);
  await page.fill('input[name="email"]', "test@mail.com");
  await page.fill('input[name="password"]', "test123");
  await page.click('button:has-text("Login")');
  await page.waitForSelector("text=Dashboard", { timeout: 10000 });
}

test.describe("🦷 Dental Billing App – Full Flow Tests", () => {
  test("1️⃣ Basic bill creation and PDF download", async ({ page }) => {
    await login(page);
    await page.click("text=Create Bill");
    await page.click("text=New Patient");
    await page.fill('input[name="patientName"]', "Automation Basic");
    await page.fill('input[name="phone"]', "9000001111");
    await page.fill('input[name="email"]', "auto.basic@test.com");

    await page.click("text=Add Treatment");
    await page.fill('input[name="treatmentName"]', "Scaling");
    await page.fill('input[name="treatmentPrice"]', "800");
    await page.fill('input[name="treatmentQty"]', "1");
    await page.click("text=Save Treatment");
    await page.click("text=Save Bill");

    await page.waitForSelector("text=Bill saved", { timeout: 5000 });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("text=Download PDF"),
    ]);
    const filePath = path.join(OUT_DIR, "basic-bill.pdf");
    await download.saveAs(filePath);
    console.log("✅ Saved basic-bill.pdf");
  });

  test("2️⃣ Bill with discount, tax, and multiple payments", async ({
    page,
  }) => {
    await login(page);
    await page.click("text=Create Bill");
    await page.click("text=Existing Patient");
    await page.fill('input[name="searchPatient"]', "Automation Basic");
    await page.click("text=Automation Basic");

    await page.click("text=Add Treatment");
    await page.fill('input[name="treatmentName"]', "Root Canal");
    await page.fill('input[name="treatmentPrice"]', "3500");
    await page.fill('input[name="treatmentQty"]', "1");
    await page.click("text=Save Treatment");

    await page.fill('input[name="discount"]', "10");
    const taxToggle = page.locator('input[name="taxEnabled"]');
    if (await taxToggle.isVisible()) await taxToggle.check();

    await page.click("text=Add Payment");
    await page.selectOption('select[name="paymentMode"]', "cash");
    await page.fill('input[name="paymentAmount"]', "2000");
    await page.click("text=Add Payment");

    await page.click("text=Add Payment");
    await page.selectOption('select[name="paymentMode"]', "upi");
    await page.fill('input[name="paymentAmount"]', "1650");
    await page.click("text=Add Payment");

    await page.click("text=Save Bill");
    await page.waitForSelector("text=Bill saved");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("text=Download PDF"),
    ]);
    const filePath = path.join(OUT_DIR, "discount-mixed.pdf");
    await download.saveAs(filePath);
    console.log("✅ Saved discount-mixed.pdf");
  });

  test("3️⃣ Edge: zero price, free checkup, huge bill", async ({ page }) => {
    await login(page);
    // Free checkup
    await page.click("text=Create Bill");
    await page.click("text=New Patient");
    await page.fill('input[name="patientName"]', "Zero Checkup");
    await page.fill('input[name="phone"]', "9000002222");
    await page.click("text=Add Treatment");
    await page.fill('input[name="treatmentName"]', "Free Consultation");
    await page.fill('input[name="treatmentPrice"]', "0");
    await page.click("text=Save Treatment");
    await page.click("text=Save Bill");
    await expect(
      page
        .locator("text=Cannot create bill with zero amount")
        .or(page.locator("text=Bill saved"))
    ).toBeVisible();

    // Huge bill
    await page.click("text=Create Bill");
    await page.click("text=New Patient");
    await page.fill('input[name="patientName"]', "Massive Case");
    await page.fill('input[name="phone"]', "9000003333");
    await page.click("text=Add Treatment");
    await page.fill('input[name="treatmentName"]', "Full Mouth Reconstruction");
    await page.fill('input[name="treatmentPrice"]', "99999999");
    await page.click("text=Save Treatment");
    await page.click("text=Save Bill");
    await page.waitForSelector("text=Bill saved");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("text=Download PDF"),
    ]);
    const filePath = path.join(OUT_DIR, "massive-bill.pdf");
    await download.saveAs(filePath);
    console.log("✅ Saved massive-bill.pdf");
  });
});
