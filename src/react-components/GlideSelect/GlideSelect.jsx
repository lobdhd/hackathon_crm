'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import {
  HugeiconsIcon,
} from '@hugeicons/react';

import {
  ArrowDown01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';

import './GlideSelect.css';


// MARK: Config

const SIZES = {
  sm: {
    chip: 28,
    row: 26,
    font: 12,
  },

  md: {
    chip: 32,
    row: 30,
    font: 13,
  },

  lg: {
    chip: 44,
    row: 40,
    font: 14,
  },
};

const PAD = 4;
const GAP = 1;
const MENU_GAP = 6;
const VIEWPORT_PADDING = 8;

const DEFAULT_OPTIONS = [
  'One',
  'Two',
  'Three',
];


// MARK: Helpers

const norm = (option) =>
  typeof option === 'string'
    ? {
        value: option,
        label: option,
      }
    : option;

const textOf = (item) =>
  typeof item.label === 'string'
    ? item.label
    : item.value;

function typeaheadIndex(
  items,
  from,
  char,
) {
  const search =
    char.toLowerCase();

  const count =
    items.length;

  for (
    let step = 1;
    step <= count;
    step += 1
  ) {
    const index =
      (from + step) %
      count;

    if (
      textOf(
        items[index],
      )
        .toLowerCase()
        .startsWith(
          search,
        )
    ) {
      return index;
    }
  }

  return from;
}


// MARK: Component

export default function GlideSelect({
  options = DEFAULT_OPTIONS,

  value,
  defaultValue,

  onChange,

  placeholder = 'Select…',

  showTags = true,

  accentColor = '#f5f5f5',
  surfaceColor = '#27272a',
  highlightColor = '#3f3f46',
  textColor = '#f5f5f5',

  size = 'md',

  radius = 10,

  /*
   * Теперь это МИНИМАЛЬНАЯ
   * ширина выпадающего меню.
   *
   * Меню автоматически
   * расширяется под контент.
   */
  menuWidth = 176,

  /*
   * Максимальная ширина.
   * На маленьком экране всё равно
   * ограничивается viewport.
   */
  menuMaxWidth = 620,

  /*
   * Максимальная высота списка.
   */
  menuMaxHeight = 280,

  placement = 'bottom',

  align = 'left',

  popDuration = 180,

  glideDuration = 220,

  rememberPosition = true,

  disabled = false,

  ariaLabel = 'Select',

  className = '',
}) {
  const items =
    options.map(
      norm,
    );

  const [
    inner,
    setInner,
  ] = useState(
    defaultValue ?? '',
  );

  const current =
    value ?? inner;

  const selected =
    items.findIndex(
      (item) =>
        item.value ===
        current,
    );

  const [
    phase,
    setPhase,
  ] = useState(
    'closed',
  );

  const [
    active,
    setActive,
  ] = useState(null);

  const [
    side,
    setSide,
  ] = useState(
    placement,
  );

  const rootRef =
    useRef(null);

  const triggerRef =
    useRef(null);

  const menuRef =
    useRef(null);

  const listRef =
    useRef(null);

  const pillRef =
    useRef(null);

  const instant =
    useRef(false);

  const closeTimer =
    useRef(undefined);

  const scrub =
    useRef(null);

  const id =
    useId();

  const currentSize =
    SIZES[size] ??
    SIZES.md;

  const step =
    currentSize.row +
    GAP;

  const popOut =
    Math.round(
      (popDuration * 2) /
        3,
    );


  // MARK: Menu layout

  useLayoutEffect(() => {
    if (
      phase !== 'open'
    ) {
      return;
    }

    const menu =
      menuRef.current;

    const root =
      rootRef.current;

    if (
      !menu ||
      !root
    ) {
      return;
    }

    const rootRect =
      root.getBoundingClientRect();


    /*
     * Сначала снимаем ограничения,
     * чтобы узнать настоящую ширину
     * самого длинного option.
     */
    menu.style.width =
      'max-content';

    menu.style.maxWidth =
      'none';

    menu.style.left =
      '0px';

    menu.style.right =
      'auto';

    delete menu.dataset.clamped;


    const optionElements =
      Array.from(
        menu.querySelectorAll(
          '.glide-select__option',
        ),
      );

    const contentWidth =
      optionElements.length
        ? Math.max(
            ...optionElements.map(
              (element) =>
                element.scrollWidth,
            ),
          )
        : 0;


    /*
     * menuWidth теперь minimum.
     */
    const naturalWidth =
      Math.ceil(
        Math.max(
          Number(
            menuWidth,
          ) || 0,

          rootRect.width,

          contentWidth +
            PAD * 2,
        ),
      );


    /*
     * Никогда не выходим
     * за границы viewport.
     */
    const viewportMaxWidth =
      Math.max(
        160,

        window.innerWidth -
          VIEWPORT_PADDING *
            2,
      );

    const configuredMaxWidth =
      Number(
        menuMaxWidth,
      ) > 0
        ? Math.min(
            Number(
              menuMaxWidth,
            ),

            viewportMaxWidth,
          )
        : viewportMaxWidth;

    const finalWidth =
      Math.min(
        naturalWidth,
        configuredMaxWidth,
      );


    /*
     * Если даже maximum не хватает,
     * включаем ellipsis.
     */
    if (
      naturalWidth >
      finalWidth
    ) {
      menu.dataset.clamped =
        '';
    }


    menu.style.width =
      `${finalWidth}px`;

    menu.style.maxWidth =
      `${configuredMaxWidth}px`;


    /*
     * Автоматически двигаем dropdown,
     * чтобы он не вылезал вправо/влево.
     */
    const preferredLeft =
      align === 'right'
        ? rootRect.width -
          finalWidth
        : 0;

    const preferredViewportLeft =
      rootRect.left +
      preferredLeft;

    const minViewportLeft =
      VIEWPORT_PADDING;

    const maxViewportLeft =
      Math.max(
        minViewportLeft,

        window.innerWidth -
          VIEWPORT_PADDING -
          finalWidth,
      );

    const viewportLeft =
      Math.min(
        Math.max(
          preferredViewportLeft,
          minViewportLeft,
        ),

        maxViewportLeft,
      );

    const relativeLeft =
      viewportLeft -
      rootRect.left;

    menu.style.left =
      `${relativeLeft}px`;

    menu.style.right =
      'auto';


    /*
     * Определяем сверху или снизу
     * открывать список.
     */
    const requiredHeight =
      menu.offsetHeight +
      MENU_GAP;

    setSide(
      placement ===
        'bottom' &&
        rootRect.bottom +
          requiredHeight >
          window.innerHeight

        ? 'top'

        : placement ===
              'top' &&
            rootRect.top -
              requiredHeight <
              0

          ? 'bottom'

          : placement,
    );


    // MARK: Animation

    menu.style.transitionDuration =
      instant.current
        ? '0ms'
        : '';

    menu.dataset.state =
      'closed';

    void menu.offsetHeight;

    menu.dataset.state =
      'open';


    // MARK: Pill

    const pill =
      pillRef.current;

    if (pill) {
      pill.style.transition =
        'none';

      pill.style.transform =
        `translateY(${
          Math.max(
            0,
            selected,
          ) * step
        }px)`;

      pill.style.opacity =
        '0';

      void pill.offsetHeight;

      pill.style.transition =
        '';
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    phase,
  ]);


  // MARK: Active pill

  useLayoutEffect(() => {
    const pill =
      pillRef.current;

    if (
      !pill ||
      phase !== 'open'
    ) {
      return;
    }

    if (
      active === null
    ) {
      pill.style.opacity =
        '0';

      return;
    }

    const jump =
      instant.current ||
      pill.style.opacity !==
        '1';

    pill.style.transitionDuration =
      jump
        ? '0ms, 150ms'
        : '';

    pill.style.transform =
      `translateY(${
        active * step
      }px)`;

    pill.style.opacity =
      '1';

    instant.current =
      false;


    /*
     * При управлении клавиатурой
     * прокручиваем активный пункт.
     */
    const list =
      listRef.current;

    const option =
      list?.querySelector(
        `[data-index="${active}"]`,
      );

    if (
      list &&
      option
    ) {
      const optionTop =
        option.offsetTop;

      const optionBottom =
        optionTop +
        option.offsetHeight;

      if (
        optionTop <
        list.scrollTop
      ) {
        list.scrollTop =
          optionTop;
      } else if (
        optionBottom >
        list.scrollTop +
          list.clientHeight
      ) {
        list.scrollTop =
          optionBottom -
          list.clientHeight;
      }
    }
  }, [
    active,
    phase,
    step,
  ]);


  // MARK: Open / close

  const open = (
    viaKey,
  ) => {
    if (disabled) {
      return;
    }

    clearTimeout(
      closeTimer.current,
    );

    instant.current =
      true;

    setActive(
      selected >= 0
        ? selected
        : viaKey
          ? 0
          : null,
    );

    setPhase(
      'open',
    );
  };


  const close = (
    mode,
  ) => {
    setActive(
      null,
    );

    clearTimeout(
      closeTimer.current,
    );

    const menu =
      menuRef.current;

    if (
      mode ===
        'instant' ||
      !menu
    ) {
      setPhase(
        'closed',
      );

      return;
    }

    menu.style.transitionDuration =
      '';

    menu.dataset.state =
      'closed';

    setPhase(
      'closing',
    );

    closeTimer.current =
      setTimeout(
        () =>
          setPhase(
            'closed',
          ),

        popOut + 20,
      );
  };


  // MARK: Pick

  const pick = (
    index,
    viaKey,
  ) => {
    const item =
      items[index];

    if (!item) {
      close(
        'instant',
      );

      return;
    }

    if (
      item.value !==
      current
    ) {
      if (
        value ===
        undefined
      ) {
        setInner(
          item.value,
        );
      }

      onChange?.(
        item.value,
        item,
      );

      if (
        !viaKey &&
        rootRef.current
      ) {
        rootRef.current.dataset.swap =
          '';
      }
    }

    close(
      'instant',
    );

    triggerRef.current?.focus({
      preventScroll: true,
    });
  };


  // MARK: Keyboard

  const onTriggerKey = (
    event,
  ) => {
    const key =
      event.key;

    const count =
      items.length;

    const currentIndex =
      active ??
      Math.max(
        0,
        selected,
      );

    if (
      phase !== 'open'
    ) {
      if (
        key === 'Enter' ||
        key === ' ' ||
        key ===
          'ArrowDown' ||
        key ===
          'ArrowUp'
      ) {
        event.preventDefault();

        open(
          true,
        );
      }

      return;
    }


    const go = (
      index,
    ) => {
      event.preventDefault();

      instant.current =
        true;

      setActive(
        Math.min(
          count - 1,

          Math.max(
            0,
            index,
          ),
        ),
      );
    };


    if (
      key ===
        'ArrowDown' ||
      key ===
        'ArrowUp'
    ) {
      go(
        active === null
          ? currentIndex
          : currentIndex +
              (key ===
              'ArrowDown'
                ? 1
                : -1),
      );
    } else if (
      key === 'Home' ||
      key === 'End'
    ) {
      go(
        key === 'Home'
          ? 0
          : count - 1,
      );
    } else if (
      key === 'Enter' ||
      key === ' '
    ) {
      event.preventDefault();

      pick(
        currentIndex,
        true,
      );
    } else if (
      key === 'Escape' ||
      key === 'Tab'
    ) {
      if (
        key === 'Escape'
      ) {
        event.preventDefault();
      }

      close(
        'instant',
      );
    } else if (
      key.length === 1 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      go(
        typeaheadIndex(
          items,
          currentIndex,
          key,
        ),
      );
    }
  };


  // MARK: Outside click

  useEffect(() => {
    if (
      phase ===
      'closed'
    ) {
      return undefined;
    }

    const onDown = (
      event,
    ) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target,
        )
      ) {
        close(
          'pop',
        );
      }
    };

    document.addEventListener(
      'pointerdown',
      onDown,
      true,
    );

    return () =>
      document.removeEventListener(
        'pointerdown',
        onDown,
        true,
      );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    phase,
  ]);


  // MARK: Disabled

  useEffect(() => {
    if (
      disabled &&
      phase !== 'closed'
    ) {
      close(
        'instant',
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    disabled,
  ]);


  // MARK: Cleanup

  useEffect(
    () => () =>
      clearTimeout(
        closeTimer.current,
      ),
    [],
  );


  // MARK: Pointer helpers

  const rowAt = (
    y,
  ) => {
    const state =
      scrub.current;

    if (!state) {
      return null;
    }

    const scrollTop =
      state.element
        ?.scrollTop || 0;

    const index =
      Math.floor(
        (
          y -
          state.top -
          PAD +
          scrollTop
        ) /
          step,
      );

    return (
      index >= 0 &&
      index <
        items.length
    )
      ? index
      : null;
  };


  const onListDown = (
    event,
  ) => {
    if (
      scrub.current
    ) {
      return;
    }

    try {
      event.currentTarget.setPointerCapture(
        event.pointerId,
      );
    } catch {
      // no-op
    }

    scrub.current = {
      id:
        event.pointerId,

      top:
        event.currentTarget
          .getBoundingClientRect()
          .top,

      element:
        event.currentTarget,
    };

    instant.current =
      true;

    setActive(
      rowAt(
        event.clientY,
      ),
    );
  };


  const onListMove = (
    event,
  ) => {
    if (
      !scrub.current ||
      scrub.current.id !==
        event.pointerId
    ) {
      return;
    }

    const index =
      rowAt(
        event.clientY,
      );

    if (
      index !==
      active
    ) {
      setActive(
        index,
      );
    }
  };


  const onListUp = (
    event,
  ) => {
    if (
      !scrub.current ||
      scrub.current.id !==
        event.pointerId
    ) {
      return;
    }

    const index =
      event.type ===
      'pointerup'
        ? rowAt(
            event.clientY,
          )
        : null;

    scrub.current =
      null;

    if (
      index !== null
    ) {
      pick(
        index,
        false,
      );
    } else if (
      !rememberPosition
    ) {
      setActive(
        null,
      );
    }
  };


  const onListOver = (
    event,
  ) => {
    if (
      event.pointerType ===
        'touch' ||
      scrub.current
    ) {
      return;
    }

    const row =
      event.target.closest(
        '[data-index]',
      );

    if (!row) {
      return;
    }

    const index =
      Number(
        row.dataset.index,
      );

    if (
      index !== active
    ) {
      setActive(
        index,
      );
    }
  };


  // MARK: Render

  const origin =
    `${
      side === 'bottom'
        ? 'top'
        : 'bottom'
    } ${align}`;

  return (
    <div
      ref={rootRef}
      className={[
        'glide-select',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-size={
        size
      }
      data-disabled={
        disabled
          ? ''
          : undefined
      }
      style={{
        '--gs-accent':
          accentColor,

        '--gs-surface':
          surfaceColor,

        '--gs-highlight':
          highlightColor,

        '--gs-text':
          textColor,

        '--gs-radius':
          `${radius}px`,

        '--gs-inner-radius':
          `${Math.max(
            3,
            radius - 4,
          )}px`,

        '--gs-chip':
          `${currentSize.chip}px`,

        '--gs-row':
          `${currentSize.row}px`,

        '--gs-font':
          `${currentSize.font}px`,

        '--gs-menu-w':
          `${menuWidth}px`,

        '--gs-menu-max-w':
          `${menuMaxWidth}px`,

        '--gs-menu-max-h':
          `${menuMaxHeight}px`,

        '--gs-pop':
          `${popDuration}ms`,

        '--gs-pop-out':
          `${popOut}ms`,

        '--gs-glide':
          `${glideDuration}ms`,

        '--gs-origin':
          origin,
      }}
      onAnimationEnd={(
        event,
      ) => {
        if (
          event.animationName ===
            'gs-swap' &&
          rootRef.current
        ) {
          delete rootRef.current.dataset.swap;
        }
      }}
    >
      <button
        ref={
          triggerRef
        }
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={
          phase ===
          'open'
        }
        aria-controls={
          `${id}-list`
        }
        aria-activedescendant={
          active !== null
            ? `${id}-${active}`
            : undefined
        }
        aria-label={
          ariaLabel
        }
        disabled={
          disabled
        }
        className="glide-select__trigger"
        onPointerDown={(
          event,
        ) => {
          if (
            event.button !==
              0 ||
            disabled
          ) {
            return;
          }

          event.currentTarget.focus({
            preventScroll: true,
          });

          if (
            phase ===
            'open'
          ) {
            close(
              'pop',
            );
          } else {
            open(
              false,
            );
          }
        }}
        onKeyDown={
          onTriggerKey
        }
      >
        <span
          className="glide-select__label"
          key={
            current
          }
          data-empty={
            selected < 0
              ? ''
              : undefined
          }
        >
          {selected >= 0
            ? items[selected]
                .label
            : placeholder}
        </span>

        <span
          className="glide-select__chevron"
          aria-hidden="true"
        >
          <HugeiconsIcon
            icon={
              ArrowDown01Icon
            }
            size={12}
            strokeWidth={
              2.5
            }
          />
        </span>
      </button>

      {phase !==
      'closed' ? (
        <div
          ref={
            menuRef
          }
          className="glide-select__menu"
          data-state="open"
          data-side={
            side
          }
          data-align={
            align
          }
        >
          <div
            ref={
              listRef
            }
            id={`${id}-list`}
            role="listbox"
            aria-label={
              ariaLabel
            }
            className="glide-select__list"
            data-live={
              active !== null
                ? ''
                : undefined
            }
            onPointerOver={
              onListOver
            }
            onPointerLeave={() => {
              if (
                !scrub.current &&
                !rememberPosition
              ) {
                setActive(
                  null,
                );
              }
            }}
            onPointerDown={
              onListDown
            }
            onPointerMove={
              onListMove
            }
            onPointerUp={
              onListUp
            }
            onPointerCancel={
              onListUp
            }
            onLostPointerCapture={
              onListUp
            }
          >
            <span
              ref={
                pillRef
              }
              className="glide-select__pill"
              aria-hidden="true"
            />

            {items.map(
              (
                item,
                index,
              ) => (
                <div
                  key={
                    item.value
                  }
                  id={`${id}-${index}`}
                  role="option"
                  aria-selected={
                    index ===
                    selected
                  }
                  data-index={
                    index
                  }
                  className="glide-select__option"
                >
                  <span className="glide-select__name">
                    {
                      item.label
                    }
                  </span>

                  {showTags &&
                  item.tag ? (
                    <span className="glide-select__tag">
                      {
                        item.tag
                      }
                    </span>
                  ) : null}

                  <span
                    className="glide-select__check"
                    data-on={
                      index ===
                      selected
                        ? ''
                        : undefined
                    }
                    aria-hidden="true"
                  >
                    <HugeiconsIcon
                      icon={
                        Tick02Icon
                      }
                      size={
                        13
                      }
                      strokeWidth={
                        2.5
                      }
                    />
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}