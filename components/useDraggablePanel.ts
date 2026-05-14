"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";

type Offset = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  originX: number;
  originY: number;
  startClientX: number;
  startClientY: number;
};

const FALLBACK_OFFSET: Offset = { x: 0, y: 0 };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampOffset(next: Offset): Offset {
  if (typeof window === "undefined") {
    return next;
  }

  // Keep panel reachable even after dragging far away.
  const maxX = Math.max(window.innerWidth - 120, 120);
  const maxY = Math.max(window.innerHeight - 120, 120);

  return {
    x: clamp(next.x, -maxX, maxX),
    y: clamp(next.y, -maxY, maxY),
  };
}

export function useDraggablePanel(storageKey: string) {
  const [offset, setOffset] = useState<Offset>(FALLBACK_OFFSET);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<Offset>;
      if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return;
      setOffset(clampOffset({ x: parsed.x, y: parsed.y }));
    } catch {
      setOffset(FALLBACK_OFFSET);
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(offset));
  }, [offset, storageKey]);

  const stopDragging = (pointerId: number) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== pointerId) return;
    dragStateRef.current = null;
    setIsDragging(false);
  };

  const handleProps = useMemo(
    () => ({
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        dragStateRef.current = {
          pointerId: event.pointerId,
          originX: offset.x,
          originY: offset.y,
          startClientX: event.clientX,
          startClientY: event.clientY,
        };
        setIsDragging(true);
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const dragState = dragStateRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) return;

        const deltaX = event.clientX - dragState.startClientX;
        const deltaY = event.clientY - dragState.startClientY;
        setOffset(
          clampOffset({
            x: dragState.originX + deltaX,
            y: dragState.originY + deltaY,
          })
        );
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        stopDragging(event.pointerId);
      },
      onPointerCancel: (event: PointerEvent<HTMLElement>) => {
        stopDragging(event.pointerId);
      },
    }),
    [offset.x, offset.y]
  );

  return {
    panelStyle: {
      transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    },
    isDragging,
    handleProps,
  };
}
