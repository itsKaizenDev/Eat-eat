"use client";
import {
  ArrowUpRight,
  Play,
  Trophy,
  ArrowRight,
  Keyboard,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Check,
  Users,
  Timer,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MODES, getMode, isMultiplayer } from "@/lib/modes";
import { ICONS } from "@/lib/icons";

const FILTERS = [
  ["all", "Semua mode"],
  ["classic", "Classic & santai"],
  ["mayhem", "Mayhem & tantangan"],
  ["duo", "Main berdua"],
];
const SPEEDS = [
  ["santai", "Santai"],
  ["normal", "Normal"],
  ["ngebut", "Ngebut"],
  ["konstan", "Konstan"],
];
function inCategory(item, category) {
  if (category === "all") return true;
  if (category === "classic")
    return ["classic", "classicnight", "portal", "timeattack"].includes(
      item.id,
    );
  if (category === "mayhem")
    return ["mayhem", "mayhemplus", "mayhemhard", "impossible"].includes(
      item.id,
    );
  return isMultiplayer(item.id);
}

// Keep the last decoded scene visible while the next full-size image loads.
function ModeScene({ mode }) {
  const [loaded, setLoaded] = useState(mode);
  const latestMode = useRef(mode);
  latestMode.current = mode;
  const scenes = loaded === mode ? [mode] : [loaded, mode];
  return (
    <div className="scene-stack" aria-busy={loaded !== mode}>
      {scenes.map((id) => (
        <picture
          key={id}
          className={`scene-layer ${id === loaded ? "scene-ready" : "scene-pending"}`}
        >
          <source
            media="(max-width: 760px)"
            srcSet={`/assets/game/bg-${id}-m.webp`}
          />
          <img
            className="scene"
            src={`/assets/game/bg-${id}.webp`}
            alt={id === mode ? `Ilustrasi mode ${getMode(id).name}` : ""}
            onLoad={() => {
              if (latestMode.current === id) setLoaded(id);
            }}
            fetchPriority={id === mode ? "high" : "auto"}
          />
        </picture>
      ))}
      {loaded !== mode && (
        <span className="scene-loading">Menyiapkan suasana…</span>
      )}
    </div>
  );
}

