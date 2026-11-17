import React, { useEffect, useRef, useState } from 'react';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Độ trễ (ms) để các phần tử cùng nhóm xuất hiện lần lượt. */
  delay?: number;
  /** Fade Up là mặc định; Slide In phù hợp với khối nội dung đặt cạnh nhau. */
  variant?: 'fade-up' | 'slide-left' | 'slide-right';
}

/**
 * Hiệu ứng khi lướt: Fade Up / Slide In, có thể chạy lại khi vào khung nhìn.
 * Tự tắt khi người dùng bật "giảm chuyển động".
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  className = '',
  delay = 0,
  variant = 'fade-up',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    const reduced =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!node || reduced || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const hiddenPosition =
    variant === 'slide-left'
      ? '-translate-x-5'
      : variant === 'slide-right'
        ? 'translate-x-5'
        : 'translate-y-5';
  const visiblePosition = variant === 'fade-up' ? 'translate-y-0' : 'translate-x-0';

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
      className={`transition-[opacity,transform,filter] duration-700 ease-out motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 ${
        visible
          ? `${visiblePosition} opacity-100 blur-0`
          : `${hiddenPosition} opacity-0 blur-[2px]`
      } ${className}`}
    >
      {children}
    </div>
  );
};
