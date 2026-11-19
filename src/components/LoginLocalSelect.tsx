import React, { useEffect, useId, useRef, useState } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import { LocalEnsaio } from '../types/models';

// Only rendered on web. A portal keeps the menu clear of the login card's clipping.
export const LoginLocalSelect: React.FC<{
  value: string;
  disabled?: boolean;
  options: LocalEnsaio[];
  onChange: (value: string) => void;
}> = ({ value, options, onChange, disabled = false }) => {
  const entries = [{ id: '', nome: 'Local do Ensaio' }, ...options];
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const search = useRef({ text: '', time: 0 });
  const [position, setPosition] = useState<React.CSSProperties | null>(null);
  const [active, setActive] = useState(0);
  const open = !!position;
  useEffect(() => {
    if (disabled) setPosition(null);
  }, [disabled]);
  const selected = value ? entries.find(option => option.id === value) : undefined;
  const close = () => setPosition(null);
  const show = (
    index = Math.max(
      0,
      entries.findIndex(option => option.id === value)
    )
  ) => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom;
    const above = below < 180 && rect.top > below;
    const maxHeight = Math.min(280, Math.max(80, (above ? rect.top : below) - 12));
    setPosition({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      ...(above ? { bottom: window.innerHeight - rect.top + 5 } : { top: rect.bottom + 5 }),
      maxHeight,
    });
    setActive(index);
  };
  const choose = (index: number) => {
    if (!entries[index]) return;
    onChange(entries[index].id);
    close();
    trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !menu.current?.contains(event.target as Node)
      )
        close();
    };
    const scroll = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', scroll, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);

  return (
    <>
      <button
        disabled={disabled}
        ref={trigger}
        type="button"
        role="combobox"
        aria-label="Local do ensaio"
        aria-required="true"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-haspopup="listbox"
        aria-activedescendant={open && entries[active] ? `${id}-${active}` : undefined}
        onClick={() => (open ? close() : show())}
        onFocus={event => {
          event.currentTarget.style.outlineColor = '#9ec9ee';
        }}
        onBlur={event => {
          event.currentTarget.style.outlineColor = 'transparent';
        }}
        onKeyDown={event => {
          if (event.key === 'Escape' || event.key === 'Tab') {
            close();
            return;
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) show();
            else
              setActive(
                index =>
                  (index + (event.key === 'ArrowDown' ? 1 : -1) + entries.length) %
                  Math.max(1, entries.length)
              );
          } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (open) choose(active);
            else show();
          } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            const index = event.key === 'Home' ? 0 : Math.max(0, entries.length - 1);
            if (open) setActive(index);
            else show(index);
          } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const now = Date.now();
            search.current = {
              text:
                (now - search.current.time < 700 ? search.current.text : '') +
                event.key.toLocaleLowerCase(),
              time: now,
            };
            const index = entries.findIndex(option =>
              option.nome.toLocaleLowerCase().startsWith(search.current.text)
            );
            if (index >= 0) {
              if (open) setActive(index);
              else onChange(entries[index].id);
            }
          }
        }}
        style={{
          flex: 1,
          minWidth: 0,
          border: 0,
          background: '#ffffff',
          padding: '0 15px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          outline: '2px solid transparent',
          outlineOffset: -3,
          borderRadius: '0 10px 10px 0',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 15,
          textAlign: 'left',
          color: selected ? '#334155' : '#94a3b8',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.nome || 'Local do Ensaio'}
        </span>
        <FontAwesome5 solid name="chevron-down" size={10} color="#94a3b8" />
      </button>
      {position &&
        require('react-dom').createPortal(
          <div
            ref={menu}
            id={`${id}-list`}
            role="listbox"
            aria-label="Locais do ensaio"
            style={{
              ...position,
              zIndex: 10000,
              overflowY: 'auto',
              background: '#ffffff',
              border: '1px solid #dce5ee',
              borderRadius: 12,
              padding: 5,
              boxSizing: 'border-box',
              boxShadow: '0 10px 28px rgba(30,55,80,0.16)',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            {entries.map((option, index) => (
              <div
                key={option.id}
                id={`${id}-${index}`}
                role="option"
                aria-selected={option.id === value}
                onPointerDown={event => event.preventDefault()}
                onClick={() => choose(index)}
                onMouseEnter={() => setActive(index)}
                style={{
                  minHeight: 38,
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: '#334155',
                  background: index === active ? '#eef5fb' : '#ffffff',
                  fontSize: 14,
                  fontWeight: option.id === value ? 600 : 400,
                }}
              >
                <span style={{ width: 12, display: 'flex', justifyContent: 'center' }}>
                  {option.id && (
                    <FontAwesome5 solid name="map-marker-alt" size={13} color="#81909e" />
                  )}
                </span>
                <span style={{ flex: 1 }}>{option.nome}</span>
                {option.id === value && (
                  <FontAwesome5 solid name="check" size={11} color="#1e4b7a" />
                )}
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};
