"use client";

import { AgenteRanking } from "@/types/ranking";
import styles from "./ui.module.css";
import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

export default function InfoBar({
  agentes,
  intervalo = 10_000,
}: {
  agentes: AgenteRanking[];
  intervalo?: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex((previousIndex) => {
      if (agentes.length === 0) {
        return 0;
      }

      return previousIndex < agentes.length
        ? previousIndex
        : 0;
    });
  }, [agentes.length]);

  useEffect(() => {
    if (agentes.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentIndex((previousIndex) => {
        return (previousIndex + 1) % agentes.length;
      });
    }, intervalo);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [agentes.length, intervalo]);

  const currentAgent = useMemo(() => {
    return agentes[currentIndex] ?? null;
  }, [agentes, currentIndex]);

  if (!currentAgent) {
    return (
      <div className={styles.emptyState}>
        Sistema en fase de beta o prueba, realizado por el equipo de TI de Monacorp
      </div>
    );
  }

  const salesText =
    currentAgent.tramitadas === 1
      ? "1 VENTA"
      : `${currentAgent.tramitadas} VENTAS`;

  const variante = currentAgent.variante
    .trim()
    .toUpperCase();

  const positionColor =
  currentAgent.puesto === 1
    ? "#fbbf24"
    : currentAgent.puesto === 2
      ? "#cbd5e1"
      : currentAgent.puesto === 3
        ? "#cd7f32"
        : "#ef4444";

  return (
    <article 
      className={styles.agentCard}
      style={{
        border: "2px solid transparent",
        background: `
          linear-gradient(#101010, #101010) padding-box,
          linear-gradient(
            90deg,
            ${currentAgent.campania.hex},
            ${positionColor}
          ) border-box
        `,
      }}
    >
      <AnimatedField
        animationKey={`campaign-${currentAgent.campania.id}`}
        className={styles.logoField}
      >
        <CampaignLogo
          campaign={currentAgent.campania}
        />
      </AnimatedField>

      <AnimatedField
        animationKey={`site-${currentAgent.sede.id}`}
        className={styles.badgeField}
      >
        <span className={styles.dataBadge}>
          {currentAgent.sede.nombre}
        </span>
      </AnimatedField>

      <AnimatedField
        animationKey={`variant-${variante}`}
        className={styles.badgeField}
      >
        <span
          className={styles.variantBadge}
          data-variant={variante}
        >
          {variante}
        </span>
      </AnimatedField>

      <AnimatedField
        animationKey={`sales-${currentAgent.tramitadas}-${currentAgent.puesto}`}
        className={styles.badgeField}
      >
        <span
          className={styles.salesBadge}
          data-position={currentAgent.puesto}
        >
          {salesText}
        </span>
      </AnimatedField>

      <AnimatedField
        animationKey={`agent-${currentAgent.colaborador_id}`}
        className={styles.nameField}
      >
        <h1 className={styles.agentName}>
          {currentAgent.nombre}
        </h1>
      </AnimatedField>

      <h2 className={styles.agentLabel}>
        ASESOR
      </h2>

      <AnimatedField
        animationKey={`position-${currentAgent.puesto}`}
        className={styles.badgeField}
      >
        <span
          className={styles.positionBadge}
          data-position={currentAgent.puesto}
        >
          #{currentAgent.puesto}
        </span>
      </AnimatedField>
    </article>
  );
}

function AnimatedField({
  animationKey,
  children,
  className = "",
}: {
  animationKey: string | number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`${styles.fieldViewport} ${className}`}
    >
      <div
        key={animationKey}
        className={styles.fieldContent}
      >
        {children}
      </div>
    </div>
  );
}

function CampaignLogo({
  campaign,
}: {
  campaign: AgenteRanking["campania"];
}) {
  if (campaign.logoUrl) {
    return (
      <div className={styles.campaignLogo}>
        <img
          src={campaign.logoUrl}
          alt={campaign.nombre}
        />
      </div>
    );
  }

  return (
    <div
      className={styles.campaignLogoFallback}
      title={campaign.nombre}
    >
      <span>
        {campaign.nombre
          .charAt(0)
          .toUpperCase()}
      </span>
    </div>
  );
}