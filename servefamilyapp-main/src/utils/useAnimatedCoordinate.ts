import { useEffect, useRef, useState } from "react";

type Coord = [number, number];
const easeInOutQuad = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export function useSmoothMarkerAnimation(coordinate: Coord, duration = 800) {
  const safeCoord: Coord =
    Array.isArray(coordinate) &&
    coordinate.length >= 2 &&
    Number.isFinite(Number(coordinate[0])) &&
    Number.isFinite(Number(coordinate[1]))
      ? [Number(coordinate[0]), Number(coordinate[1])]
      : [0, 0];

  const [animatedCoord, setAnimatedCoord] = useState<Coord>(safeCoord);
  const currentCoordRef = useRef<Coord>(safeCoord);
  const rafRef = useRef<number | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      currentCoordRef.current = safeCoord;
      return;
    }

    const from: Coord = [...(currentCoordRef.current || safeCoord)];
    const to: Coord = [safeCoord[0], safeCoord[1]];
    if (from[0] === to[0] && from[1] === to[1]) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const startTime = Date.now();

    const step = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeInOutQuad(t);
      const lng = from[0] + (to[0] - from[0]) * eased;
      const lat = from[1] + (to[1] - from[1]) * eased;

      currentCoordRef.current = [lng, lat];
      setAnimatedCoord([lng, lat]);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeCoord[0], safeCoord[1], duration]);

  return { coordinate: animatedCoord };
}