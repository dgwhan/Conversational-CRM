import { useState, useEffect } from 'react';

/**
 * Hook theo dõi tọa độ con trỏ chuột chuẩn hóa (-1 đến 1)
 */
export function useMouseTarget() {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    let frameId: number;

    const handleMouseMove = (event: MouseEvent) => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const { innerWidth, innerHeight } = window;
        const normalizedX = (event.clientX / innerWidth) * 2 - 1;
        const normalizedY = (event.clientY / innerHeight) * 2 - 1;
        setMousePosition({ x: normalizedX, y: normalizedY });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return mousePosition;
}

/**
 * Hook tính toán tiến độ cuộn trang (0% đến 100%)
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const currentProgress = (window.scrollY / totalScroll) * 100;
        setProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return progress;
}

/**
 * Hook quản lý Dark / Light mode cho Landing Page
 */
export function useLandingTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('polarisx_landing_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('polarisx_landing_theme', next ? 'dark' : 'light');
      } catch { }
      return next;
    });
  };

  return { isDark, toggleTheme };
}
