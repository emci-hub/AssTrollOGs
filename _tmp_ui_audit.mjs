import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });

// 1) Fresh onboarding welcome screen.
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/pet-test/out/audit_01_welcome.png' });

// 2) A psych question step (cards type) — set state directly, bypassing
// the dev-panel password gate that devJumpStep requires.
await page.evaluate(async () => {
  const mod = await import('/src/profile-builder.js');
  window.AppState.currentStep = 3;
  mod.renderActiveStep();
});
await page.waitForTimeout(200);
await page.screenshot({ path: '/tmp/pet-test/out/audit_02_question.png' });

// 3) MBTI step.
await page.evaluate(async () => {
  const mod = await import('/src/profile-builder.js');
  window.AppState.currentStep = 6;
  mod.renderActiveStep();
});
await page.waitForTimeout(200);
await page.screenshot({ path: '/tmp/pet-test/out/audit_03_mbti.png' });

// 4) Full dashboard.
await page.evaluate(() => {
  window.devForceDashboard();
  window.toggleDeveloperPanel(); // devForceDashboard toggles it open as a side effect of the test shortcut; close it back
  window.initPet();
  window._renderFriendsSection();
});
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/pet-test/out/audit_04_dashboard_top.png' });
await page.evaluate(() => document.getElementById('daily-screen').scrollTop = 500);
await page.waitForTimeout(150);
await page.screenshot({ path: '/tmp/pet-test/out/audit_05_dashboard_mid.png' });
await page.evaluate(() => document.getElementById('daily-screen').scrollTop = 1400);
await page.waitForTimeout(150);
await page.screenshot({ path: '/tmp/pet-test/out/audit_06_dashboard_games.png' });
await page.evaluate(() => document.getElementById('daily-screen').scrollTop = 2600);
await page.waitForTimeout(150);
await page.screenshot({ path: '/tmp/pet-test/out/audit_07_dashboard_bottom.png' });

// 5) A drawer (deep insight).
await page.evaluate(() => window.openDrawer('vibe'));
await page.waitForTimeout(300);
await page.locator('#detail-drawer').screenshot({ path: '/tmp/pet-test/out/audit_08_drawer_vibe.png' });

// 6) Dev panel (authenticated view).
await page.evaluate(() => window.closeDrawer());
await page.evaluate(() => window.toggleDeveloperPanel());
await page.waitForTimeout(150);
await page.fill('#dev-password-input', 'Calgary1!');
await page.evaluate(() => window.devLogin());
await page.waitForTimeout(200);
await page.screenshot({ path: '/tmp/pet-test/out/audit_09_devpanel.png' });

await browser.close();
console.log('UI audit screenshots done.');
