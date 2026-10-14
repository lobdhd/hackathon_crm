import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { createPortal } from "react-dom";
import { RiCheckLine, RiMore2Fill } from "react-icons/ri";
import "./GooeyMenu.css";

const TRIGGER_SIZE = 40;
const PANEL_OFFSET = 47;
const PANEL_HEIGHT = 50;
const OVERLAY_HEIGHT = PANEL_OFFSET + PANEL_HEIGHT;
const SPRING = {
  type: "spring",
  stiffness: 340,
  damping: 32,
  mass: 0.85,
  restDelta: 0.001,
  restSpeed: 0.01,
};

function getMenuWidth(items) {
  const estimated = items.reduce((sum, item) => {
    const text = String(item.label || "");
    const textWidth = Math.min(200, text.length * 6.45);
    const iconWidth = item.icon ? 22 : 0;
    const checkWidth = item.key === "copy" ? 0 : 14;
    return sum + Math.max(74, Math.ceil(textWidth + iconWidth + checkWidth + 19));
  }, 16 + Math.max(0, items.length - 1) * 3);
  return Math.min(760, estimated);
}

/**
 * GooeyMenu – a solid, shadowless liquid action menu.
 * The component keeps its original public API and all motion comes from one spring.
 * The SVG blur is used ONLY to calculate connectivity; it is never rendered as a blur.
 */
