"use client";

import { useState, type DragEvent } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

export type SortableOrderItem = {
  id: string;
  label: string;
  meta?: string;
};

type SortableOrderListProps = {
  items: SortableOrderItem[];
  /** Name of the hidden input carrying the ordered id list as JSON. */
  inputName?: string;
};

/** Move the element at `from` to `to` within a copy of `arr`. */
function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Reorderable list for admin sort-order panels — up/down buttons plus native
 * HTML5 drag-and-drop. Writes the ordered id list into a hidden input so the
 * enclosing server-action <form> picks it up on submit.
 */
export function SortableOrderList({ items, inputName = "_orderedIds" }: SortableOrderListProps) {
  const [order, setOrder] = useState(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => moveItem(prev, index, target));
  }

  function handleDragStart(index: number) {
    return (e: DragEvent<HTMLLIElement>) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
    };
  }

  function handleDragOver(index: number) {
    return (e: DragEvent<HTMLLIElement>) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === index) return;
      setOrder((prev) => moveItem(prev, dragIndex, index));
      setDragIndex(index);
    };
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  return (
    <ul className="grid gap-2">
      <input type="hidden" name={inputName} value={JSON.stringify(order.map((i) => i.id))} />
      {order.map((item, index) => (
        <li
          key={item.id}
          draggable
          onDragStart={handleDragStart(index)}
          onDragOver={handleDragOver(index)}
          onDrop={(e) => e.preventDefault()}
          onDragEnd={handleDragEnd}
          className="flex items-center gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2"
          style={{ opacity: dragIndex === index ? 0.5 : 1 }}
        >
          <span className="cursor-grab text-[var(--color-text-muted)]" aria-hidden>
            <GripVertical className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-portal-compact text-[var(--color-text-body)]" title={item.label}>{item.label}</p>
            {item.meta ? (
              <p className="m-0 truncate text-portal-thead text-[var(--color-text-muted)]" title={item.meta}>{item.meta}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={`Move ${item.label} up`}
              className="gh-icon-btn inline-flex items-center justify-center disabled:cursor-default disabled:opacity-35"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ChevronUp className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={`Move ${item.label} down`}
              className="gh-icon-btn inline-flex items-center justify-center disabled:cursor-default disabled:opacity-35"
              disabled={index === order.length - 1}
              onClick={() => move(index, 1)}
            >
              <ChevronDown className="size-3.5" aria-hidden />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
