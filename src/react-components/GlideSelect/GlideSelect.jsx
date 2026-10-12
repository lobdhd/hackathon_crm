'use client';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import './GlideSelect.css';

const VIEWPORT_GAP = 10;
const MENU_GAP = 6;
const SIZE_CONFIG = {
  sm: { trigger: 38, option: 36, font: 12 },
  md: { trigger: 44, option: 40, font: 13 },
  lg: { trigger: 48, option: 44, font: 14 },
};
const normalizeOption = (option) => typeof option === 'string'
  ? { value: option, label: option }
  : option;

export default function GlideSelect({
  options = [],
  value,
  defaultValue = '',
  onChange,
  placeholder = 'Выберите...',
  showTags = true,
  accentColor = '#2563eb',
  surfaceColor = '#ffffff',
  highlightColor = '#eff6ff',
  textColor = '#111827',
  size = 'md',
  radius = 10,
  menuWidth = 176,
  menuMaxWidth = 620,
  menuMaxHeight = 280,
  placement = 'bottom',
  align = 'left',
  popDuration = 180,
  glideDuration = 220,
  rememberPosition = true,
  disabled = false,
  ariaLabel = 'Выбор значения',
  className = '',
  portal = false,
  searchable = false,
  searchPlaceholder = 'Поиск...',
}) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const [innerValue, setInnerValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [menuPosition, setMenuPosition] = useState(null);
  const [side, setSide] = useState(placement);
  const items = useMemo(() => options.map(normalizeOption), [options]);
  const current = value !== undefined ? value : innerValue;
  const selectedIndex = items.findIndex((item) => String(item.value) === String(current));
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term || !searchable) return items;
    return items.filter((item) => `${item.label ?? ''} ${item.tag ?? ''}`.toLocaleLowerCase().includes(term));
  }, [items, query, searchable]);
  const sizes = SIZE_CONFIG[size] ?? SIZE_CONFIG.md;
  const cssVars = {
    '--gs-accent': accentColor,
    '--gs-surface': surfaceColor,
    '--gs-highlight': highlightColor,
    '--gs-text': textColor,
    '--gs-radius': `${radius}px`,
    '--gs-inner-radius': `${Math.max(radius - 4, 4)}px`,
    '--gs-chip': `${sizes.trigger}px`,
    '--gs-row': `${sizes.option}px`,
    '--gs-font': `${sizes.font}px`,
    '--gs-pop': `${popDuration}ms`,
    '--gs-glide': `${glideDuration}ms`,
  };

  const reposition = () => {
    const root = rootRef.current;
    const menu = menuRef.current;
    if (!root || !menu) return;
    const rect = root.getBoundingClientRect();
    const vv = window.visualViewport;
    const vx = vv?.offsetLeft ?? 0;
    const vy = vv?.offsetTop ?? 0;
    const vw = vv?.width ?? window.innerWidth;
    const vh = vv?.height ?? window.innerHeight;
    const availableWidth = Math.max(120, vw - VIEWPORT_GAP * 2);
    const maxWidth = Math.min(menuMaxWidth > 0 ? menuMaxWidth : availableWidth, availableWidth);
    // Measure the longest option, but never extend beyond the viewport.
    const rows = menu.querySelectorAll('.glide-select__option');
    const longest = Math.max(0, ...Array.from(rows, (row) => row.scrollWidth));
    const width = Math.min(maxWidth, Math.max(menuWidth, rect.width, longest + 8));
    const idealLeft = align === 'right' ? rect.right - width : rect.left;
    const left = Math.max(vx + VIEWPORT_GAP, Math.min(idealLeft, vx + vw - width - VIEWPORT_GAP));
    const searchHeight = searchable ? 54 : 0;
    const requestedHeight = Math.min(menuMaxHeight + searchHeight + 8, visible.length * (sizes.option + 1) + searchHeight + 8);
    const below = vy + vh - rect.bottom - VIEWPORT_GAP - MENU_GAP;
    const above = rect.top - vy - VIEWPORT_GAP - MENU_GAP;
    const useTop = placement === 'top'
      ? above >= Math.min(requestedHeight, 170) || above > below
      : below < Math.min(requestedHeight, 170) && above > below;
    const room = Math.max(100, useTop ? above : below);
    const height = Math.min(requestedHeight, room);
    setSide(useTop ? 'top' : 'bottom');
    setMenuPosition(portal ? {
      position: 'fixed', left, top: useTop ? rect.top - height - MENU_GAP : rect.bottom + MENU_GAP,
      width, maxHeight: height, zIndex: 9999,
    } : {
      position: 'absolute', left: left - rect.left,
      top: useTop ? 'auto' : `calc(100% + ${MENU_GAP}px)`,
      bottom: useTop ? `calc(100% + ${MENU_GAP}px)` : 'auto',
      width, maxHeight: height, zIndex: 100,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    // The search field is deliberately focused only on opening.
    if (searchable) searchRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onOutside = (event) => {
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onMove = () => reposition();
    document.addEventListener('pointerdown', onOutside, true);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    window.visualViewport?.addEventListener('resize', onMove);
    window.visualViewport?.addEventListener('scroll', onMove);
    return () => {
      document.removeEventListener('pointerdown', onOutside, true);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
      window.visualViewport?.removeEventListener('resize', onMove);
      window.visualViewport?.removeEventListener('scroll', onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visible.length, portal, align, placement, menuWidth, menuMaxWidth, menuMaxHeight]);

  useEffect(() => {
    if (open && menuRef.current) reposition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, visible.length]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open || active < 0 || !rememberPosition) return;
    const row = listRef.current?.querySelector(`[data-index="${active}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [active, open, rememberPosition]);

  const toggle = () => {
    if (disabled) return;
    if (open) {
      setOpen(false);
      return;
    }
    setQuery('');
    setActive(Math.max(0, selectedIndex));
    setMenuPosition(null);
    setOpen(true);
  };

  const choose = (item) => {
    if (!item || item.disabled) return;
    if (String(item.value) !== String(current)) {
      if (value === undefined) setInnerValue(item.value);
      onChange?.(item.value, item);
    }
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  const onKeyboard = (event) => {
    if (disabled) return;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        toggle();
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!visible.length) return;
      const advance = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1
        : Math.max(0, Math.min(visible.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)));
      setActive(advance);
    } else if (event.key === 'Enter' || (event.key === ' ' && event.target !== searchRef.current)) {
      event.preventDefault();
      choose(visible[active] ?? visible[0]);
    } else if (!searchable && event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const start = Math.max(active, 0);
      const match = visible.findIndex((item, index) => index >= start && String(item.label).toLowerCase().startsWith(event.key.toLowerCase()));
      if (match >= 0) setActive(match);
    }
  };

  const menu = open && (
    <div
      ref={menuRef}
      className={`glide-select__menu${portal ? ' glide-select__menu--portal' : ''}`}
      data-state="open"
      data-side={side}
      data-align={align}
      style={{ ...cssVars, ...(menuPosition ?? { position: portal ? 'fixed' : 'absolute', visibility: 'hidden', left: 0, top: -9999 }) }}
    >
      {searchable && (
        <div className="glide-select__search-wrap">
          <input
            ref={searchRef}
            type="search"
            className="glide-select__search"
            aria-label={`Поиск: ${ariaLabel}`}
            value={query}
            placeholder={searchPlaceholder}
            onChange={(event) => { setQuery(event.target.value); setActive(0); }}
          />
        </div>
      )}
      <div
        ref={listRef}
        role="listbox"
        id={`${id}-list`}
        className="glide-select__list"
        aria-label={ariaLabel}
        style={{ maxHeight: `min(${menuMaxHeight}px, 100%)` }}
        onPointerLeave={() => { if (!rememberPosition) setActive(-1); }}
      >
        {active >= 0 && active < visible.length && (
          <span
            className="glide-select__pill"
            style={{ transform: `translateY(${active * (sizes.option + 1)}px)` }}
            aria-hidden="true"
          />
        )}
        {visible.map((item, index) => {
          const checked = String(item.value) === String(current);
          return (
            <button
              id={`${id}-${index}`}
              key={`${String(item.value)}-${index}`}
              type="button"
              role="option"
              data-index={index}
              aria-selected={checked}
              disabled={item.disabled}
              className={`glide-select__option${active === index ? ' glide-select__option--active' : ''}`}
              onPointerEnter={() => setActive(index)}
              onClick={() => choose(item)}
            >
              <span className="glide-select__name">{item.label}</span>
              {showTags && item.tag && <span className="glide-select__tag">{item.tag}</span>}
              <span className="glide-select__check" data-on={checked ? '' : undefined} aria-hidden="true">
                <HugeiconsIcon icon={Tick02Icon} size={15} strokeWidth={2.5} />
              </span>
            </button>
          );
        })}
        {visible.length === 0 && <div className="glide-select__empty">Ничего не найдено</div>}
      </div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={['glide-select', className].filter(Boolean).join(' ')}
      data-size={size}
      data-disabled={disabled ? '' : undefined}
      style={cssVars}
      onKeyDown={onKeyboard}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-controls={open ? `${id}-list` : undefined}
        aria-expanded={open}
        disabled={disabled}
        className="glide-select__trigger"
        onClick={toggle}
      >
        <span className="glide-select__label" data-empty={selected ? undefined : ''}>
          {selected?.label ?? placeholder}
        </span>
        <span className="glide-select__chevron" aria-hidden="true">
          <HugeiconsIcon icon={ArrowDown01Icon} size={15} strokeWidth={2.5} />
        </span>
      </button>
      {portal && typeof document !== 'undefined' ? createPortal(menu, document.body) : menu}
    </div>
  );
}
