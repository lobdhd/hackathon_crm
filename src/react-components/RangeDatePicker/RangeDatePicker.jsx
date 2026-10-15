'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendar2Line,
  RiCloseLine,
} from 'react-icons/ri';

import './RangeDatePicker.css';
import { t as i18nT } from "../../i18n/index.js";
import { useI18n as __useI18nReactive } from "../../i18n/index.js";

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAY_MS = 86400000;
const PAD = 10;

const startOfDay = (date) => date instanceof Date && Number.isFinite(date.getTime())
  ? new Date(date.getFullYear(), date.getMonth(), date.getDate())
  : null;
const dayNumber = (date) => date ? Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS : NaN;
const sameDay = (a, b) => Boolean(a && b && dayNumber(a) === dayNumber(b));
const fmt = (date) => date ? [date.getDate(), date.getMonth() + 1, date.getFullYear()]
  .map((n, index) => index < 2 ? String(n).padStart(2, '0') : String(n)).join('.') : '';
const keyOf = (date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const inRange = (date, a, b) => Boolean(a && b && dayNumber(date) >= dayNumber(a) && dayNumber(date) <= dayNumber(b));

export default function RangeDatePicker({
  value = [null, null],
  onChange,
  placeholder = 'Выберите период',
  ariaLabel = 'Диапазон дат',
  disabled = false,
  className = '',
  minDate,
  maxDate,
}) {
    __useI18nReactive();
    const __i18nLocaleToken = i18nT("sidebar.home");
  const id = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const popupRef = useRef(null);
  const cellRefs = useRef(new Map());
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState('bottom');
  const placementRef = useRef('bottom');
  const [popupLeft, setPopupLeft] = useState(0);
  const [popupMaxHeight, setPopupMaxHeight] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [focusedDay, setFocusedDay] = useState(null);
  const [view, setView] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [start, end] = Array.isArray(value)
    ? [startOfDay(value[0]), startOfDay(value[1])]
    : [null, null];
  const minimum = startOfDay(minDate);
  const maximum = startOfDay(maxDate);
  const today = startOfDay(new Date());
  const pending = start && !end;
  const previewStart = pending && hovered && dayNumber(hovered) < dayNumber(start) ? hovered : start;
  const previewEnd = pending && hovered && dayNumber(hovered) >= dayNumber(start) ? hovered
    : pending && hovered ? start : end;
  const previewing = Boolean(pending && hovered);

  const display = start
    ? end ? `${fmt(start)} — ${fmt(end)}` : `${fmt(start)} — ...`
    : placeholder;

  const shiftMonth = (step) => setView((current) => new Date(current.getFullYear(), current.getMonth() + step, 1));
  const goToDate = (date) => {
    setView(new Date(date.getFullYear(), date.getMonth(), 1));
    setFocusedDay(date);
    // Focusing after React commits is handled by the effect below.
  };

  useEffect(() => {
    if (!open || !focusedDay) return;
    cellRefs.current.get(keyOf(focusedDay))?.focus({ preventScroll: true });
  }, [focusedDay, open, view]);

  const openCalendar = () => {
    if (disabled) return;
    if (open) { setOpen(false); return; }
    const initial = start || today;
    setView(new Date(initial.getFullYear(), initial.getMonth(), 1));
    setHovered(null);
    setFocusedDay(null);
    placementRef.current = 'bottom';
    setPopupMaxHeight(null);
    setOpen(true);
  };

  // The popup lives inside the trigger's positioning context instead of a fixed
  // portal. Scrolling moves both together natively, without per-frame React
  // position updates (which previously made the calendar jitter).
  useLayoutEffect(() => {
    if (!open) return undefined;

    let frame = null;
    let first = true;
    const updatePlacement = () => {
      frame = null;
      const anchor = rootRef.current?.getBoundingClientRect();
      const popup = popupRef.current;
      if (!anchor || !popup) return;

      const viewport = window.visualViewport;
      const vw = viewport?.width ?? window.innerWidth;
      const vh = viewport?.height ?? window.innerHeight;
      const topEdge = viewport?.offsetTop ?? 0;
      const leftEdge = viewport?.offsetLeft ?? 0;

      // Close if the input itself has left the visible scrolling region.
      if (anchor.bottom < topEdge || anchor.top > topEdge + vh) {
        setOpen(false);
        return;
      }

      const desiredWidth = Math.min(348, Math.max(240, vw - PAD * 2));
      const popupHeight = popup.scrollHeight || 420;
      const above = Math.max(0, anchor.top - topEdge - PAD - 8);
      const below = Math.max(0, topEdge + vh - anchor.bottom - PAD - 8);
      const previousSide = placementRef.current;
      let next = previousSide;

      if (first) {
        // Prefer the side where the full calendar fits; otherwise use
        // whichever side currently has more room.
        next = below >= popupHeight || below >= above ? 'bottom' : 'top';
      } else if (next === 'bottom') {
        // Hysteresis prevents top/bottom oscillation at the threshold.
        if ((above >= popupHeight && below < popupHeight) ||
            (below < popupHeight && above > below + 72)) next = 'top';
      } else if ((below >= popupHeight && above < popupHeight) ||
                 (above < popupHeight && below > above + 72)) {
        next = 'bottom';
      }
      const wasFirst = first;
      first = false;
      if (placementRef.current !== next) {
        placementRef.current = next;
        setPlacement(next);
      }

      // Keep the popup in the horizontal viewport without moving the trigger.
      const idealLeft = Math.min(0, leftEdge + vw - PAD - anchor.left - desiredWidth);
      const left = Math.max(leftEdge + PAD - anchor.left, idealLeft);
      setPopupLeft((old) => Math.abs(old - left) < 1 ? old : left);

      // Choose a stable height on open/flip, not a changing height on every
      // pixel of scroll. Small viewports scroll INSIDE the popup.
      const available = next === 'top' ? above : below;
      const cap = Math.max(180, Math.min(440, Math.floor(available)));
      if (wasFirst || previousSide !== next) setPopupMaxHeight(cap);
    };

    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(updatePlacement);
    };
    updatePlacement();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => {
      if (rootRef.current?.contains(event.target) || popupRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setHovered(null);
        buttonRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', escape, true);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday first
    return Array.from({ length: 42 }, (_, index) => new Date(
      view.getFullYear(), view.getMonth(), index - offset + 1,
    ));
  }, [view, __i18nLocaleToken]);

  const isDisabledDate = (date) => (minimum && dayNumber(date) < dayNumber(minimum))
    || (maximum && dayNumber(date) > dayNumber(maximum));

  const pick = (date) => {
    if (isDisabledDate(date)) return;
    if (!start || end) {
      onChange?.([startOfDay(date), null]);
      setHovered(null);
      return;
    }
    const selected = startOfDay(date);
    if (dayNumber(selected) < dayNumber(start)) onChange?.([selected, start]);
    else onChange?.([start, selected]);
    setHovered(null);
    setOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  };

  const handleKeyDown = (event, date) => {
    let next = null;
    if (event.key === 'ArrowLeft') next = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
    if (event.key === 'ArrowRight') next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    if (event.key === 'ArrowUp') next = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7);
    if (event.key === 'ArrowDown') next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
    if (event.key === 'PageUp') next = new Date(date.getFullYear(), date.getMonth() - 1, date.getDate());
    if (event.key === 'PageDown') next = new Date(date.getFullYear(), date.getMonth() + 1, date.getDate());
    if (next) {
      event.preventDefault();
      if (isDisabledDate(next)) return;
      goToDate(next);
    }
  };

  const firstYear = Math.min(1990, view.getFullYear() - 10);
  const lastYear = Math.max(today.getFullYear() + 15, view.getFullYear() + 10);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);
  const popup = open && (
    <div
      ref={popupRef}
      id={`${id}-calendar`}
      className="range-date-picker__popup"
      data-side={placement}
      role="dialog"
      aria-modal="false"
      aria-label={i18nT("reactcomponents.rangedatepicker.rangedatepicker.5188dca")}
      onPointerLeave={() => setHovered(null)}
      style={{ left: popupLeft, maxHeight: popupMaxHeight ? `${popupMaxHeight}px` : undefined }}
    >
      <div className="range-date-picker__calendar-header">
        <button type="button" className="range-date-picker__nav" aria-label={i18nT("reactcomponents.rangedatepicker.rangedatepicker.fbc394b")} onClick={() => shiftMonth(-1)}>
          <RiArrowLeftSLine size={20}/>
        </button>
        <div className="range-date-picker__heading">
          <select aria-label={i18nT("ratingPage.month")} value={view.getMonth()}
            onChange={(event) => setView(new Date(view.getFullYear(), Number(event.target.value), 1))}>
            {MONTHS.map((name, index) => <option key={name} value={index}>{name}</option>)}
          </select>
          <select aria-label={i18nT("reactcomponents.rangedatepicker.rangedatepicker.2d0847a")} value={view.getFullYear()}
            onChange={(event) => setView(new Date(Number(event.target.value), view.getMonth(), 1))}>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <button type="button" className="range-date-picker__nav" aria-label={i18nT("reactcomponents.rangedatepicker.rangedatepicker.e66645e")} onClick={() => shiftMonth(1)}>
          <RiArrowRightSLine size={20}/>
        </button>
      </div>
      <div className="range-date-picker__weekday-row" aria-hidden="true">
        {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <div className="range-date-picker__days" role="grid" aria-label={`${MONTHS[view.getMonth()]} ${view.getFullYear()}`}>
        {days.map((date) => {
          const other = date.getMonth() !== view.getMonth();
          const selectedStart = sameDay(date, previewStart);
          const selectedEnd = sameDay(date, previewEnd);
          const between = inRange(date, previewStart, previewEnd) && !selectedStart && !selectedEnd;
          const currentToday = sameDay(date, today);
          const unavailable = isDisabledDate(date);
          const isSelected = selectedStart || selectedEnd;
          return (
            <div key={keyOf(date)} role="gridcell" className={[
              'range-date-picker__cell',
              selectedStart && previewEnd && !selectedEnd ? 'is-start' : '',
              selectedEnd && previewStart && !selectedStart ? 'is-end' : '',
              between ? 'is-between' : '',
            ].filter(Boolean).join(' ')}>
              <button
                ref={(element) => {
                  const key = keyOf(date);
                  if (element) cellRefs.current.set(key, element);
                  else cellRefs.current.delete(key);
                }}
                type="button"
                disabled={Boolean(unavailable)}
                aria-label={new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)}
                aria-pressed={isSelected}
                className={[
                  'range-date-picker__day', other ? 'is-outside' : '',
                  isSelected ? 'is-selected' : '',
                  currentToday ? 'is-today' : '',
                  previewing && (between || isSelected) ? 'is-preview' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => pick(date)}
                onPointerEnter={() => { if (pending && !unavailable) setHovered(date); }}
                onFocus={() => { if (pending && !unavailable) setHovered(date); }}
                onKeyDown={(event) => handleKeyDown(event, date)}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
      <div className="range-date-picker__footer">
        <span>{start && !end ? i18nT("reactcomponents.rangedatepicker.rangedatepicker.8f13299") : i18nT("reactcomponents.rangedatepicker.rangedatepicker.3e38732")}</span>
        {(start || end) && (
          <button type="button" onClick={() => { onChange?.([null, null]); setHovered(null); }}>
            {i18nT("employeesPage.reset")}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={`range-date-picker${className ? ` ${className}` : ''}`} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`range-date-picker__trigger${open ? ' is-open' : ''}`}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-calendar` : undefined}
        onClick={openCalendar}
      >
        <RiCalendar2Line size={17} className="range-date-picker__icon" aria-hidden="true" />
        <span className={`range-date-picker__value${!start ? ' is-placeholder' : ''}`}>{display}</span>
        {!start && <RiArrowRightSLine size={16} className="range-date-picker__chevron" aria-hidden="true" />}
      </button>
      {start && !disabled && (
        <button type="button" className="range-date-picker__clear" aria-label={i18nT("reactcomponents.rangedatepicker.rangedatepicker.365d3ad")}
          onClick={() => { onChange?.([null, null]); setOpen(false); setHovered(null); }}>
          <RiCloseLine size={16}/>
        </button>
      )}
      {popup}
    </div>
  );
}
