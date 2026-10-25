import { test, expect } from "@playwright/test";
test("shows actionable provider diagnostics and permits a deliberate retry", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/ai", async (route) => {
    requests++;
    const error =
      requests === 1
        ? {
            type: "error",
            error: "ChatGPT could not accept this request.",
            code: "invalid_type",
            providerMessage: "Expected an array for input[0].content.",
            providerStatus: 400,
            transportStatus: 200,
            requestId: "req_browser_failure",
            param: "input[0].content",
          }
        : {
            type: "error",
            error:
              "ChatGPT usage limit reached. Review Margin’s allowance in ChatGPT Settings → Usage.",
            code: "subscription_sharing_usage_limit_exceeded",
            providerMessage: "The app allowance is exhausted.",
            providerStatus: 429,
            requestId: "req_browser_limit",
          };
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: JSON.stringify(error) + "\n",
    });
  });
  await page.goto("/?view=practice");
  await page
    .getByRole("button", { name: "Make a practice", exact: true })
    .click();
  const alert = page.locator(".global-error");
  await expect(alert).toContainText("ChatGPT could not accept this request.");
  await expect(alert).toContainText("invalid_type");
  await expect(alert).toContainText("HTTP 400");
  await expect(alert).toContainText("req_browser_failure");
  await alert.getByText("Provider details", { exact: true }).click();
  await expect(alert).toContainText("Expected an array for input[0].content.");
  expect(requests).toBe(1);
  await page
    .getByRole("button", { name: "Dismiss error", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Make a practice", exact: true })
    .click();
  await expect(alert).toContainText("A pause for ChatGPT");
  await expect(
    alert.getByRole("link", { name: /ChatGPT usage/ }),
  ).toHaveAttribute("href", "https://chatgpt.com/settings/usage");
  expect(requests).toBe(2);
});
