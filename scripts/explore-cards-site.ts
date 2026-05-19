import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "scripts", "exploration");
const PAGE_URL = "https://www.gundam-gcg.com/en/cards/";
const GD01_VAL = "616101";

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();

  console.log(`[1] navigate ${PAGE_URL}`);
  await page.goto(PAGE_URL, { waitUntil: "networkidle" });

  console.log(`[2] click GD01 (data-val=${GD01_VAL}) via JS evaluation (bypasses visibility)`);
  const clicked = await page.evaluate((val) => {
    const btn = document.querySelector<HTMLElement>(`a.js-selectBtn-package[data-val="${val}"]`);
    if (!btn) return false;
    btn.click();
    return true;
  }, GD01_VAL);
  console.log(`    clicked: ${clicked}`);
  await page.waitForTimeout(300);

  console.log(`[3] click submit via JS evaluation`);
  const submitted = await page.evaluate(() => {
    const btn = document.querySelector<HTMLElement>("a.js-submit");
    if (!btn) return false;
    btn.click();
    return true;
  });
  console.log(`    submitted: ${submitted}`);

  // Wait for navigation OR new content
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const resultsUrl = page.url();
  console.log(`[4] after-search URL: ${resultsUrl}`);

  await page.screenshot({ path: path.join(OUT_DIR, "03-after-search.png"), fullPage: true });
  const resultsHtml = await page.content();
  await writeFile(path.join(OUT_DIR, "03-results.html"), resultsHtml);
  console.log(`    saved 03-after-search.png and 03-results.html (len: ${resultsHtml.length})`);

  console.log(`[5] inspect candidate result containers`);
  for (const sel of [
    ".cardlist", "#cardlist", ".search-result", ".card-list",
    ".result", "ul.card", ".card-item", "[data-card]", "li.card",
    ".cardDispCol", ".cardDispItem", ".cardDisp", ".cardListItem",
    "ul.cardList li", ".js-card", ".card",
  ]) {
    const c = await page.locator(sel).count();
    if (c > 0) console.log(`    "${sel}": ${c} elements`);
  }

  console.log(`[6] sample first card-like element if any`);
  const firstCard = await page.evaluate(() => {
    const candidates = [
      ".cardDispCol", ".cardDispItem", ".cardDisp", ".cardListItem",
      "ul.cardList > li", ".js-card", ".card", "[data-card]",
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) return { selector: sel, outerHTML: el.outerHTML.slice(0, 2000) };
    }
    return null;
  });
  if (firstCard) {
    console.log(`    first match selector: ${firstCard.selector}`);
    console.log(`    outerHTML preview:\n${firstCard.outerHTML}`);
  } else {
    console.log("    no card-like element found");
  }

  await browser.close();
  console.log("done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
