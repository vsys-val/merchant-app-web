import { useEffect, useState } from "react";
import { ArrowClockwise, ArrowLeft, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../../lib/api";
import { getCategoryLabel } from "../products/category-labels";
import { AdminOverview, getAdminOverview } from "./admin-api";
import {
  BarList,
  ColumnChart,
  DivergingBars,
  formatDay,
  healthFor,
  LineChart,
  numberFormat,
  SimpleTable,
  StatTile,
} from "./charts";
import { getAspectLabel } from "../products/aspect-labels";
import "./admin.css";

const PERIODS = [7, 30, 90] as const;

const webCommit = typeof __BUILD_COMMIT__ === "string" ? __BUILD_COMMIT__ : "local";

const pct = (value: number | null) => (value === null ? "—" : `${value.toLocaleString("pt-BR")}%`);
const ms = (value: number | null) => (value === null ? "—" : value > 3200 ? "> 3.200 ms" : `≤ ${numberFormat.format(value)} ms`);
const shortCommit = (commit: string | null) => (commit ? commit.slice(0, 7) : "desconhecido");
const dateTime = (iso: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

function uptime(seconds: number | null) {
  if (seconds === null) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours >= 24 ? `${Math.floor(hours / 24)} d ${hours % 24} h` : `${hours} h ${minutes} min`;
}

export function AdminDashboard({ onBack }: { onBack(): void }) {
  const { token, user } = useAuth();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token || !user?.is_admin) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError("");
    getAdminOverview(days, token, controller.signal)
      .then(setData)
      .catch((caught) => {
        if (controller.signal.aborted) return;
        setError(caught instanceof ApiError ? caught.message : "Não foi possível carregar o painel.");
      })
      .finally(() => !controller.signal.aborted && setIsLoading(false));
    return () => controller.abort();
  }, [days, token, reloadKey, user?.is_admin]);

  if (!user?.is_admin) {
    return (
      <main className="adminPage adminState">
        <p>Esta área é restrita à administração.</p>
        <button type="button" className="secondaryButton" onClick={onBack}>Voltar ao início</button>
      </main>
    );
  }

  return (
    <main className="adminPage" aria-busy={isLoading}>
      <header className="adminHeader">
        <button type="button" className="adminBack" onClick={onBack} aria-label="Voltar ao app"><ArrowLeft size={20} /></button>
        <div>
          <p className="eyebrow">Administração</p>
          <h1>Painel do Merchant</h1>
        </div>
      </header>

      <div className="adminFilters" role="group" aria-label="Período">
        {PERIODS.map((period) => (
          <button key={period} type="button" aria-pressed={days === period} onClick={() => setDays(period)}>
            Últimos {period} dias
          </button>
        ))}
        <button type="button" className="adminRefresh" onClick={() => setReloadKey((value) => value + 1)} disabled={isLoading}>
          <ArrowClockwise size={16} />{isLoading ? "Atualizando…" : "Atualizar"}
        </button>
        {data && <span className="adminUpdated">Gerado em {dateTime(data.generated_at)} · dias no fuso de São Paulo</span>}
      </div>

      {error && <p className="formError" role="alert">{error}</p>}
      {!data && !error && <p className="adminState" aria-live="polite">Carregando indicadores…</p>}
      {data && <Overview data={data} />}
    </main>
  );
}

