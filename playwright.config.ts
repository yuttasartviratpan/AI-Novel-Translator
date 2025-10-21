// playwright.config.ts
import { defineConfig } from '@playwright';

export default defineConfig({
  // Makes each individual test run indefinitely
  timeout: 0, 
  
  // Makes the entire test suite run indefinitely
  globalTimeout: 0,
  
  // Use a very large number for assertions to wait a long time
  // (0 is not recommended for expect)
  expect: {
    timeout: 300000, // Wait up to 5 minutes for assertions
  },
  
  use: {
    // These are already 0 by default, meaning unlimited
    actionTimeout: 0, 
    navigationTimeout: 0,
  },
});