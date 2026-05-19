import { test, expect } from '@playwright/test';

test.describe('Prime-Pick AI Assistant Sync', () => {
  test('should sync messages between widget and contact page', async ({ page }) => {
    // 1. Go to home page
    await page.goto('/', { waitUntil: 'networkidle' });

    // 2. Open Chat Widget
    const widgetButton = page.locator('button.btn-circle.btn-primary').last();
    await expect(widgetButton).toBeVisible({ timeout: 10000 });
    await widgetButton.click();

    // 3. Find the widget input specifically
    const widgetInput = page.locator('input[placeholder="Ask about products..."]');
    await expect(widgetInput).toBeVisible({ timeout: 15000 });

    // 4. Send message from widget
    await widgetInput.fill('Hello from Widget!');
    await widgetInput.press('Enter');

    // 5. Verify user message appeared in widget
    const userMessageInWidget = page.locator(
      '[data-testid="chat-message"][data-role="user"]'
    ).filter({ hasText: 'Hello from Widget!' });
    await expect(userMessageInWidget).toBeVisible({ timeout: 10000 });

    // 6. Navigate to contact page
    await page.goto('/contact', { waitUntil: 'networkidle' });

    // 7. Verify message persisted via sessionStorage
    const messageInContact = page.locator(
      '[data-testid="chat-message"]'
    ).filter({ hasText: 'Hello from Widget!' }).first();
    await expect(messageInContact).toBeVisible({ timeout: 10000 });

    // 8. Send reply from contact page
    const contactInput = page.locator(
      'input[placeholder="Ask me anything about our products..."]'
    );
    await expect(contactInput).toBeVisible({ timeout: 10000 });
    await contactInput.fill('Reply from Contact Page');
    await contactInput.press('Enter');

    // 9. Verify reply appeared
    const replyInContact = page.locator(
      '[data-testid="chat-message"][data-role="user"]'
    ).filter({ hasText: 'Reply from Contact Page' });
    await expect(replyInContact).toBeVisible({ timeout: 10000 });

    // 10. Go back to home and reopen widget
    await page.goto('/', { waitUntil: 'networkidle' });
    const widgetButtonHome = page.locator('button.btn-circle.btn-primary').last();
    await widgetButtonHome.click();

    // 11. Both messages should persist in widget via sessionStorage
    const widgetMessage1 = page.locator(
      '[data-testid="chat-message"][data-role="user"]'
    ).filter({ hasText: 'Hello from Widget!' });
    await expect(widgetMessage1).toBeVisible({ timeout: 10000 });

    const widgetMessage2 = page.locator(
      '[data-testid="chat-message"][data-role="user"]'
    ).filter({ hasText: 'Reply from Contact Page' });
    await expect(widgetMessage2).toBeVisible({ timeout: 10000 });
  });
});