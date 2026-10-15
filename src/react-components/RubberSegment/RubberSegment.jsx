'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, frame, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import './RubberSegment.css';
const EASE_OUT = [0.23, 1, 0.32, 1];
const SPRING_UI = { type: 'spring', duration: 0.3, bounce: 0 };
const SPRING_MOMENTUM = { type: 'spring', duration: 0.4, bounce: 0.2 };
const SPRING_RELAX = { type: 'spring', duration: 0.16, bounce: 0 };
const DILATE = 0.19;
const HANDOFF = 0.15;
const FLICK = 110;
const MAX_VELOCITY = 2000;
const DEADZONE = 4;
const SLOP = 10;
const RUBBER = 0.55;
const SIZES = {
  sm: { height: 28, font: 12, pad: 10, min: 36 },
  md: { height: 36, font: 13, pad: 14, min: 44 },
  lg: { height: 44, font: 14, pad: 18, min: 48 }
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rubber = (over, dim) => (over * dim * RUBBER) / (dim + RUBBER * Math.abs(over));
const project = (v, glide) => {
  const d = 1 - 0.1 * Math.pow(0.05, glide / 100);
  return ((v / 1000) * d) / (1 - d);
};
const velocityOf = (hist, now) => {
  const recent = hist.filter(([t]) => now - t <= 100);
  if (recent.length < 2) return 0;
  const [t0, x0] = recent[0];
  const [t1, x1] = recent[recent.length - 1];
  return t1 - t0 >= 8 ? ((x1 - x0) / (t1 - t0)) * 1000 : 0;
};
const nearestSlot = (slots, x) => {
  let best = 0;
  for (let i = 1; i < slots.length; i++) {
    if (Math.abs((slots[i].l + slots[i].r) / 2 - x) < Math.abs((slots[best].l + slots[best].r) / 2 - x)) best = i;
  }
  return best;
};
export default function RubberSegment({
  items,
  value,
  defaultValue,
  onChange,
  trackColor = '#ffffff',
  thumbColor = '#2563eb',
  textColor = '#2563eb',
  activeTextColor = '#ffffff',
  size = 'md',
  radius = 10,
  inset = 3,
  equalSlots = true,
  stretch = 100,
  squash = 3,
  speed = 1,
  glide = 75,
  draggable = true,
  disabled = false,
  className = '',
  'aria-label': ariaLabel = 'Segmented control'
}) {
  const list = items.map(item => (typeof item === 'string' ? { value: item, label: item } : item));
  const [inner, setInner] = useState(defaultValue ?? list[0]?.value);
  const current = value !== undefined ? value : inner;
  const index = Math.max(
    0,
    list.findIndex(item => item.value === current)
  );
  const reduce = useReducedMotion();
  const trackRef = useRef(null);
  const itemRefs = useRef([]);
  const slots = useRef([]);
  const box = useRef(null);
  const scale = useRef(1); // Учитываем масштаб предка (transform: scale).
  const committed = useRef(index);
  const handoff = useRef(0);
  const drag = useRef(null);
  const gen = useRef(0);
  const edgeL = useMotionValue(0);
  const edgeR = useMotionValue(0);
  const innerW = useMotionValue(0);
  const thumbRadius = Math.max(0, radius - inset);
  // Initial MotionValues are all zero. Without a guard, clip-path becomes
  // inset(0 0 0 0), exposing the FULL blue overlay and all its white labels.
  const clipPath = useTransform(() => {
    const width = innerW.get();
    const left = edgeL.get();
    const right = edgeR.get();
    if (![width, left, right].every(Number.isFinite) || width <= 0 || right - left <= 0.5) {
      return `inset(0 100% 0 0 round ${thumbRadius}px)`;
    }
    return `inset(0 ${Math.max(0, width - right)}px 0 ${Math.max(0, left)}px round ${thumbRadius}px)`;
  });
  const t = seconds => seconds / speed;
  const jumpTo = i => {
    const s = slots.current[i];
    if (!s) return;
    clearTimeout(handoff.current);
    gen.current += 1;
    edgeL.jump(s.l);
    edgeR.jump(s.r);
  };

  // Pointer coordinates need the current visual transform, but the tab geometry
  // itself MUST use untransformed layout sizes (offsetLeft/offsetWidth).
  // That remains correct inside scale()/entrance animations and does not change
  // when a pressed button briefly has transform:scale(.96).
  const readBox = () => {
    const track = trackRef.current;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    if (!track.offsetWidth || rect.width < 1) return null;
    const k = rect.width / track.offsetWidth;
    if (!Number.isFinite(k) || k <= 0) return null;
    scale.current = k;
    box.current = rect;
    return { rect, k };
  };

  const measure = () => {
    const track = trackRef.current;
    if (!track) return false;
    const width = track.clientWidth - inset * 2;
    const nextSlots = list.map((_, i) => {
      const el = itemRefs.current[i];
      if (!el || el.offsetParent === null || el.offsetWidth < 1) return null;
      return { l: el.offsetLeft - inset, r: el.offsetLeft + el.offsetWidth - inset };
    });
    const valid = width > 1 && nextSlots.length > 0 && nextSlots.every((s, i) =>
      s && Number.isFinite(s.l) && Number.isFinite(s.r) &&
      s.l >= -2 && s.r <= width + 2 && s.r - s.l > 1 &&
      (i === 0 || s.l >= nextSlots[i - 1].r - 2)
    );
    if (!valid) {
      // Hide the highlight while a tab is display:none or has not been laid out.
      delete track.dataset.ready;
      innerW.set(0);
      return false;
    }
    const oldWidth = innerW.get();
    const oldSlot = slots.current[committed.current];
    slots.current = nextSlots;
    innerW.set(width);
    // Do not interrupt the rubber motion on redundant resize notifications.
    const newSlot = nextSlots[committed.current];
    if (!oldSlot || oldWidth !== width ||
        Math.abs(oldSlot.l - newSlot.l) > .5 || Math.abs(oldSlot.r - newSlot.r) > .5) {
      jumpTo(committed.current);
    }
    if (track.dataset.ready === undefined) {
      frame.postRender(() => {
        if (trackRef.current === track && innerW.get() > 0) {
          track.dataset.ready = '';
        }
      });
    }
    return true;
  };

  const listKey = list.map(item => item.value).join('|');
  useLayoutEffect(() => {
    let mounted = true;
    let raf = 0;
    let attempts = 0;
    const attemptMeasure = () => {
      if (!mounted) return;
      if (measure()) {
        attempts = 0;
        return;
      }
      // Hidden tabs can be introduced after mount; defer measurement rather
      // than assuming a zero-size slot means that the active highlight is full.
      if (attempts++ < 120 && !raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          attemptMeasure();
        });
      }
    };
    attemptMeasure();
    const observer = new ResizeObserver(attemptMeasure);
    if (trackRef.current) observer.observe(trackRef.current);
    itemRefs.current.forEach(el => { if (el) observer.observe(el); });
    const intersection = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            attempts = 0;
            attemptMeasure();
          }
        })
      : null;
    if (trackRef.current) intersection?.observe(trackRef.current);
    document.fonts?.ready.then(() => { if (mounted) attemptMeasure(); });
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey, size, inset, equalSlots]);

  useEffect(() => {
    if (!drag.current && committed.current !== index) {
      committed.current = index;
      jumpTo(index);
    }
  });
  useEffect(
    () => () => {
      clearTimeout(handoff.current);
      edgeL.stop();
      edgeR.stop();
    },
    [edgeL, edgeR]
  );
  const commit = i => {
    committed.current = i;
    if (i === index) return;
    if (value === undefined) setInner(list[i].value);
    onChange?.(list[i].value, i);
  };
  const land = (to, v, flick, withSquash) => {
    const b = slots.current[to];
    if (!b) return;
    const g = ++gen.current;
    const dir = Math.sign((b.l + b.r) / 2 - (edgeL.get() + edgeR.get()) / 2) || 1;
    const [lead, leadTo, trail, trailTo] = dir > 0 ? [edgeR, b.r, edgeL, b.l] : [edgeL, b.l, edgeR, b.r];
    const velocityFor = mv => clamp(v === null ? mv.getVelocity() : v, -MAX_VELOCITY, MAX_VELOCITY);
    animate(lead, leadTo, {
      ...(flick ? SPRING_MOMENTUM : SPRING_UI),
      duration: t(flick ? 0.4 : 0.3),
      velocity: velocityFor(lead)
    });
    const trailVelocity = velocityFor(trail);
    if (!withSquash || squash <= 0) {
      animate(trail, trailTo, { ...SPRING_UI, duration: t(0.3), velocity: trailVelocity });
      return;
    }
    animate(trail, trailTo + dir * squash, { ...SPRING_UI, duration: t(0.3), velocity: trailVelocity }).then(() => {
      if (gen.current === g) animate(trail, trailTo, { ...SPRING_RELAX, duration: t(0.16) });
    });
  };
  // Original React Bits-style rubber stretch/squash animation is preserved.
  const travel = (from, to) => {
    const a = slots.current[from];
    const b = slots.current[to];
    if (!a || !b) return;
    clearTimeout(handoff.current);
    gen.current += 1;
    if (reduce) {
      edgeL.jump(b.l);
      edgeR.jump(b.r);
      return;
    }
    const u = stretch / 100;
    const tween = { duration: t(DILATE), ease: EASE_OUT };
    animate(edgeL, b.l + (Math.min(a.l, b.l) - b.l) * u, tween);
    animate(edgeR, b.r + (Math.max(a.r, b.r) - b.r) * u, tween);
    handoff.current = setTimeout(() => land(to, null, false, true), t(HANDOFF) * 1000);
  };
  const localX = e => (e.clientX - (box.current ? box.current.left : 0)) / scale.current - inset;
  const handlePointerDown = (e, i) => {
    if (disabled || drag.current || e.button !== 0) return;
    if (!trackRef.current?.hasAttribute('data-ready')) measure();
    readBox();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    const x = localX(e);
    const onThumb = draggable && x >= edgeL.get() && x <= edgeR.get();
    drag.current = { id: e.pointerId, x0: x, slot: i, onThumb, live: false, offset: 0, w: 0, hist: [[e.timeStamp, x]] };
    if (onThumb) {
      gen.current += 1;
      edgeL.stop();
      edgeR.stop();
    } else if (!reduce) {
      e.currentTarget.dataset.pressed = '';
    }
  };
  const handlePointerMove = e => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id || !d.onThumb) return;
    const x = localX(e);
    d.hist.push([e.timeStamp, x]);
    if (d.hist.length > 8) d.hist.shift();
    if (!d.live) {
      if (Math.abs(x - d.x0) < DEADZONE) return;
      d.live = true;
      d.offset = x - edgeL.get();
      d.w = edgeR.get() - edgeL.get();
      if (trackRef.current) trackRef.current.dataset.held = '';
    }
    const width = innerW.get();
    const l = x - d.offset;
    const maxL = width - d.w;
    if (reduce) {
      const c = clamp(l, 0, maxL);
      edgeL.set(c);
      edgeR.set(c + d.w);
    } else if (l < 0) {
      edgeL.set(0);
      edgeR.set(d.w - rubber(-l, d.w));
    } else if (l > maxL) {
      edgeR.set(width);
      edgeL.set(maxL + rubber(l - maxL, d.w));
    } else {
      edgeL.set(l);
      edgeR.set(l + d.w);
    }
  };
  const release = () => {
    const d = drag.current;
    drag.current = null;
    if (trackRef.current) delete trackRef.current.dataset.held;
    const el = itemRefs.current[d.slot];
    if (el) delete el.dataset.pressed;
    return d;
  };
  const handlePointerUp = e => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    release();
    const x = localX(e);
    if (!d.live) {
      if (Math.abs(x - d.x0) <= SLOP && d.slot !== committed.current) {
        const from = committed.current;
        commit(d.slot);
        travel(from, d.slot);
      }
      return;
    }
    const v = velocityOf(d.hist, e.timeStamp);
    const flick = Math.abs(v) > FLICK;
    let to = nearestSlot(slots.current, (edgeL.get() + edgeR.get()) / 2 + project(v, glide));
    if (flick && to === committed.current) to = clamp(to + Math.sign(v), 0, list.length - 1);
    commit(to);
    if (reduce) jumpTo(to);
    else land(to, v, flick, flick);
  };
  const handlePointerCancel = e => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    release();
    if (!d.live) return;
    if (reduce) jumpTo(committed.current);
    else land(committed.current, null, false, false);
  };
  const handleKeyDown = e => {
    if (disabled) return;
    const last = list.length - 1;
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(last, index + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, index - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    if (next === index) return;
    commit(next);
    jumpTo(next);
    itemRefs.current[next]?.focus();
  };
  const preset = SIZES[size] || SIZES.md;
  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      data-equal={equalSlots ? '' : undefined}
      data-draggable={draggable && !disabled ? '' : undefined}
      className={`rubber-segment${className ? ` ${className}` : ''}`}
      style={{
        '--rs-track': trackColor,
        '--rs-thumb': thumbColor,
        '--rs-ink': textColor,
        '--rs-ink-active': activeTextColor,
        '--rs-radius': `${radius}px`,
        '--rs-inset': `${inset}px`,
        '--rs-thumb-radius': `${thumbRadius}px`,
        '--rs-h': `${preset.height}px`,
        '--rs-font': `${preset.font}px`,
        '--rs-pad': `${preset.pad}px`,
        '--rs-min': `${preset.min}px`
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
    >
      {list.map((item, i) => (
        <button
          key={item.value}
          ref={el => {
            itemRefs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          disabled={disabled}
          className="rubber-segment__item"
          onPointerDown={e => handlePointerDown(e, i)}
          onKeyDown={handleKeyDown}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
      <motion.div
        className="rubber-segment__thumb"
        aria-hidden="true"
        style={{ clipPath }}
      >
        {list.map(item => (
          <span key={item.value} className="rubber-segment__item rubber-segment__copy">
            {item.icon}
            {item.label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
