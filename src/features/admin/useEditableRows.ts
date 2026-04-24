import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tracks a list of rows as they're being edited in an admin grid.
 * Compares each row by `key(row)` against the initial snapshot to
 * report which rows are dirty.
 */
export function useEditableRows<T extends Record<string, unknown>>(
  initial: T[],
  key: (row: T) => string,
) {
  const [rows, setRows] = useState<T[]>(initial);
  const initialRef = useRef<Map<string, T>>(new Map());

  useEffect(() => {
    setRows(initial);
    initialRef.current = new Map(initial.map((r) => [key(r), r]));
  }, [initial, key]);

  const updateRow = useCallback(
    (k: string, patch: Partial<T>) => {
      setRows((rs) => rs.map((r) => (key(r) === k ? { ...r, ...patch } : r)));
    },
    [key],
  );

  const addRow = useCallback((row: T) => {
    setRows((rs) => [...rs, row]);
  }, []);

  const removeRow = useCallback(
    (k: string) => {
      setRows((rs) => rs.filter((r) => key(r) !== k));
    },
    [key],
  );

  const dirtyRows = rows.filter((r) => {
    const orig = initialRef.current.get(key(r));
    if (!orig) return true;
    return JSON.stringify(orig) !== JSON.stringify(r);
  });
  const isDirty = dirtyRows.length > 0;

  return { rows, setRows, updateRow, addRow, removeRow, dirtyRows, isDirty };
}
