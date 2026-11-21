
import Image from "next/image";

import LogoSvg from "@/icons/logo.svg";
import DefaultPerson from "@/images/default.png";
import RankingRango from "@/components/rankingRangoFecha/ui";

import type { RankingRangoFecha } from "@/types/ranking";
import type { SupervisorLeaderboard } from "@/types/supervisorRanking";
import PrimeroSvg from "@/icons/primero.svg";

import styles from "./ui.module.css";

function numeroSeguro(valor: unknown): number {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

type CampaignLogoData = {
  nombre?: string | null;
  logo_url?: string | null;
};

function CampaignLogo({
  campaign,
  className,
}: {
  campaign?: CampaignLogoData | null;
  className: string;
}) {
  const logo = campaign?.logo_url?.trim();

  return (
    <span
      className={className}
      title={campaign?.nombre ?? "Sin campaña"}
    >
      {logo ? (
        // Compatible con URLs del servidor local.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={campaign?.nombre ?? "Campaña"}
          loading="lazy"
        />
      ) : (
        <span className={styles.logoFallback}>
          {campaign?.nombre
            ? campaign.nombre.slice(0, 2).toUpperCase()
            : "—"}
        </span>
      )}
    </span>
  );
}

function CampaignLogos({
  campaigns,
  compact = false,
}: {
  campaigns: CampaignLogoData[];
  compact?: boolean;
}) {
  const visibles = compact ? campaigns.slice(0, 3) : campaigns;
  const restantes = campaigns.length - visibles.length;
  const nombres = campaigns
    .map((campaign) => campaign.nombre)
    .filter(Boolean)
    .join(", ");

  if (campaigns.length === 0) {
    return (
      <CampaignLogo
        campaign={null}
        className={
          compact
            ? styles.rankingCampaignLogo
            : styles.featuredCampaignLogo
        }
      />
    );
  }

  return (
    <span
      className={
        compact
          ? styles.rankingCampaigns
          : styles.featuredCampaigns
      }
      title={nombres}
    >
      {visibles.map((campaign, index) => (
        <CampaignLogo
          key={`${campaign.nombre ?? "campaign"}-${index}`}
          campaign={campaign}
          className={
            compact
              ? styles.rankingCampaignLogo
              : styles.featuredCampaignLogo
          }
        />
      ))}

      {restantes > 0 && (
        <span className={styles.moreCampaigns}>
          +{restantes}
        </span>
      )}
    </span>
  );
}

export default function SupervisorLeaderboardUI({
  data,
  rankingRango,
}: {
  data: SupervisorLeaderboard;
  rankingRango: RankingRangoFecha;
}) {
  const destacado = data.destacado;

  const promedioVentas = numeroSeguro(
    destacado?.promedio_ventas,
  );

  const porcentajeVentasGlobales = numeroSeguro(
    destacado?.porcentaje_ventas_globales,
  );

  const porcentajeBarra = Math.max(
    0,
    Math.min(100, porcentajeVentasGlobales),
  );

  const restantes = data.participantes
    .filter(
      (participante) =>
        participante.puesto >= 2 &&
        participante.puesto <= 10 &&
        (!destacado || participante.id !== destacado.id),
    )
    .sort((a, b) => a.puesto - b.puesto)
    .slice(0, 9);

  return (
    <main className={styles.container}>
      {/* CABECERA ORIGINAL */}
      <header className={styles.header}>
        <div className={styles.titleContent}>
          <Image
            src={LogoSvg}
            width={80}
            height={80}
            alt=""
            aria-hidden="true"
          />

          <div className={styles.title}>
            <h1>
              RANKING DE <span>SUPERVISORES</span>
            </h1>
            <p>
              Disciplina hoy, grandes resultados mañana
            </p>
          </div>
        </div>

        <div className={styles.range}>
          <RankingRango schedule={rankingRango} />
        </div>
      </header>

      {!destacado ? (
        <section className={styles.empty}>
          <strong>
            Sin ventas vinculadas a supervisores
          </strong>
          <span>
            No existen registros para el rango seleccionado.
          </span>
        </section>
      ) : (
        <section className={styles.content}>
          {/* DESTACADO — 70% */}
          <article className={styles.featured}>
            <div className={styles.featuredPosition}>
              <span className={styles.featuredLabel}>
                {destacado.genero === "F" ? " LA SUPERVISORA" : "EL SUPERVISOR"} QUE DESTACA
              </span>
              <Image
                src={PrimeroSvg}
                width={100}
                height={100}
                alt=""
                aria-hidden="true"
              />
            </div>

            <div className={styles.featuredPortrait}>
              <Image
                src={
                  destacado.avatar_url?.trim() ||
                  DefaultPerson
                }
                alt={destacado.nombre}
                fill
                unoptimized
                priority
                sizes="(max-width: 900px) 100vw, 60vw"
                className={styles.featuredImage}
              />
            </div>

            <div className={styles.featuredIdentity}>
              <div className={styles.featuredGeneral}>
                <CampaignLogos
                    campaigns={destacado.campaigns}
                  />
                <h2 title={destacado.nombre}>
                  {destacado.nombre}
                </h2>
              </div>

              <div className={styles.featuredMeta}>
                <div className={styles.featuredSedes}>
                  {destacado.sedes.length > 0 ? (
                    destacado.sedes.map((sede) => (
                      <span
                        className={styles.sedeTag}
                        key={sede.id}
                        title={`${sede.cantidad} ventas`}
                      >
                        {sede.nombre}
                      </span>
                    ))
                  ) : (
                    <span className={styles.sedeTag}>
                      Sin sede
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SCORE INFERIOR COMPACTO */}
            <section
              className={styles.featuredMetrics}
              aria-label="Indicadores del supervisor destacado"
            >
              <div
                className={`${styles.metric} ${styles.primaryMetric}`}
              >
                <span>Ventas totales</span>
                <strong>{destacado.ventas}</strong>
                <b>
                  {destacado.ventas === 1
                    ? "venta registrada"
                    : "ventas registradas"}
                </b>
              </div>

              <div className={styles.metric}>
                <span>Día con más ventas</span>
                <strong>
                  {destacado.mejor_dia?.ventas ?? 0}
                </strong>
                <b>
                  {destacado.mejor_dia
                    ? `${destacado.mejor_dia.dia} · ${destacado.mejor_dia.etiqueta}`
                    : "Sin ventas"}
                </b>
              </div>

              <div className={styles.metric}>
                <span>Promedio diario</span>
                <strong>
                  {promedioVentas.toFixed(1)}
                </strong>
                <b>ventas por día laborable</b>
              </div>

              <div className={styles.metric}>
                <span>Participación global</span>
                <strong>
                  {porcentajeVentasGlobales.toFixed(1)}
                  <small>%</small>
                </strong>
                <b>de las ventas de supervisores</b>

                <div className={styles.percentageTrack}>
                  <span
                    style={{
                      width: `${porcentajeBarra}%`,
                    }}
                  />
                </div>
              </div>
            </section>
          </article>

          {/* LISTA LATERAL — 30% */}
          <aside
            className={styles.ranking}
            aria-label="Clasificación de supervisores"
          >
            <ol className={styles.rankingList}>
              {restantes.map((participante) => (
                <li
                  key={participante.id}
                  className={styles.rankingItem}
                >
                  <span className={styles.position}>
                    {participante.puesto}
                  </span>

                  <div className={styles.avatar}>
                    <Image
                      src={
                        participante.avatar_url?.trim() ||
                        DefaultPerson
                      }
                      alt=""
                      fill
                      unoptimized
                      sizes="70px"
                    />
                  </div>

                  <div className={styles.person}>
                    <strong title={participante.nombre}>
                      {participante.nombre}
                    </strong>
                    <span>
                      {participante.ventas}{" "}
                      {participante.ventas === 1
                        ? "VENTA"
                        : "VENTAS"}
                    </span>
                  </div>

                  <CampaignLogos
                    campaigns={participante.campaigns}
                    compact
                  />
                </li>
              ))}
            </ol>
          </aside>
        </section>
      )}
    </main>
  );
}
