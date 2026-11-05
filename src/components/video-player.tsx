"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

/** Допуск для перемотування вперед (секунди) — щоб не «смикало» через неточність timeupdate. */
export const SEEK_SLACK = 2;
const SPEEDS = [0.75, 1, 1.25, 1.5];
const HIDE_AFTER_MS = 2500;

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};

/* Іконки плеєра (заливка — колір тексту) */
const I = {
  play: <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />,
  pause: (
    <>
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </>
  ),
  replay: <path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />,
  back: <path d="M11 7V4L5 9l6 5v-3c3.3 0 6 1.7 7 5 0-4.4-3.1-8.2-7-9z" transform="translate(0 2)" />,
  fwd: <path d="M13 7V4l6 5-6 5v-3c-3.3 0-6 1.7-7 5 0-4.4 3.1-8.2 7-9z" transform="translate(0 2)" />,
  vol: <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4zm11.5 2.5A4 4 0 0 0 13.5 8.5v7a4 4 0 0 0 2-3.5zM13.5 4v2.1a6.5 6.5 0 0 1 0 11.8V20a8.5 8.5 0 0 0 0-16z" />,
  mute: <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4zm16.4-.9-1.4-1.4-2.5 2.5-2.5-2.5-1.4 1.4 2.5 2.5-2.5 2.5 1.4 1.4 2.5-2.5 2.5 2.5 1.4-1.4-2.5-2.5z" />,
  full: <path d="M4 9V4h5v2H6v3H4zm10-5h6v5h-2V6h-4V4zM4 15h2v3h3v2H4v-5zm14 3v-3h2v5h-5v-2h3z" />,
  exit: <path d="M7 4h2v5H4V7h3V4zm8 0h2v3h3v2h-5V4zM4 15h5v5H7v-3H4v-2zm11 0h5v2h-3v3h-2v-5z" />,
};
const Icon = ({ d, size = 22 }: { d: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    {d}
  </svg>
);

/**
 * Власний відеоплеєр уроку у стилі сайту.
 * limitSeek — урок ще не пройдено: далі за переглянуте перемотати не можна (непереглянута частина
 * шкали заштрихована). onWatched отримує, яку частку відео переглянуто «чесно» (0…1).
 * Клавіші, коли плеєр у фокусі: Пробіл/K — пауза, ←/→ — 5 с, J/L — 10 с, ↑/↓ — гучність, M — звук, F — на весь екран.
 */
export function VideoPlayer({
  src,
  poster,
  title,
  limitSeek = false,
  onWatched,
  onEnded,
}: {
  src: string;
  poster?: string;
  title?: string;
  limitSeek?: boolean;
  onWatched?: (ratio: number) => void;
  onEnded?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dragging = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [maxWatched, setMaxWatched] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [speedMenu, setSpeedMenu] = useState(false);
  const [full, setFull] = useState(false);
  const [controls, setControls] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const maxRef = useRef(0);

  const limit = limitSeek ? maxWatched + SEEK_SLACK : Infinity;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 1800);
  }, []);

  /** Показати панель і сховати через кілька секунд, якщо відео грає. */
  const poke = useCallback(() => {
    setControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (video.current && !video.current.paused && !dragging.current) {
        setControls(false);
        setSpeedMenu(false);
      }
    }, HIDE_AFTER_MS);
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function seek(to: number) {
    const v = video.current;
    if (!v || !duration) return;
    let target = Math.max(0, Math.min(duration, to));
    if (target > limit) {
      target = maxRef.current;
      flash("Спочатку подивись до цього місця 🙂");
    }
    v.currentTime = target;
    setTime(target);
    setEnded(false);
  }

  function toggle() {
    const v = video.current;
    if (!v) return;
    if (v.paused || v.ended) {
      if (v.ended) v.currentTime = 0;
      void v.play();
    } else v.pause();
    poke();
  }

  function setVol(next: number) {
    const v = video.current;
    if (!v) return;
    const vol = Math.max(0, Math.min(1, next));
    v.volume = vol;
    v.muted = vol === 0;
    setVolume(vol);
    setMuted(vol === 0);
  }

  function toggleMute() {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) v.volume = 0.6;
    setMuted(v.muted);
    setVolume(v.volume);
  }

  async function toggleFull() {
    const el = box.current;
    const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (el.requestFullscreen) await el.requestFullscreen().catch(() => {});
    else v?.webkitEnterFullscreen?.(); // iPhone: лише системний повноекранний режим
  }

  function ratioAt(clientX: number) {
    const r = bar.current?.getBoundingClientRect();
    if (!r || !r.width) return 0;
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  }

  function onBarDown(e: ReactPointerEvent<HTMLDivElement>) {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seek(ratioAt(e.clientX) * duration);
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const tag = (e.target as HTMLElement).tagName;
    const onButton = tag === "BUTTON";
    const keys: Record<string, () => void> = {
      " ": toggle,
      k: toggle,
      ArrowLeft: () => seek(time - 5),
      ArrowRight: () => seek(time + 5),
      j: () => seek(time - 10),
      l: () => seek(time + 10),
      ArrowUp: () => setVol(volume + 0.1),
      ArrowDown: () => setVol(volume - 0.1),
      m: toggleMute,
      f: () => void toggleFull(),
    };
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    // На кнопках Пробіл/Enter натискають саму кнопку
    if (onButton && (k === " " || k === "Enter")) return;
    if (keys[k] && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      keys[k]();
      poke();
    }
  }

  const pct = (s: number) => (duration ? `${Math.min(100, (s / duration) * 100)}%` : "0%");
  const showUi = controls || !playing;

  return (
    <div
      ref={box}
      tabIndex={0}
      role="region"
      aria-label={title ? `Відеоплеєр: ${title}` : "Відеоплеєр"}
      onKeyDown={onKey}
      onPointerMove={poke}
      onPointerLeave={() => playing && setControls(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`group/player relative h-full w-full overflow-hidden bg-[#0d0b1f] select-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent ${full ? "rounded-none" : ""} ${showUi ? "" : "cursor-none"}`}
    >
      <video
        ref={video}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        className="h-full w-full object-contain"
        onClick={toggle}
        onDoubleClick={() => void toggleFull()}
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
          setEnded(false);
          poke();
        }}
        onPause={() => {
          setPlaying(false);
          setControls(true);
        }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onProgress={(e) => {
          const v = e.currentTarget;
          if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setTime(v.currentTime);
          // «Чесний» перегляд: стрибок далі за переглянуте не зараховується
          if (v.currentTime <= maxRef.current + SEEK_SLACK && v.currentTime > maxRef.current) {
            maxRef.current = v.currentTime;
            setMaxWatched(v.currentTime);
            if (v.duration) onWatched?.(maxRef.current / v.duration);
          }
        }}
        onSeeking={(e) => {
          // Захист і від системних способів перемотки (медіаклавіші, жести)
          const v = e.currentTarget;
          if (limitSeek && v.currentTime > maxRef.current + SEEK_SLACK) v.currentTime = maxRef.current;
        }}
        onEnded={() => {
          setEnded(true);
          setPlaying(false);
          setControls(true);
          onEnded?.();
        }}
      />

      {/* Велика кнопка по центру: старт, пауза, повтор */}
      {(!playing || ended) && !waiting && (
        <button
          type="button"
          onClick={toggle}
          aria-label={ended ? "Переглянути ще раз" : started ? "Продовжити" : "Відтворити відео"}
          className="absolute top-1/2 left-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white shadow-[0_10px_40px_rgb(109_74_255/0.55)] backdrop-blur-md transition hover:scale-105 hover:bg-white/25"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand pl-0.5">
            <Icon d={ended ? I.replay : I.play} size={26} />
          </span>
        </button>
      )}

      {/* Завантаження */}
      {waiting && (
        <span className="pointer-events-none absolute top-1/2 left-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-4 border-white/25 border-t-white" aria-hidden />
      )}

      {/* Підказка (напр. «спочатку подивись») */}
      {toast && (
        <span role="status" className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
          {toast}
        </span>
      )}

      {/* Нижня панель */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-10 pb-2.5 text-white transition-opacity duration-300 sm:px-4 ${
          showUi ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Шкала: буфер, дозволена зона, переглянуте, повзунок */}
        <div
          ref={bar}
          role="slider"
          tabIndex={0}
          aria-label="Перемотування"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${fmt(time)} з ${fmt(duration)}`}
          onPointerDown={onBarDown}
          onPointerMove={(e) => {
            setHover(ratioAt(e.clientX));
            if (dragging.current) seek(ratioAt(e.clientX) * duration);
          }}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => setHover(null)}
          className="group/bar relative flex h-5 cursor-pointer items-center focus-visible:outline-none"
        >
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/20 transition-[height] group-hover/bar:h-2 group-focus-visible/bar:h-2">
            <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: pct(buffered) }} />
            {limitSeek && (
              // Непереглянута частина — штрихування: сюди поки не можна
              <div
                className="absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.18)_0_4px,transparent_4px_8px)]"
                style={{ left: pct(maxWatched) }}
              />
            )}
            <div className="absolute inset-y-0 left-0 rounded-full bg-iris" style={{ width: pct(time) }} />
          </div>
          <span
            className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-white shadow-[0_0_0_4px_rgb(109_74_255/0.45)] transition-transform group-hover/bar:scale-100 group-focus-visible/bar:scale-100"
            style={{ left: pct(time) }}
            aria-hidden
          />
          {hover !== null && duration > 0 && (
            <span
              className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded-md bg-black/80 px-2 py-1 font-mono text-xs"
              style={{ left: `${hover * 100}%` }}
              aria-hidden
            >
              {limitSeek && hover * duration > limit ? "🔒 " : ""}
              {fmt(hover * duration)}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-1 sm:gap-2">
          <Btn label={playing ? "Пауза" : "Відтворити"} onClick={toggle}>
            <Icon d={playing ? I.pause : ended ? I.replay : I.play} />
          </Btn>
          <Btn label="Назад на 10 секунд" onClick={() => seek(time - 10)}>
            <Icon d={I.back} size={20} />
          </Btn>
          <Btn label="Вперед на 10 секунд" onClick={() => seek(time + 10)} disabled={limitSeek && time + 1 >= limit}>
            <Icon d={I.fwd} size={20} />
          </Btn>

          {/* Гучність */}
          <div className="group/vol flex items-center">
            <Btn label={muted ? "Увімкнути звук" : "Вимкнути звук"} onClick={toggleMute}>
              <Icon d={muted || volume === 0 ? I.mute : I.vol} size={20} />
            </Btn>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => setVol(Number(e.target.value))}
              aria-label="Гучність"
              className="player-range hidden w-0 opacity-0 transition-all duration-200 group-focus-within/vol:w-20 group-focus-within/vol:opacity-100 group-hover/vol:w-20 group-hover/vol:opacity-100 sm:block"
              style={{ "--fill": `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
            />
          </div>

          <span className="ml-1 font-mono text-xs text-white/90 tabular-nums sm:text-sm">
            {fmt(time)} <span className="text-white/50">/ {fmt(duration)}</span>
          </span>

          <span className="flex-1" />

          {/* Швидкість */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSpeedMenu((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={speedMenu}
              aria-label={`Швидкість: ${rate}×`}
              className="h-9 rounded-lg px-2 font-mono text-sm font-semibold text-white/90 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            >
              {rate}×
            </button>
            {speedMenu && (
              <div role="menu" className="absolute right-0 bottom-11 flex flex-col gap-0.5 rounded-2xl border border-white/15 bg-[#17142e]/90 p-1.5 shadow-xl backdrop-blur-md">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="menuitemradio"
                    aria-checked={s === rate}
                    onClick={() => {
                      if (video.current) video.current.playbackRate = s;
                      setRate(s);
                      setSpeedMenu(false);
                    }}
                    className={`rounded-xl px-4 py-1.5 text-left font-mono text-sm ${s === rate ? "bg-brand font-bold" : "hover:bg-white/10"}`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            )}
          </div>

          <Btn label={full ? "Вийти з повноекранного режиму" : "На весь екран"} onClick={() => void toggleFull()}>
            <Icon d={full ? I.exit : I.full} size={20} />
          </Btn>
        </div>
      </div>
    </div>
  );
}

function Btn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-white disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