export default function Lobby({
  mode,
  onModeChange,
  onPlay,
  best,
  onHelp,
  speed,
  onSpeedChange,
  taSecs,
  onTaChange,
  isTouch,
  category,
  onCategoryChange,
}) {
  const selected = getMode(mode);
  const visibleModes = MODES.filter((item) => inCategory(item, category));
  const currentIndex = visibleModes.findIndex((item) => item.id === mode);
  const isDuo = isMultiplayer(mode);
  const unavailable = isTouch && isDuo;
  const effectiveSpeed = mode === "impossible" ? "ngebut" : speed;
  const previewRef = useRef(null);
  const selectedCardRef = useRef(null);
  const previousMode = useRef(mode);
  const [hasChanged, setHasChanged] = useState(false);
  const SelectedIcon = ICONS[mode];

  useEffect(() => {
    if (previousMode.current !== mode) {
      setHasChanged(true);
      previousMode.current = mode;
    }
  }, [mode]);

  function selectCategory(next) {
    onCategoryChange(next);
    const filtered = MODES.filter((item) => inCategory(item, next));
    if (!filtered.some((item) => item.id === mode))
      onModeChange(filtered[0].id);
  }
  function cycle(direction) {
    onModeChange(
      visibleModes[
        (Math.max(0, currentIndex) + direction + visibleModes.length) %
          visibleModes.length
      ].id,
    );
  }
  function randomMode() {
    const choices = visibleModes.filter(
      (item) => item.id !== mode && !(isTouch && isMultiplayer(item.id)),
    );
    if (choices.length)
      onModeChange(choices[Math.floor(Math.random() * choices.length)].id);
  }
  function focusPreview() {
    previewRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    previewRef.current?.focus({ preventScroll: true });
  }
  function browseKeyboard(event, index) {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % visibleModes.length;
    if (event.key === "ArrowLeft")
      next = (index - 1 + visibleModes.length) % visibleModes.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = visibleModes.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    const buttons =
      event.currentTarget.parentElement.querySelectorAll(".mode-card");
    onModeChange(visibleModes[next].id);
    buttons[next]?.focus({ preventScroll: true });
  }
  return (
    <main
      className="lobby lobby-refined"
      style={{ "--accent": selected.color, "--tint": selected.tint }}
    >
      <div className="intro">
        <div>
          <p className="eyebrow">
            <span /> LITTLE GAME, BIG FUN
          </p>
          <h1>
            Satu gigitan lagi<span>.</span>
          </h1>
          <p>Sepuluh petualangan kecil. Pilih yang paling kamu banget.</p>
        </div>
        <div className="record" aria-label={`Rekor lokal ${best} poin`}>
          <Trophy size={22} />
          <div>
            <span>REKOR LOKAL</span>
            <strong>
              {String(best).padStart(2, "0")} <small>poin</small>
            </strong>
          </div>
        </div>
      </div>

      <section
        className="featured"
        aria-label="Mode pilihan"
        ref={previewRef}
        tabIndex={-1}
      >
        <div className="feature-copy">
          <div className="feature-kicker">
            <span className="pill">
              <Sparkles size={13} />
              {selected.tag}
            </span>
            <span className="mode-index">
              {String(MODES.findIndex((item) => item.id === mode) + 1).padStart(
                2,
                "0",
              )}{" "}
              / 10
            </span>
          </div>
          <div key={mode} className="feature-story">
            <h2>
              {selected.name}
              <span> mode.</span>
            </h2>
            <p>{selected.description}</p>
          </div>
          <div className="feature-meta">
            <span>
              <Users size={13} />
              {selected.detail}
            </span>
            <span>{selected.rule}</span>
            <span>{selected.level}</span>
          </div>
          <div className="game-options">
            <fieldset>
              <legend>
                <SlidersHorizontal size={12} /> Kecepatan{" "}
                {mode === "impossible" && (
                  <span className="locked-label">TERKUNCI</span>
                )}
              </legend>
              <div className="option-chips">
                {SPEEDS.map(([id, label]) => (
                  <button
                    key={id}
                    disabled={mode === "impossible"}
                    aria-pressed={effectiveSpeed === id}
                    onClick={() => onSpeedChange(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            {mode === "timeattack" && (
              <fieldset>
                <legend>
                  <Timer size={12} /> Durasi ronde
                </legend>
                <div className="option-chips">
                  {[30, 60, 90, 120].map((value) => (
                    <button
                      key={value}
                      aria-pressed={taSecs === value}
                      onClick={() => onTaChange(value)}
                    >
                      {value} <span>detik</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
          <div className="feature-actions">
            <button
              className="play-button"
              onClick={onPlay}
              disabled={unavailable}
            >
              <Play size={18} fill="currentColor" /> Main sekarang{" "}
              <ArrowRight size={19} />
            </button>
            <button className="text-button" onClick={onHelp}>
              Cara main <ArrowUpRight size={15} />
            </button>
          </div>
          <p className="feature-footnote">
            {unavailable
              ? "Mode berdua membutuhkan keyboard. Pilih mode solo untuk main di HP."
              : mode === "impossible"
                ? "Kecepatan Ngebut terkunci. Siapkan refleksmu."
                : isDuo
                  ? "P1 pakai panah · P2 pakai WASD · Satu keyboard"
                  : "Panah / WASD di desktop · Swipe / joystick di HP"}
          </p>
        </div>
        <div className={`feature-art art-${mode}`}>
          <ModeScene mode={mode} />
          <div className="scene-bottom">
            <span className="scene-badge">
              <SelectedIcon size={15} />
              {selected.name}
            </span>
            <div className="scene-nav">
              <button aria-label="Mode sebelumnya" onClick={() => cycle(-1)}>
                <ChevronLeft size={20} />
              </button>
              <span>
                {currentIndex + 1}
                <i>/{visibleModes.length}</i>
              </span>
              <button aria-label="Mode berikutnya" onClick={() => cycle(1)}>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="section-title">
        <div>
          <p className="eyebrow">FIND YOUR NEXT FAVORITE</p>
          <h2>
            Pilih cara mainmu{" "}
            <span>{String(visibleModes.length).padStart(2, "0")} MODE</span>
          </h2>
        </div>
        <button
          className="random-button"
          onClick={randomMode}
          disabled={
            !visibleModes.some(
              (item) =>
                item.id !== mode && !(isTouch && isMultiplayer(item.id)),
            )
          }
        >
          <Shuffle size={15} /> Pilihkan aku
        </button>
      </div>
      <div className="filter-row">
        <div className="mode-filters" role="group" aria-label="Kategori mode">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              aria-pressed={category === id}
              onClick={() => selectCategory(id)}
            >
              {label}
              <span>{MODES.filter((item) => inCategory(item, id)).length}</span>
            </button>
          ))}
        </div>
        <span className="browse-hint">Klik kartu untuk ganti suasana</span>
      </div>
      <section className="mode-grid" aria-label="Pilih mode permainan">
        {visibleModes.map((item, index) => {
          const Icon = ICONS[item.id];
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              ref={active ? selectedCardRef : undefined}
              aria-pressed={active}
              className={`mode-card ${active ? "selected" : ""}`}
              onClick={() => onModeChange(item.id)}
              onKeyDown={(event) => browseKeyboard(event, index)}
              style={{ "--accent": item.color, "--tint": item.tint }}
            >
              <div className="card-art">
                <img
                  className="card-scene"
                  src={`/assets/game/bg-${item.id}-m.webp`}
                  alt=""
                  loading="lazy"
                />
                <span className="card-number">
                  {String(MODES.indexOf(item) + 1).padStart(2, "0")}
                </span>
                <span className="selection-badge">
                  {active ? (
                    <>
                      <Check size={11} />
                      Dipilih
                    </>
                  ) : (
                    item.level
                  )}
                </span>
              </div>
              <div className="card-copy">
                <h3>
                  <Icon size={16} />
                  {item.name}
                  <ArrowUpRight className="card-arrow" size={14} />
                </h3>
                <p>
                  {isTouch && isMultiplayer(item.id)
                    ? "Keyboard · 2 pemain"
                    : item.short}
                </p>
              </div>
            </button>
          );
        })}
      </section>
      <p className="sr-only" role="status">
        {hasChanged ? `${selected.name} dipilih. ${selected.short}` : ""}
      </p>
      <div className="lobby-footer">
        <span>
          <Keyboard size={17} /> Panah / WASD untuk bergerak <i /> Main
          sebentar, senyum lebih lama.
        </span>
        <span>Sudah siap untuk satu ronde lagi?</span>
      </div>
      <div className="mobile-play-dock">
        <button
          className="dock-selection"
          onClick={focusPreview}
          aria-label={`Lihat pengaturan ${selected.name}`}
        >
          <span className="dock-icon">
            <SelectedIcon size={19} />
          </span>
          <span>
            <small>MODE PILIHAN</small>
            <strong>{selected.name}</strong>
            <em>
              {unavailable
                ? "Butuh keyboard"
                : `${SPEEDS.find(([id]) => id === effectiveSpeed)?.[1]}${mode === "timeattack" ? ` · ${taSecs} detik` : ""}`}
            </em>
          </span>
          <ChevronRight size={15} />
        </button>
        <button
          className="play-button"
          onClick={onPlay}
          disabled={unavailable}
          aria-label={`Main ${selected.name}`}
        >
          <Play size={16} fill="currentColor" /> Main
        </button>
      </div>
    </main>
  );
}
