import { detectMediaKind } from "@/libs/mediaKind";
import { socket } from "@/libs/socket";
import { Caption, FullCampaign, Stat } from "@/types/Campaign";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import styles from "./ui.module.css";
import Time from "../time/ui";
import SedeIcon from "@/icons/sede";
import TeamIcon from "@/icons/team";
import HeadsetIcon from "@/icons/headset";
import UsuarionuevoIcon from "@/icons/usuarionuevo";
import AltaIcon from "@/icons/alta";

const FADE_MS = 500;
const DEFAULT_IMAGE_DURATION = 5000;
const VIDEO_START_TIMEOUT = 3000;

type Layer = "a" | "b";
type PlayerMedia = FullCampaign["medias"][number];

const oppositeLayer = (layer: Layer): Layer => {
  return layer === "a" ? "b" : "a";
};

export default function Player({campaign} : { campaign: FullCampaign | null }) {

  const playerRef = useRef<HTMLDivElement>(null);
  const [ campaignState, setCampaignState ] = useState<FullCampaign | null>(campaign);

  const initialMedia = campaign?.medias ?? [];

  const [ index, setIndex ] = useState(0);
  const [ active, setActive ] = useState<Layer>("a");

  const [ layerMedia, setLayerMedia ] = useState<Record<Layer, PlayerMedia | null>>({
    a: initialMedia[0] ?? null,
    b: initialMedia[1] ?? null
  });

  const videoA = useRef<HTMLVideoElement>(null);
  const videoB = useRef<HTMLVideoElement>(null);

  const activeRef = useRef<Layer>("a");
  const indexRef = useRef(0);
  const mediasRef = useRef<PlayerMedia[]>([]);
  const transitioningRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);

  const medias = campaignState?.medias ?? [];

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    mediasRef.current = medias;
  }, [medias]);

  const activeMedia = layerMedia[active];
  const activeKind = activeMedia ? detectMediaKind(activeMedia.url, activeMedia.mimetype) : null;

  const advance = () => {
    const list = mediasRef.current;

    if (list.length <= 1) return;
    if (transitioningRef.current) return;

    transitioningRef.current = true;

    const from = activeRef.current;
    const to = oppositeLayer(from);

    const currentIndex = indexRef.current;
    const nextIndex = (currentIndex + 1) % list.length;
    const preloadIndex = (nextIndex + 1) % list.length;

    setLayerMedia(prev => ({
      ...prev,
      [to]: list[nextIndex] ?? null,
    }));

    setActive(to);

    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }

    transitionTimerRef.current = window.setTimeout(() => {
      setIndex(nextIndex);
      indexRef.current = nextIndex;

      setLayerMedia(prev => ({
        ...prev,
        [from]: list[preloadIndex] ?? null,
      }));

      transitioningRef.current = false;
    }, FADE_MS);
  }

  const playlistKey = useMemo(() => {
    return medias
      .map(media => `${media.id}-${media.url}-${media.mimetype}-${media.duration ?? "null"}`)
      .join("|");
  }, [medias]);

  useEffect(() => {
    if (!medias.length) return;

    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }

    transitioningRef.current = false;

    setIndex(0);
    indexRef.current = 0;

    setActive("a");
    activeRef.current = "a";

    if (!medias.length) {
      setLayerMedia({
        a: null,
        b: null
      })

      return;
    }

    setLayerMedia({
      a: medias[0] ?? null,
      b: medias[1] ?? null
    });
  }, [playlistKey]);

  useEffect(() => {
    if (!campaign) return;

    setCampaignState(campaign);
    setIndex(0);
    setActive("a");

  }, [campaign]);

  useEffect(() => {
    if (!campaignState) return;

    const payload = {
      campaignId: campaignState.id
    };

    const handleConnect = () => {
      socket.emit("join-campaign", payload);
    }

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);

    return () => {
      socket.emit("leave-campaign", payload);
      socket.off("connect", handleConnect);
    };

  }, [campaignState?.id]);  

  useEffect(() => {

    const handler = (data: FullCampaign) => {
      setCampaignState(data);
    }

    socket.on("campaign:sync", handler);

    return () => {
      socket.off("campaign:sync", handler);
    }
  }, [])

  useEffect(() => {
    if (!activeMedia) return;

    if (activeKind !== "image") return;

    const duration = Number(activeMedia.duration) || DEFAULT_IMAGE_DURATION;

    const timer = window.setTimeout(() => {
      advance();
    }, duration);

    return () => window.clearTimeout(timer);
  }, [activeMedia?.url, activeKind]);

  useEffect(() => {
    if (!activeMedia) return;
    if (activeKind !== "video") return;

    const video = active === "a" ? videoA.current : videoB.current;

    if (!video) return;

    let cancelled = false;
    let startTimer: number | null = null;

    const clearStartTimer = () => {
      if (startTimer) {
        window.clearTimeout(startTimer);
        startTimer = null;
      }
    };

    const goNextIfBroken = () => {
      if (cancelled) return;

      clearStartTimer();
      advance();
    }

    const playVideo = async () => {
      try {
        video.currentTime = 0;
        await video.play();
      } catch {
        goNextIfBroken();
      }
    }

    const handlePlaying = () => {
      clearStartTimer();
    };

    const handleError = () => {
      goNextIfBroken();
    }

    video.addEventListener("playing", handlePlaying);
    video.addEventListener("error", handleError);

    startTimer = window.setTimeout(() => {
      if (!cancelled && video.paused) {
        advance();
      }
    }, VIDEO_START_TIMEOUT);

    if (video.readyState >= 2) {
      playVideo();
    } else {
      video.addEventListener("canplay", playVideo, { once: true });
      video.load();
    }

    return () => {
      cancelled = true;

      clearStartTimer();

      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("error", handleError);
      video.removeEventListener("canplay", playVideo);
    };
  }, [active, activeMedia?.url, activeKind]);

  const renderMedia = (
    media: PlayerMedia | null,
    layer: Layer
  ) => {
    if (!media) return null;

    const kind = detectMediaKind(media.url, media.mimetype);
    const videoRef = layer === "a" ? videoA : videoB;
    const isActiveLayer = active === layer;

    if (kind === "video") {
      return (
        <video
          key={media.url}
          ref={videoRef}
          src={media.url}
          className={styles.media}
          muted
          playsInline
          preload="auto"
          onEnded={isActiveLayer ? advance : undefined}
          onError={isActiveLayer ? advance : undefined}
        />
      )
    }

    return (
      <img
        key={media.url}
        src={media.url}
        className={styles.media}
        alt=""
        draggable={false}
      />
    )
  }


  const enterFullscreen = () => {
    const el = playerRef.current;

    if (!el) return;

    if (el.requestFullscreen) el.requestFullscreen();
  }

  const exitFullscreen = () => {
    if (document.exitFullscreen) document.exitFullscreen();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      enterFullscreen();
    } else {
      exitFullscreen();
    }
  };

  useEffect(() => {
    const handleClick = () => {
      enterFullscreen();
      window.removeEventListener("click", handleClick);
    }

    window.addEventListener("click", handleClick);

    return () => window.removeEventListener("click", handleClick);
  }, []);

  if (!campaignState) {
      return <div className={styles.idle}>Selecciona una campaña</div>;
  }

  return (
    <div  ref={playerRef} className={styles.player} onDoubleClick={toggleFullscreen}>
      <div className={styles.clock}>
        <Time timeZone="America/Lima"/>
        <Time timeZone="Europe/Madrid"/>
      </div>
      <div className={styles.stage}>
        {!medias.length ? (
          <div className={styles.idle}>Sin contenido</div>
        ) : (
          <>
            <div className={`${styles.layer} ${active === "a" ? styles.active : styles.hidden}`}>
              {renderMedia(layerMedia.a, "a")}
            </div>

            <div className={`${styles.layer} ${active === "b" ? styles.active : styles.hidden}`}>
              {renderMedia(layerMedia.b, "b")}
            </div>
          </>
        )}
      </div>
    
    </div>
  );
}