export default function GooeyMenu({
  items = [],
  value,
  onSelect,
  onOpenChange,
  label = "Действия с ответом",
  triggerLabel = "Варианты отображения",
  triggerIcon: TriggerIcon = RiMore2Fill,
  iconOnly = true,
  disabled = false,
  className = "",
}) {
  const [expanded, setExpanded] = useState(false);
  const [present, setPresent] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const triggerRef = useRef(null);
  const overlayRef = useRef(null);
  const animationRef = useRef(null);
  const targetOpenRef = useRef(false);
  const notifiedOpenRef = useRef(false);
  const selectionRef = useRef(null);
  const progress = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const menuId = `gooey-menu-${uid}`;
  const filterId = `gooey-filter-${uid}`;

  // Keep the button anchored to its original position; compress the menu on narrow screens.
  const desiredWidth = getMenuWidth(items);
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const rightEdge = Math.min(anchor?.right ?? viewportWidth - 10, viewportWidth - 10);
  const width = Math.max(TRIGGER_SIZE, Math.min(desiredWidth, rightEdge - 10, viewportWidth - 20));

  const panelY = useTransform(progress, [0, 0.2, 0.46, 1], [0, 7, PANEL_OFFSET, PANEL_OFFSET]);
  const panelWidth = useTransform(progress, [0, 0.26, 0.55, 1], [TRIGGER_SIZE, TRIGGER_SIZE, Math.min(width * 0.56, 220), width]);
  const panelHeight = useTransform(progress, [0, 0.35, 1], [TRIGGER_SIZE, 44, PANEL_HEIGHT]);
  const panelRadius = useTransform(progress, [0, 0.52, 1], [20, 19, 14]);
  const stemY = useTransform(progress, [0, 0.24, 0.66, 1], [16, 22, 30, 34]);
  const stemHeight = useTransform(progress, [0, 0.26, 0.66, 1], [7, 29, 24, 5]);
  const stemWidth = useTransform(progress, [0, 0.3, 0.74, 1], [10, 17, 14, 4]);
  const stemOpacity = useTransform(progress, [0, 0.14, 0.77, 1], [0, 1, 1, 0]);
  const dropY = useTransform(progress, [0, 0.34, 0.76, 1], [9, 28, 48, 51]);
  const dropScale = useTransform(progress, [0, 0.3, 0.78, 1], [0.5, 1.15, 1.08, 0.6]);
  const dropOpacity = useTransform(progress, [0, 0.13, 0.82, 1], [0, 1, 1, 0]);
  const contentOpacity = useTransform(progress, [0, 0.7, 0.9, 1], [0, 0, 0.55, 1]);
  const contentClip = useTransform(panelWidth, (visible) =>
    `inset(0 0 0 ${Math.max(0, width - visible)}px)`
  );
  const contentX = useTransform(progress, [0, 0.62, 1], [12, 8, 0]);

  const measureAnchor = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = { top: rect.top, right: rect.right, left: rect.left, bottom: rect.bottom };
    setAnchor((prev) =>
      prev && Object.keys(next).every((key) => Math.abs(prev[key] - next[key]) < 0.2)
        ? prev
        : next
    );
  }, []);

  const runSpring = useCallback((to, onDone) => {
    animationRef.current?.stop();
    animationRef.current = null;
    if (reducedMotion) {
      progress.set(to);
      onDone?.();
      return;
    }
    const controls = animate(progress, to, SPRING);
    animationRef.current = controls;
    controls.then(() => {
      if (animationRef.current !== controls) return;
      animationRef.current = null;
      progress.set(to);
      onDone?.();
    });
  }, [progress, reducedMotion]);

  const close = useCallback((selectedItem = null) => {
    if (!targetOpenRef.current) return;
    targetOpenRef.current = false;
    selectionRef.current = selectedItem;
    setExpanded(false);

    // Notify immediately: Assistant starts shrinking the chat spacer in the
    // same interaction as the liquid panel starts closing, not after it finishes.
    if (notifiedOpenRef.current) {
      notifiedOpenRef.current = false;
      onOpenChange?.(false);
    }

    // Keep the actual portal mounted until the close animation completes.
    runSpring(0, () => {
      if (targetOpenRef.current) return;
      setPresent(false);
      setAnchor(null);
      const selection = selectionRef.current;
      selectionRef.current = null;
      if (selection) onSelect?.(selection);
    });
  }, [onOpenChange, onSelect, runSpring]);

  const show = useCallback(() => {
    if (disabled || !items.length || targetOpenRef.current) return;
    selectionRef.current = null;
    measureAnchor();
    targetOpenRef.current = true;
    setPresent(true);
    setExpanded(true);
    if (!notifiedOpenRef.current) {
      notifiedOpenRef.current = true;
      onOpenChange?.(true);
    }
    runSpring(1);
  }, [disabled, items.length, measureAnchor, onOpenChange, runSpring]);

  useLayoutEffect(() => {
    if (!present) return undefined;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measureAnchor);
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [present, measureAnchor]);

  useEffect(() => {
    if (!expanded) return undefined;
    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || overlayRef.current?.contains(event.target)) return;
      close();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, expanded]);

  useEffect(() => {
    if (disabled && targetOpenRef.current) close();
  }, [close, disabled]);

  useEffect(() => () => {
    animationRef.current?.stop();
  }, []);

  if (!items.length) return null;

  return (
    <div className={`gooey-menu ${present ? "gooey-menu--open" : ""} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`gooey-menu__trigger ${iconOnly ? "gooey-menu__trigger--icon" : ""}`}
        aria-haspopup="menu"
        aria-expanded={expanded}
        aria-controls={present ? menuId : undefined}
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          if (targetOpenRef.current) close();
          else show();
        }}
      >
        <TriggerIcon size={18} aria-hidden="true" />
        {!iconOnly && <span>{triggerLabel}</span>}
      </button>

      {present && anchor && typeof document !== "undefined" && createPortal(
        <div
          ref={overlayRef}
          className="gooey-menu__overlay"
          style={{
            left: rightEdge - width,
            top: anchor.top,
            width,
            height: OVERLAY_HEIGHT,
            pointerEvents: expanded ? "auto" : "none",
          }}
        >
          <svg className="gooey-menu__filter-defs" aria-hidden="true" focusable="false">
            <defs>
              <filter
                id={filterId}
                x="-45%"
                y="-65%"
                width="190%"
                height="230%"
                colorInterpolationFilters="sRGB"
              >
                {/* Blur affects the alpha mask ONLY. A steep threshold eliminates the dark halo. */}
                <feGaussianBlur in="SourceAlpha" stdDeviation="4.5" result="blurAlpha" />
                <feColorMatrix
                  in="blurAlpha"
                  type="matrix"
                  values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 54 -26"
                  result="hardAlpha"
                />
                <feFlood floodColor="#101114" floodOpacity="1" result="solidColor" />
                <feComposite in="solidColor" in2="hardAlpha" operator="in" result="solidLiquid" />
                <feMerge>
                  <feMergeNode in="solidLiquid" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>

          <div className="gooey-menu__liquid" style={{ filter: `url(#${filterId})` }} aria-hidden="true">
            <div className="gooey-menu__button-shape" />
            <motion.div
              className="gooey-menu__stem"
              style={{ y: stemY, height: stemHeight, width: stemWidth, opacity: stemOpacity }}
            />
            <motion.div
              className="gooey-menu__drop"
              style={{ y: dropY, scale: dropScale, opacity: dropOpacity }}
            />
            <motion.div
              className="gooey-menu__panel-shape"
              style={{ y: panelY, width: panelWidth, height: panelHeight, borderRadius: panelRadius }}
            />
          </div>

          <button
            type="button"
            className="gooey-menu__floating-icon"
            aria-label="Закрыть меню"
            onClick={() => close()}
            tabIndex={expanded ? 0 : -1}
            disabled={!expanded}
          >
            <TriggerIcon size={18} aria-hidden="true" />
          </button>

          <motion.div
            id={menuId}
            className="gooey-menu__panel"
            role="menu"
            aria-label={label}
            aria-hidden={!expanded}
            style={{
              width,
              top: PANEL_OFFSET,
              height: PANEL_HEIGHT,
              opacity: contentOpacity,
              x: contentX,
              clipPath: contentClip,
              pointerEvents: expanded ? "auto" : "none",
            }}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              const enabled = Array.from(event.currentTarget.querySelectorAll("button:not(:disabled)"));
              if (!enabled.length) return;
              event.preventDefault();
              const current = enabled.indexOf(document.activeElement);
              const next = event.key === "Home" ? 0
                : event.key === "End" ? enabled.length - 1
                  : event.key === "ArrowLeft" ? (current - 1 + enabled.length) % enabled.length
                    : (current + 1) % enabled.length;
              enabled[next].focus();
            }}
          >
            <div className="gooey-menu__items">
              {items.map((item) => {
                const Icon = item.icon;
                const selected = value === item.key && item.key !== "copy";
                return (
                  <button
                    key={item.key}
                    type="button"
                    role={item.key === "copy" ? "menuitem" : "menuitemradio"}
                    aria-checked={item.key === "copy" ? undefined : selected}
                    tabIndex={expanded ? 0 : -1}
                    disabled={!expanded || item.disabled}
                    className={`gooey-menu__item ${selected ? "gooey-menu__item--selected" : ""}`}
                    onClick={() => close(item)}
                  >
                    {Icon && <Icon size={15} aria-hidden="true" />}
                    <span className="gooey-menu__item-label">{item.label}</span>
                    {selected && <RiCheckLine size={13} className="gooey-menu__check" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