function Overview({ data }: { data: AdminOverview }) {
  const { system, totals, product, catalog, technical, frontend } = data;
  const labels = data.daily.map((day) => formatDay(day.date));
  const databaseUp = system.database.status === "available";
  const sameVersion = system.api_commit !== null && webCommit !== "local";

  return (
    <div className="adminSections">
      <section aria-labelledby="health-title">
        <h2 id="health-title">Saúde agora</h2>
        <ul className="healthStrip">
          <li className={databaseUp ? "good" : "bad"}>
            {databaseUp ? <CheckCircle size={18} weight="fill" /> : <WarningCircle size={18} weight="fill" />}
            <span><strong>API e banco {databaseUp ? "no ar" : "com falha"}</strong>
              {system.database.latency_ms !== null && <small>banco respondeu em {system.database.latency_ms} ms</small>}</span>
          </li>
          <li><span><strong>API · {shortCommit(system.api_commit)}</strong><small>no ar há {uptime(system.uptime_seconds)} · {system.environment}</small></span></li>
          <li><span><strong>Web · {shortCommit(webCommit)}</strong><small>{sameVersion ? "build carregado neste navegador" : "build local, fora do Render"}</small></span></li>
          <li className={system.email_delivery === "disabled" ? "warn" : "good"}>
            {system.email_delivery === "disabled" ? <WarningCircle size={18} weight="fill" /> : <CheckCircle size={18} weight="fill" />}
            <span><strong>E-mail {system.email_delivery === "disabled" ? "desligado" : "ativo"}</strong>
              <small>{system.email_delivery === "disabled" ? "confirmação de conta inativa" : system.email_delivery}</small></span>
          </li>
        </ul>
      </section>

      <section aria-labelledby="product-title">
        <h2 id="product-title">Produto <small>metas definidas na visão de produto</small></h2>
        <div className="statGrid">
          <StatTile hero label="North Star · consultas a produtos já avaliados por usuário ativo (7 dias)"
            value={product.north_star.value === null ? "—" : product.north_star.value.toLocaleString("pt-BR")}
            goal={`Meta: ≥ ${product.north_star.target}`}
            health={healthFor(product.north_star.value, product.north_star.target, "min")}
            detail={`${numberFormat.format(product.north_star.own_review_views)} consultas · ${numberFormat.format(product.north_star.weekly_active_users)} usuários ativos`} />
          <StatTile label="Buscas com resultado" value={pct(product.searches.with_results_pct)}
            goal={`Meta: ≥ ${product.searches.target_with_results_pct}%`}
            health={healthFor(product.searches.with_results_pct, product.searches.target_with_results_pct, "min")}
            detail={`${numberFormat.format(product.searches.total)} buscas · ${pct(product.searches.barcode_pct)} por código · ${pct(product.searches.approximate_pct ?? null)} só com parecidos`} />
          <StatTile label="Ativação · 1ª avaliação em até 7 dias" value={pct(product.activation.pct)}
            goal={`Meta: ≥ ${product.activation.target_pct}%`}
            health={healthFor(product.activation.pct, product.activation.target_pct, "min")}
            detail={`${product.activation.activated} de ${product.activation.cohort} contas com 7+ dias`} />
          <StatTile label="Abandono da avaliação" value={pct(product.review_funnel.abandonment_pct)}
            goal={`Meta: < ${product.review_funnel.target_abandonment_pct}%`}
            health={healthFor(product.review_funnel.abandonment_pct, product.review_funnel.target_abandonment_pct, "max")} />
          <StatTile label="Conflitos no cadastro de produto" value={pct(product.product_creation.conflict_pct)}
            goal={`Meta: < ${product.product_creation.target_conflict_pct}%`}
            health={healthFor(product.product_creation.conflict_pct, product.product_creation.target_conflict_pct, "max")}
            detail={`${product.product_creation.conflicts} de ${product.product_creation.submitted} tentativas`} />
          <StatTile label="Avaliações por usuário ativo"
            value={product.reviews_per_active_user === null ? "—" : product.reviews_per_active_user.toLocaleString("pt-BR")}
            detail={`${product.signups_completed} cadastros concluídos no período`} />
          {product.barcode_scanner && (
            <StatTile label="Leitor de código de barras · leituras concluídas" value={pct(product.barcode_scanner.detected_pct)}
              detail={`${numberFormat.format(product.barcode_scanner.opened)} aberturas · ${pct(product.barcode_scanner.camera_unavailable_pct)} sem câmera disponível`} />
          )}
        </div>
        <div className="chartGrid">
          <LineChart title="Uso por dia" subtitle="Sessões anônimas e usuários autenticados com ao menos um evento" labels={labels}
            series={[
              { name: "Sessões", slot: 1, values: data.daily.map((day) => day.sessions) },
              { name: "Usuários ativos", slot: 2, values: data.daily.map((day) => day.active_users) },
            ]} />
          <figure className="chartCard">
            <figcaption><h3>Funil da avaliação</h3><p>Sessões que chegaram a cada etapa</p></figcaption>
            <BarList ordinal rows={product.review_funnel.steps.map((step, index) => ({
              label: step.step,
              value: step.sessions,
              detail: index > 0 && product.review_funnel.steps[0].sessions > 0
                ? ` · ${Math.round((step.sessions * 100) / product.review_funnel.steps[0].sessions)}%`
                : undefined,
            }))} />
          </figure>
        </div>
      </section>

      <section aria-labelledby="growth-title">
        <h2 id="growth-title">Crescimento</h2>
        <div className="statGrid compact">
          <StatTile label="Contas" value={numberFormat.format(totals.users)} detail={`${totals.users_verified} confirmadas · ${totals.users_pending} pendentes`} />
          <StatTile label="Produtos ativos" value={numberFormat.format(totals.products_active)} detail={`${totals.products_deleted} excluídos`} />
          <StatTile label="Avaliações" value={numberFormat.format(totals.reviews)} detail={`${totals.reviews_with_comment} com comentário`} />
        </div>
        <div className="chartGrid three">
          <ColumnChart title="Novas contas" points={data.daily.map((day) => ({ label: formatDay(day.date), value: day.new_users }))} />
          <ColumnChart title="Novos produtos" points={data.daily.map((day) => ({ label: formatDay(day.date), value: day.new_products }))} />
          <ColumnChart title="Novas avaliações" points={data.daily.map((day) => ({ label: formatDay(day.date), value: day.new_reviews }))} />
        </div>
      </section>

      <section aria-labelledby="catalog-title">
        <h2 id="catalog-title">Catálogo</h2>
        <div className="chartGrid">
          <figure className="chartCard">
            <figcaption><h3>Produtos por categoria</h3><p>{pct(catalog.products_without_reviews_pct)} dos produtos ativos ainda sem avaliação</p></figcaption>
            <BarList rows={catalog.by_category.map((row) => ({ label: getCategoryLabel(row.category), value: row.products }))} />
          </figure>
          <figure className="chartCard">
            <figcaption><h3>Motivos citados</h3><p>Percepções por aspecto em todas as avaliações</p></figcaption>
            {catalog.aspects.length === 0
              ? <p className="emptyChart">Nenhum motivo registrado ainda.</p>
              : <DivergingBars rows={catalog.aspects.map((row) => ({ label: getAspectLabel(row.aspect), positive: row.positive, negative: row.negative }))} />}
          </figure>
          <figure className="chartCard">
            <figcaption><h3>Compraria de novo?</h3><p>Todas as avaliações</p></figcaption>
            <BarList rows={[
              { label: "Sim", value: catalog.repurchase.yes },
              { label: "Talvez", value: catalog.repurchase.maybe },
              { label: "Não", value: catalog.repurchase.no },
            ]} />
          </figure>
          <figure className="chartCard">
            <figcaption><h3>Mais avaliados</h3></figcaption>
            {catalog.top_products.length === 0
              ? <p className="emptyChart">Nenhuma avaliação ainda.</p>
              : <SimpleTable headers={["Produto", "Marca", "Avaliações"]} rows={catalog.top_products.map((row) => [row.name, row.brand, numberFormat.format(row.reviews)])} />}
          </figure>
        </div>
      </section>

      <section aria-labelledby="tech-title">
        <h2 id="tech-title">Operação da API <small>health check do Render não entra na conta</small></h2>
        <div className="statGrid compact">
          <StatTile label="Requisições no período" value={numberFormat.format(technical.requests)} />
          <StatTile label="Latência p95" value={ms(technical.p95_ms)} goal={`Meta: < ${numberFormat.format(technical.target_p95_ms)} ms`}
            health={healthFor(technical.p95_ms, technical.target_p95_ms, "max")} />
          <StatTile label="Erros 5xx" value={pct(technical.error_5xx_pct)} goal="Meta: < 1%"
            health={healthFor(technical.error_5xx_pct, 1, "max")} detail={`4xx: ${pct(technical.error_4xx_pct)}`} />
        </div>
        <div className="chartGrid">
          <ColumnChart title="Requisições por dia" points={technical.daily.map((day) => ({ label: formatDay(day.date), value: day.requests }))} />
          <ColumnChart title="Latência p95 por dia" subtitle="Limite superior da faixa que contém o p95" unit=" ms"
            points={technical.daily.map((day) => ({ label: formatDay(day.date), value: day.p95_ms }))} />
        </div>
        <figure className="chartCard">
          <figcaption><h3>Rotas nas últimas 24 horas</h3><p>As 15 mais chamadas</p></figcaption>
          {technical.routes_24h.length === 0
            ? <p className="emptyChart">Sem requisições registradas nas últimas 24 horas.</p>
            : <SimpleTable headers={["Rota", "Requisições", "4xx", "5xx", "Média", "p95", "Máxima"]}
                rows={technical.routes_24h.map((row) => [
                  <code key="r">{row.method} {row.route}</code>, numberFormat.format(row.requests), pct(row.error_4xx_pct),
                  pct(row.error_5xx_pct), row.avg_ms === null ? "—" : `${numberFormat.format(row.avg_ms)} ms`, ms(row.p95_ms),
                  `${numberFormat.format(row.max_ms)} ms`,
                ])} />}
        </figure>
      </section>

      <section aria-labelledby="web-title">
        <h2 id="web-title">Frontend</h2>
        <div className="statGrid compact">
          <StatTile label="Carregamentos do app" value={numberFormat.format(frontend.loads)} />
          <StatTile label="Erros no navegador" value={numberFormat.format(frontend.errors_total)}
            health={frontend.loads === 0 ? "none" : frontend.errors_total === 0 ? "good" : "bad"}
            goal="Meta: nenhum" />
        </div>
        <div className="chartGrid">
          <figure className="chartCard">
            <figcaption><h3>Versões em uso</h3><p>Sessões por commit do build</p></figcaption>
            {frontend.versions.length === 0
              ? <p className="emptyChart">Nenhum carregamento registrado.</p>
              : <SimpleTable headers={["Commit", "Sessões", "Visto por último"]}
                  rows={frontend.versions.map((row) => [
                    <code key="c">{shortCommit(row.commit)}{row.commit === webCommit ? " · atual" : ""}</code>,
                    numberFormat.format(row.sessions), dateTime(row.last_seen),
                  ])} />}
          </figure>
          <figure className="chartCard">
            <figcaption><h3>Erros mais frequentes</h3></figcaption>
            {frontend.top_errors.length === 0
              ? <p className="emptyChart">Nenhum erro registrado no período.</p>
              : <SimpleTable headers={["Mensagem", "Ocorrências", "Última"]}
                  rows={frontend.top_errors.map((row) => [row.message, numberFormat.format(row.count), dateTime(row.last_seen)])} />}
          </figure>
        </div>
      </section>
    </div>
  );
}
