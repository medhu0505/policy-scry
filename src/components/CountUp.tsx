import { useEffect, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}

export function CountUp({ value, duration = 900, className, format }: Props) {
  const [n, setN] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const to = value;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const display = format ? format(n) : Math.round(n).toString();
  return <span className={className}>{display}</span>;
}
