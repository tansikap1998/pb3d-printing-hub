import { defineConfig, devices } from "@playwright/test"
import path from "path"

const PORT = Number(process.env.E2E_PORT || 3100)
const BASE = `http://localhost:${PORT}`
export const ADMIN_EMAIL = "tansika.p1998@gmail.com"
export const ADMIN_PASSWORD = "e2e-test-password"

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: BASE,
    trace: "off",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "unit", testDir: "./tests/unit" },
    { name: "e2e", testDir: "./tests/e2e", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    // Runs against a production build; Supabase is left unconfigured so orders use the
    // browser-storage demo mode and Shopee products use a throwaway JSON file.
    command: `npx next start -p ${PORT}`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ADMIN_PASSWORD,
      NEXTAUTH_URL: BASE,
      NEXTAUTH_SECRET: "e2e-secret",
      SHOPEE_DATA_FILE: path.join(__dirname, "test-results", "shopee-products.e2e.json"),
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  },
})
