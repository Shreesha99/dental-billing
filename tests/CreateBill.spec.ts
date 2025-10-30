import { test, expect } from "@playwright/test";

test.describe("🦷 Dental Billing Auth Flow", () => {
  test("should auto-register new user if login fails, then verify login/logout flow", async ({
    page,
  }) => {
    await page.goto("https://dental-billing-eeoa.vercel.app/", {
      waitUntil: "domcontentloaded",
    });

    // generate unique email
    const email = `user_${Date.now()}@mail.com`;
    const password = "test123";

    console.log(`🧪 Testing with: ${email}`);

    // -----------------------------
    // 🔑 TRY LOGIN FIRST
    // -----------------------------
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: /login/i }).click();

    // detect either success (dashboard) or failure (error toast/message)
    const dashboard = page.locator("text=Create Bill");
    const userNotFound =
      page.locator("text=User not found").first() ||
      page.locator("text=No account found with this email");

    // if login fails, handle registration
    const loginFailed = await Promise.race([
      userNotFound
        .waitFor({ timeout: 7000 })
        .then(() => true)
        .catch(() => false),
      dashboard
        .waitFor({ timeout: 7000 })
        .then(() => false)
        .catch(() => false),
    ]);

    if (loginFailed) {
      console.log("⚠️ User not found — proceeding to signup flow");

      // -----------------------------
      // 🧾 SIGNUP FLOW
      // -----------------------------
      const signupBtn = page
        .getByRole("button", { name: /create account/i })
        .or(page.getByRole("link", { name: /sign up/i }));

      if (await signupBtn.isVisible().catch(() => false)) {
        await signupBtn.click();
      } else {
        // fallback: direct navigation
        await page.goto("https://dental-billing-eeoa.vercel.app/signup");
      }

      await page.waitForSelector("text=Create your account", {
        timeout: 10000,
      });

      await page.getByPlaceholder("Email").fill(email);
      await page.getByPlaceholder("Password").fill(password);
      await page.getByRole("button", { name: /sign up/i }).click();

      // Wait for dashboard after signup
      await expect(dashboard).toBeVisible({ timeout: 15000 });
      console.log("✅ Account created and logged in successfully");

      // -----------------------------
      // 🚪 LOGOUT FLOW
      // -----------------------------
      const logoutButton = page.getByRole("button", { name: /logout/i });
      await expect(logoutButton).toBeVisible({ timeout: 10000 });
      await logoutButton.click();

      await expect(page.getByRole("button", { name: /login/i })).toBeVisible({
        timeout: 10000,
      });
      console.log("✅ Logged out successfully");
    } else {
      console.log("✅ Existing account — already logged in.");
    }

    // -----------------------------
    // 🔐 LOGIN AGAIN TO VERIFY
    // -----------------------------
    console.log("🔁 Logging in again to verify account...");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: /login/i }).click();

    await expect(dashboard).toBeVisible({ timeout: 15000 });
    console.log("✅ Login verified successfully for newly created user");
  });
});
