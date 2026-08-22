import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { join } from "node:path";

const dataDir = join(process.cwd(), ".pgdata");
const port = Number(process.env.PGPORT ?? 5433);

async function main() {
  const command = process.argv[2] ?? "up";

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "agile",
    password: "agile",
    port,
    persistent: true,
  });

  if (command === "down") {
    await pg.stop();
    return;
  }

  const firstRun = !existsSync(join(dataDir, "PG_VERSION"));
  if (firstRun) {
    await pg.initialise();
  }
  await pg.start();
  if (firstRun) {
    await pg.createDatabase("agile");
  }
  console.log(`postgres ready on :${port}`);
  process.on("SIGINT", async () => {
    await pg.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
