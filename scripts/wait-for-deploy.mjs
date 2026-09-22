const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
const expectedCommit = process.env.EXPECTED_COMMIT;
const timeoutMs = Number(process.env.DEPLOY_TIMEOUT_MS ?? 15 * 60 * 1000);
const intervalMs = Number(process.env.DEPLOY_POLL_INTERVAL_MS ?? 15 * 1000);

if (!baseUrl || !expectedCommit) {
  throw new Error("PLAYWRIGHT_BASE_URL e EXPECTED_COMMIT são obrigatórios.");
}

const deadline = Date.now() + timeoutMs;
let attempt = 0;

while (Date.now() < deadline) {
  attempt += 1;
  try {
    const response = await fetch(`${baseUrl}/build-info.json?attempt=${attempt}`, {
      headers: { "cache-control": "no-cache" },
    });

    if (response.ok) {
      const build = await response.json();
      if (build.commit === expectedCommit) {
        console.log(`Deploy confirmado no commit ${expectedCommit}.`);
        process.exit(0);
      }
      console.log(`Tentativa ${attempt}: Render ainda está em ${build.commit ?? "commit desconhecido"}.`);
    } else {
      console.log(`Tentativa ${attempt}: build-info respondeu HTTP ${response.status}.`);
    }
  } catch (error) {
    console.log(`Tentativa ${attempt}: ${error instanceof Error ? error.message : "falha de conexão"}.`);
  }

  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}

throw new Error(`O Render não publicou ${expectedCommit} dentro de ${Math.round(timeoutMs / 60000)} minutos.`);
