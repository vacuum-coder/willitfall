// «Свой размер»: the user's own measurements. Fields start empty — no invented example numbers.

import { useState, type CSSProperties } from 'react';
import { C, fs, sp, R, H, button, selectStyle } from './ds';
import { Chevron } from './icons';
import { useRoom } from '../state/RoomContext';
import { KIND_LABEL } from '../data/furniture';
import type { FurnitureKind } from '../physics/types';

const KINDS: FurnitureKind[] = ['wardrobe', 'bookshelf', 'dresser', 'fridge', 'mirror', 'wallUnit', 'nightstand', 'tv', 'wallShelf', 'picture', 'vase'];

const field: CSSProperties = {
  width: '100%', height: H.lg, boxSizing: 'border-box', padding: sp(0, 10), border: `1px solid ${C.borderStrong}`,
  borderRadius: R.md, background: C.surface, ...fs(14), color: C.text,
};
const label: CSSProperties = { display: 'flex', flexDirection: 'column', gap: sp(4), ...fs(12), fontWeight: 600, color: C.text2 };

export function CustomItemForm({ kind: initial, onClose }: { kind: FurnitureKind; onClose: () => void }) {
  const { dispatch } = useRoom();
  const [kind, setKind] = useState<FurnitureKind>(initial);
  const [w, setW] = useState(''), [d, setD] = useState(''), [h, setH] = useState('');
  const n = (s: string) => Number(s.replace(',', '.'));
  const ok = [w, d, h].every((s) => s.trim() !== '' && n(s) >= 10) && n(h) <= 300;

  return (
    <form
      aria-label="Свой предмет"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ok) return;
        dispatch({ type: 'ADD_ITEM', custom: { kind, name: KIND_LABEL[kind], w: n(w), d: n(d), height: n(h) } });
        onClose();
      }}
      style={{ marginTop: sp(12), paddingTop: sp(12), borderTop: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: sp(8) }}
    >
      <label style={{ ...label, gridColumn: '1 / -1' }}>
        Что это
        <span style={{ position: 'relative' }}>
          <select value={kind} onChange={(e) => setKind(e.target.value as FurnitureKind)} style={{ ...selectStyle, width: '100%' }}>
            {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
          <Chevron />
        </span>
      </label>
      <label style={label}>Ширина, см<input inputMode="decimal" placeholder="замер" value={w} onChange={(e) => setW(e.target.value)} style={field} /></label>
      <label style={label}>Глубина, см<input inputMode="decimal" placeholder="замер" value={d} onChange={(e) => setD(e.target.value)} style={field} /></label>
      <label style={label}>Высота, см<input inputMode="decimal" placeholder="замер" value={h} onChange={(e) => setH(e.target.value)} style={field} /></label>
      <p style={{ gridColumn: '1 / -1', margin: 0, ...fs(12), color: C.text2 }}>Измерьте рулеткой: от 10 до 300 см. Глубина — от стены до дверцы.</p>
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: sp(8) }}>
        <button type="submit" disabled={!ok} style={{ ...button.primary, flex: 1, opacity: ok ? 1 : 0.5 }}>Добавить</button>
        <button type="button" onClick={onClose} style={button.secondary}>Отмена</button>
      </div>
    </form>
  );
}
