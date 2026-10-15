"use client";

import { useState, useRef, useCallback } from "react";
import {
  LayoutGrid,
  Folder,
  Timer,
  Users,
  BarChart3,
  CalendarDays,
  Sparkles,
  Wind,
  RotateCcw,
} from "lucide-react";
import { siteConfig, ServiceIconKey } from "@/src/content/site";

const ICON_MAP: Record<ServiceIconKey, React.ComponentType<{ className?: string }>> = {
  kanban: LayoutGrid,
  folder: Folder,
  timer: Timer,
  users: Users,
  chart: BarChart3,
  calendar: CalendarDays,
  bot: LayoutGrid,
  message: LayoutGrid,
};

interface FallingLeaf {
  id: number;
  left: number;
  delay: number;
}

interface FlyingCard {
  index: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  phase: "launching" | "flying" | "landing";
}

export function NatureFeatureTree() {
  const services = siteConfig.services.slice(0, 6);
  const leftServices = services.slice(0, 3);
  const rightServices = services.slice(3, 6);

  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [flyingCard, setFlyingCard] = useState<FlyingCard | null>(null);
  const [treeBounce, setTreeBounce] = useState(false);
  const [fallingLeaves, setFallingLeaves] = useState<FallingLeaf[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);

  const launchFeature = useCallback(
    (targetIndex: number) => {
      if (flyingCard !== null) return;
      if (revealedIndices.includes(targetIndex)) return;

      setTreeBounce(true);
      setTimeout(() => setTreeBounce(false), 500);

      const newLeaves = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        left: 25 + Math.random() * 50,
        delay: Math.random() * 0.3,
      }));
      setFallingLeaves((prev) => [...prev.slice(-5), ...newLeaves]);

      const container = containerRef.current;
      const tree = treeRef.current;
      const slot = slotRefs.current[targetIndex];

      if (!container || !tree) return;

      const containerRect = container.getBoundingClientRect();
      const treeRect = tree.getBoundingClientRect();

      const startX = treeRect.left - containerRect.left + treeRect.width / 2;
      const startY = treeRect.top - containerRect.top + treeRect.height * 0.35;

      let endX = startX;
      let endY = startY + 200;
      let slotWidth = 280;

      if (slot) {
        const slotRect = slot.getBoundingClientRect();
        endX = slotRect.left - containerRect.left + slotRect.width / 2;
        endY = slotRect.top - containerRect.top + slotRect.height / 2;
        slotWidth = slotRect.width;
      }

      setFlyingCard({
        index: targetIndex, startX, startY, endX, endY, width: slotWidth, phase: "launching",
      });

      setTimeout(() => {
        setFlyingCard((prev) => (prev ? { ...prev, phase: "flying" } : null));
      }, 80);

      setTimeout(() => {
        setFlyingCard((prev) => (prev ? { ...prev, phase: "landing" } : null));
      }, 1200);

      setTimeout(() => {
        setRevealedIndices((prev) =>
          prev.includes(targetIndex) ? prev : [...prev, targetIndex]
        );
        setFlyingCard(null);
      }, 1500);
    },
    [flyingCard, revealedIndices]
  );

  const handleTreeClick = () => {
    const nextIdx = services.findIndex((_, idx) => !revealedIndices.includes(idx));
    if (nextIdx !== -1) launchFeature(nextIdx);
  };

  const handleRevealAll = () => {
    setRevealedIndices([0, 1, 2, 3, 4, 5]);
    setFlyingCard(null);
  };

  const handleReset = () => {
    setRevealedIndices([]);
    setFlyingCard(null);
  };

  const getFlyingCardStyle = (): React.CSSProperties => {
    if (!flyingCard) return {};
    const { startX, startY, endX, endY, width, phase } = flyingCard;

    if (phase === "launching") {
      return {
        position: "absolute", left: startX, top: startY, width: 60,
        transform: "translate(-50%, -50%) scale(0.12) rotateZ(-30deg) rotateX(50deg)",
        opacity: 0.4, transition: "none", zIndex: 100,
      };
    }
    if (phase === "flying") {
      return {
        position: "absolute", left: endX, top: endY, width: Math.min(width - 8, 300),
        transform: "translate(-50%, -50%) scale(1) rotateZ(0deg) rotateX(0deg)",
        opacity: 1, transition: "all 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)", zIndex: 100,
      };
    }
    return {
      position: "absolute", left: endX, top: endY, width: Math.min(width - 8, 300),
      transform: "translate(-50%, -50%) scale(1.04)",
      opacity: 0, transition: "all 0.3s ease-out", zIndex: 100,
    };
  };

  const remaining = services.length - revealedIndices.length;

  const renderCardSlot = (service: typeof services[0], idx: number) => {
    const Icon = ICON_MAP[service.icon] || LayoutGrid;
    const isRevealed = revealedIndices.includes(idx);
    const isTarget = flyingCard?.index === idx;

    return (
      <div
        key={service.slug}
        ref={(el) => { slotRefs.current[idx] = el; }}
        className={`relative rounded-xl border transition-all duration-500 overflow-hidden ${
          isRevealed
            ? "bg-card border-border/70 shadow-sm"
            : "bg-muted/15 border-dashed border-border/50"
        } ${isTarget ? "ring-2 ring-emerald-500/50 bg-emerald-500/5 border-emerald-500/40" : ""}`}
      >
        {isRevealed ? (
          <div className="px-3.5 py-3 space-y-1.5 card-just-landed">
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-bold text-muted-foreground/50 px-1.5 py-0.5 rounded-full bg-muted">
                0{idx + 1}
              </span>
            </div>
            <h3 className="text-[13px] font-bold text-foreground tracking-tight leading-snug">
              {service.title}
            </h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
              {service.description}
            </p>
          </div>
        ) : (
          <div
            onClick={() => launchFeature(idx)}
            className="flex flex-col items-center justify-center text-center px-3 py-5 cursor-pointer group/slot gap-1"
          >
            <div className="w-6 h-6 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground group-hover/slot:text-emerald-500 transition-colors">
              <Sparkles className="w-3 h-3" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground group-hover/slot:text-foreground transition-colors">
              Feature 0{idx + 1}
            </span>
            <span className="text-[8px] text-muted-foreground/60">
              Click tree to release
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <style jsx global>{`
        @keyframes leafFall {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 0.85; }
          100% { transform: translateY(120px) rotate(200deg) translateX(20px) scale(0.4); opacity: 0; }
        }
        @keyframes treeSway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(0.7deg); }
        }
        @keyframes cardLand {
          0% { transform: scale(1.05); box-shadow: 0 0 24px rgba(16,185,129,0.35); }
          100% { transform: scale(1); box-shadow: none; }
        }
        .card-just-landed { animation: cardLand 0.45s ease-out forwards; }
      `}</style>

      {/* 3-Column Layout: Left Cards | Tree | Right Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-3 lg:gap-5 items-center">

        {/* Left Column: Cards 1, 2, 3 */}
        <div className="flex flex-col gap-3 order-2 lg:order-1">
          {leftServices.map((service, i) => renderCardSlot(service, i))}
        </div>

        {/* Center Column: Nature Tree */}
        <div className="flex flex-col items-center gap-2 order-1 lg:order-2">
          <div
            ref={treeRef}
            onClick={handleTreeClick}
            className={`relative w-52 h-52 sm:w-56 sm:h-56 lg:w-64 lg:h-64 rounded-2xl bg-gradient-to-b from-emerald-500/8 via-emerald-500/4 to-transparent border border-emerald-500/20 shadow-lg cursor-pointer group transition-all duration-300 hover:shadow-xl hover:border-emerald-500/40 select-none ${
              treeBounce ? "scale-95" : "hover:scale-[1.02]"
            } ${remaining === 0 ? "opacity-70" : ""}`}
            title={remaining > 0 ? "Click to launch next feature!" : "All features discovered!"}
          >
            {/* Ambient glow */}
            <div className="absolute inset-0 bg-emerald-500/8 rounded-2xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none" />

            {/* Falling leaves */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl z-20">
              {fallingLeaves.map((leaf) => (
                <div
                  key={leaf.id}
                  className="absolute top-[28%] w-2.5 h-2.5 text-emerald-500/80"
                  style={{
                    left: `${leaf.left}%`,
                    animationName: "leafFall",
                    animationDuration: "1.2s",
                    animationTimingFunction: "ease-in",
                    animationDelay: `${leaf.delay}s`,
                    animationFillMode: "forwards",
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.75A11.77 11.77 0 003.5 11l-1.5.5C3.3 8 7 4 17 8z" />
                  </svg>
                </div>
              ))}
            </div>

            {/* Tree SVG */}
            <div className="w-full h-full relative z-10 flex items-center justify-center p-2">
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full drop-shadow-sm"
                style={{ animation: "treeSway 6s ease-in-out infinite" }}
                fill="none"
              >
                <ellipse cx="200" cy="360" rx="120" ry="20" fill="currentColor" className="text-emerald-900/10 dark:text-emerald-500/10" />
                <path d="M165 348 C175 352 185 356 195 358 M235 348 C225 352 215 356 205 358" stroke="#78350F" strokeWidth="3" strokeLinecap="round" className="opacity-60 dark:opacity-40" />
                <path d="M185 355 C182 310 175 270 168 230 C160 190 155 170 130 145 C145 155 170 180 180 205 C188 225 192 245 196 265 C200 240 206 215 216 190 C228 160 252 140 275 130 C255 145 235 170 226 200 C220 220 218 245 216 270 C214 300 216 330 218 355 Z" fill="url(#trunkG)" />
                <path d="M192 345 C190 310 186 280 182 250 M204 345 C206 315 208 285 205 255" stroke="#5A2E0E" strokeWidth="2" strokeLinecap="round" className="opacity-50 dark:opacity-30" />

                <g className="transition-transform duration-500 group-hover:scale-[1.03] origin-center">
                  <path d="M110 180 C80 160 75 110 110 80 C140 50 190 55 210 80 C240 50 290 60 310 95 C335 135 315 180 280 200 C310 220 295 260 255 265 C230 270 200 255 180 245 C150 265 110 255 95 225 C85 205 95 188 110 180 Z" fill="url(#cDark)" className="opacity-95" />
                  <path d="M130 160 C110 145 110 110 135 90 C160 70 195 75 210 95 C230 75 270 80 285 110 C305 140 290 175 260 190 C280 215 265 245 235 245 C215 245 195 235 180 220 C155 240 125 230 115 205 C108 190 118 170 130 160 Z" fill="url(#cMid)" />
                  <circle cx="155" cy="115" r="36" fill="url(#p1)" />
                  <circle cx="210" cy="100" r="40" fill="url(#p2)" />
                  <circle cx="260" cy="125" r="36" fill="url(#p1)" />
                  <circle cx="130" cy="180" r="32" fill="url(#p2)" />
                  <circle cx="270" cy="190" r="34" fill="url(#p1)" />
                  <circle cx="200" cy="170" r="44" fill="url(#p2)" />
                  <path d="M170 120 C160 115 155 105 160 95 C165 105 175 112 170 120 Z" fill="#34D399" className="opacity-70" />
                  <path d="M230 110 C240 105 245 95 240 85 C235 95 225 102 230 110 Z" fill="#6EE7B7" className="opacity-70" />
                </g>

                {/* Feature orbs */}
                {[
                  { cx: 140, cy: 125 }, { cx: 200, cy: 90 }, { cx: 260, cy: 120 },
                  { cx: 135, cy: 185 }, { cx: 265, cy: 185 }, { cx: 200, cy: 160 },
                ].map((pos, idx) => {
                  const isRevealed = revealedIndices.includes(idx);
                  return (
                    <g key={idx}>
                      {!isRevealed && <circle cx={pos.cx} cy={pos.cy} r="13" fill="none" stroke="#10B981" strokeWidth="1.5" className="animate-ping opacity-40" />}
                      <circle cx={pos.cx} cy={pos.cy} r="9" fill={isRevealed ? "#10B981" : "#F59E0B"} className="transition-all duration-300 filter drop-shadow" />
                      <circle cx={pos.cx - 2.5} cy={pos.cy - 2.5} r="2.5" fill="#FFF" className="opacity-60" />
                      <text x={pos.cx} y={pos.cy + 3} textAnchor="middle" fill="#FFF" fontSize="7" fontWeight="bold" className="select-none pointer-events-none">{idx + 1}</text>
                    </g>
                  );
                })}

                <defs>
                  <linearGradient id="trunkG" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#451A03" /><stop offset="50%" stopColor="#78350F" /><stop offset="100%" stopColor="#3E1703" />
                  </linearGradient>
                  <linearGradient id="cDark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#047857" /><stop offset="100%" stopColor="#064E3B" />
                  </linearGradient>
                  <linearGradient id="cMid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" /><stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                  <radialGradient id="p1" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#34D399" /><stop offset="100%" stopColor="#059669" />
                  </radialGradient>
                  <radialGradient id="p2" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#047857" />
                  </radialGradient>
                </defs>
              </svg>
            </div>

            {/* Click prompt */}
            <div className="absolute bottom-2 inset-x-2 text-center z-20">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card/90 backdrop-blur-md border border-emerald-500/30 text-[9px] font-semibold text-foreground shadow-md">
                <Sparkles className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                <span>{remaining > 0 ? `Click to discover (${remaining} left)` : "✦ All discovered!"}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 text-[11px]">
            <button
              onClick={handleTreeClick}
              disabled={remaining === 0 || flyingCard !== null}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Wind className="w-3 h-3" />
              <span>Launch Next</span>
            </button>
            <button onClick={handleRevealAll} className="px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground font-medium transition-colors">
              Reveal All
            </button>
            <button onClick={handleReset} className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Reset">
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right Column: Cards 4, 5, 6 */}
        <div className="flex flex-col gap-3 order-3 lg:order-3">
          {rightServices.map((service, i) => renderCardSlot(service, i + 3))}
        </div>
      </div>

      {/* Flying Paper Air Card Overlay */}
      {flyingCard && (
        <div className="pointer-events-none" style={getFlyingCardStyle()}>
          <div className="bg-card/95 backdrop-blur-xl border-2 border-emerald-500 rounded-xl p-3 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                {(() => { const SvcIcon = ICON_MAP[services[flyingCard.index].icon] || LayoutGrid; return <SvcIcon className="w-3 h-3" />; })()}
              </div>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">✦ Flying</span>
            </div>
            <h4 className="text-[11px] font-bold text-foreground mb-0.5 truncate">{services[flyingCard.index].title}</h4>
            <p className="text-[9px] text-muted-foreground line-clamp-2 leading-relaxed">{services[flyingCard.index].description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
