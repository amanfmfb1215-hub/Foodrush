import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Order } from '../types';

export default function CustomerOrderETA({ order }: { order: Order }) {
  // Determine base ETA depending on order status.
  // We'll calculate a mock time in seconds left.
  const [secondsLeft, setSecondsLeft] = useState(() => {
    switch (order.status) {
      case 'placed':
        return 45 * 60; // 45 mins
      case 'accepted':
        return 35 * 60; // 35 mins
      case 'preparing':
        return 20 * 60; // 20 mins
      case 'ready':
        return 15 * 60; // 15 mins
      case 'dispatched':
        return 12 * 60; // 12 mins
      case 'picked_up':
        return 8 * 60; // 8 mins
      case 'delivered':
      case 'cancelled':
        return 0; // done
      default:
        return 25 * 60;
    }
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  if (order.status === 'delivered' || order.status === 'cancelled') {
    return null;
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-red-700 shadow-sm self-start">
      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center border border-red-200">
        <Clock className="w-5 h-5 text-red-600 animate-pulse" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest text-red-800/70">Est. Arrival Time</span>
        <span className="text-2xl font-black font-mono leading-none mt-0.5 tracking-tight">
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
