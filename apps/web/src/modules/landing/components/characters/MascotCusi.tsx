import React, { useMemo } from 'react';

export interface MascotCusiProps {
  mood?: 'idle' | 'waving' | 'celebrating' | 'typing';
  eyeTarget?: { x: number; y: number };
  size?: number;
  className?: string;
  showSpeechBubble?: boolean;
  speechText?: string;
}

/**
 * Mascot Cusi: Robot trợ lý AI nguyên bản của PolarisX CRM
 * Thiết kế Flat Vector cao cấp, mắt tương tác theo tọa độ chuột và các trạng thái động.
 */
export const MascotCusi: React.FC<MascotCusiProps> = ({
  mood = 'idle',
  eyeTarget,
  size = 180,
  className = '',
  showSpeechBubble = false,
  speechText = 'Xin chào! Mình là Cusi 👋',
}) => {
  // Tính toán góc nhìn của mắt theo tọa độ chuột (giới hạn tối đa 5px)
  const eyeOffset = useMemo(() => {
    if (!eyeTarget) return { x: 0, y: 0 };
    const maxOffset = 4.5;
    const clampedX = Math.max(-maxOffset, Math.min(maxOffset, eyeTarget.x * maxOffset));
    const clampedY = Math.max(-maxOffset, Math.min(maxOffset, eyeTarget.y * maxOffset));
    return { x: clampedX, y: clampedY };
  }, [eyeTarget]);

  const isWaving = mood === 'waving';
  const isCelebrating = mood === 'celebrating';
  const isTyping = mood === 'typing';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Mascot Robot Cusi PolarisX"
    >
      {/* Bong bóng thoại nhỏ nổi phía trên */}
      {showSpeechBubble && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap bg-white/95 backdrop-blur-md border border-blue-200/90 shadow-md text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full pointer-events-none animate-bounce">
          {speechText}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/95 border-b border-r border-blue-200/90 rotate-45" />
        </div>
      )}

      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full drop-shadow-lg transition-transform duration-300 ${
          isCelebrating ? 'animate-bounce' : 'animate-[float_3.5s_ease-in-out_infinite]'
        }`}
      >
        <defs>
          {/* Gradients cho thân robot */}
          <linearGradient id="cusiBodyGrad" x1="50" y1="30" x2="150" y2="170" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="0.6" stopColor="#F0F9FF" />
            <stop offset="1" stopColor="#E0F2FE" />
          </linearGradient>

          {/* Gradients cho mặt kính visor */}
          <linearGradient id="cusiVisorGrad" x1="60" y1="65" x2="140" y2="125" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0F172A" />
            <stop offset="1" stopColor="#1E293B" />
          </linearGradient>

          {/* Ánh sáng Cyan cho mắt LED */}
          <linearGradient id="cusiEyeGlow" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#38BDF8" />
            <stop offset="1" stopColor="#0284C7" />
          </linearGradient>

          {/* Gradient tai nghe headphone */}
          <linearGradient id="cusiHeadsetGrad" x1="30" y1="50" x2="170" y2="130" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2563EB" />
            <stop offset="1" stopColor="#1D4ED8" />
          </linearGradient>

          <filter id="cusiGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Bóng đổ nền dưới chân robot */}
        <ellipse cx="100" cy="186" rx="42" ry="7" fill="rgba(15, 23, 42, 0.12)" />

        {/* --- Antenna phát sóng định tuyến --- */}
        <line x1="100" y1="32" x2="100" y2="16" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="14" r="6" fill="#38BDF8" filter="url(#cusiGlow)" className="animate-pulse" />

        {/* --- Tai nghe Headset Quàng qua đầu --- */}
        <path
          d="M 44 82 C 44 42, 156 42, 156 82"
          stroke="url(#cusiHeadsetGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />

        {/* Cục tai nghe trái */}
        <rect x="36" y="70" width="12" height="28" rx="6" fill="url(#cusiHeadsetGrad)" />
        {/* Cục tai nghe phải */}
        <rect x="152" y="70" width="12" height="28" rx="6" fill="url(#cusiHeadsetGrad)" />

        {/* Mic đàm thoại tư vấn viên */}
        <path d="M 42 90 Q 55 122 80 120" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="82" cy="120" r="4" fill="#2563EB" />

        {/* --- Thân chính tròn trịa (Body Capsule) --- */}
        <rect
          x="48"
          y="34"
          width="104"
          height="124"
          rx="52"
          fill="url(#cusiBodyGrad)"
          stroke="#BAE6FD"
          strokeWidth="2.5"
        />

        {/* Điểm nhấn thương hiệu PolarisX trên ngực */}
        <g transform="translate(88, 126)">
          <path d="M4 4 L16 16 M16 4 L4 16" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="10" cy="10" r="2.5" fill="#38BDF8" />
        </g>

        {/* --- Mặt kính Visor tối màu (Display Screen) --- */}
        <rect x="58" y="58" width="84" height="54" rx="22" fill="url(#cusiVisorGrad)" stroke="#334155" strokeWidth="2" />

        {/* Ánh sáng phản chiếu kính Visor */}
        <path d="M 66 65 Q 100 62 126 70" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />

        {/* --- Đôi mắt LED tương tác (Animated & Mouse Tracking) --- */}
        <g transform={`translate(${eyeOffset.x}, ${eyeOffset.y})`}>
          {/* Mắt trái */}
          <ellipse
            cx="80"
            cy="84"
            rx="7.5"
            ry={isCelebrating ? 3 : 9}
            fill="url(#cusiEyeGlow)"
            filter="url(#cusiGlow)"
          />
          {/* Đốm sáng phản chiếu mắt trái */}
          <circle cx="78" cy="81" r="2.5" fill="#FFFFFF" />

          {/* Mắt phải */}
          <ellipse
            cx="120"
            cy="84"
            rx="7.5"
            ry={isCelebrating ? 3 : 9}
            fill="url(#cusiEyeGlow)"
            filter="url(#cusiGlow)"
          />
          {/* Đốm sáng phản chiếu mắt phải */}
          <circle cx="118" cy="81" r="2.5" fill="#FFFFFF" />
        </g>

        {/* Má hồng dễ thương */}
        <circle cx="71" cy="98" r="4.5" fill="#FB7185" opacity="0.45" />
        <circle cx="129" cy="98" r="4.5" fill="#FB7185" opacity="0.45" />

        {/* Nụ cười LED */}
        <path
          d={isCelebrating ? 'M 93 96 Q 100 105 107 96' : 'M 95 97 Q 100 102 105 97'}
          stroke="#38BDF8"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* --- Cánh tay trái --- */}
        <g
          className={
            isWaving
              ? 'animate-[wave_1.2s_ease-in-out_infinite] origin-[38px_105px]'
              : isTyping
              ? 'animate-[typing_0.6s_ease-in-out_infinite] origin-[38px_105px]'
              : ''
          }
        >
          <rect
            x="32"
            y={isWaving ? '75' : '100'}
            width="14"
            height="32"
            rx="7"
            fill="url(#cusiBodyGrad)"
            stroke="#BAE6FD"
            strokeWidth="2"
            transform={isWaving ? 'rotate(-35 32 75)' : undefined}
          />
        </g>

        {/* --- Cánh tay phải --- */}
        <g
          className={
            isTyping
              ? 'animate-[typing_0.6s_ease-in-out_infinite_0.3s] origin-[162px_105px]'
              : isCelebrating
              ? 'animate-[wave_1s_ease-in-out_infinite_reverse] origin-[162px_85px]'
              : ''
          }
        >
          <rect
            x="154"
            y={isCelebrating ? '75' : '100'}
            width="14"
            height="32"
            rx="7"
            fill="url(#cusiBodyGrad)"
            stroke="#BAE6FD"
            strokeWidth="2"
            transform={isCelebrating ? 'rotate(35 154 75)' : undefined}
          />
        </g>

        {/* Pháo giấy mini chúc mừng nếu đang celebration */}
        {isCelebrating && (
          <g>
            <circle cx="45" cy="40" r="3" fill="#F43F5E" />
            <rect x="145" y="35" width="5" height="5" fill="#EAB308" transform="rotate(45 145 35)" />
            <circle cx="165" cy="55" r="2.5" fill="#3B82F6" />
            <rect x="30" y="60" width="4" height="4" fill="#10B981" />
          </g>
        )}
      </svg>
    </div>
  );
};
