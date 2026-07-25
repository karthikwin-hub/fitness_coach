"use client";

import { useRef, type ReactNode } from "react";

type DragReorderListProps<T> = {
  items: T[];
  onReorder: (items: T[]) => void;
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
};

export function DragReorderList<T>({
  items,
  onReorder,
  keyExtractor,
  renderItem,
  className,
}: DragReorderListProps<T>) {
  const dragIndex = useRef<number | null>(null);

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(index, 0, moved);
    dragIndex.current = index;
    onReorder(next);
  }

  function handleDragEnd() {
    dragIndex.current = null;
  }

  return (
    <ul className={className ?? "space-y-2"}>
      {items.map((item, index) => (
        <li
          key={keyExtractor(item, index)}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className="flex items-stretch gap-2"
        >
          <span
            className="flex w-8 shrink-0 cursor-grab items-center justify-center rounded-lg border border-white/10 bg-black/20 text-xs text-white/40 active:cursor-grabbing"
            aria-hidden
          >
            ⋮⋮
          </span>
          <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
        </li>
      ))}
    </ul>
  );
}
