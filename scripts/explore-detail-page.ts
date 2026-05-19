import { writeFile } from "node:fs/promises";
import path from "node:path";

const URL = "https://www.gundam-gcg.com/en/cards/detail.php?detailSearch=GD01-001";

async function main() {
  const res = await fetch(URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  console.log("status:", res.status);
  const html = await res.text();
  console.log("length:", html.length);
  await writeFile(
    path.join(process.cwd(), "scripts", "exploration", "04-detail-GD01-001.html"),
    html,
  );
  console.log("saved scripts/exploration/04-detail-GD01-001.html");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
