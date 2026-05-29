import React, { useState, useEffect } from 'react';

export default function OrderTimer({ initialMinutes }: { initialMinutes: number }) {
  const [seconds, setSeconds] = useState(initialMinutes * 60);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => {
      setSeconds(s => s - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <span className="font-mono text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
}
