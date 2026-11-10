import React from 'react';

export interface MascotCusiLegalProps {
  variant: 'privacy' | 'terms';
  size?: number;
  className?: string;
}

/**
 * Linh vật Cusi phiên bản Pháp lý:
 * - Variant 'privacy': Cusi cầm khiên bảo mật phát sáng ánh xanh cyan
 * - Variant 'terms': Cusi cầm cuộn văn bản điều khoản pháp lý có con dấu
 */
export const MascotCusiLegal: React.FC<MascotCusiLegalProps> = ({
  variant,
  size = 110,
  className = '',
}) => {
  const isPrivacy = variant === 'privacy';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none animate-[pulse_4s_ease-in-out_infinite] ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        isPrivacy
          ? 'Linh vật Cusi bảo vệ an toàn thông tin'
          : 'Linh vật Cusi xác thực điều khoản dịch vụ'
      }
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 140 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        <defs>
          {/* Gradient thân robot */}
          <linearGradient id="legalCusiBody" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>

          {/* Gradient màn hình kính */}
          <linearGradient id="legalCusiVisor" x1="30" y1="35" x2="90" y2="75" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>

          {/* Gradient khiên bảo mật */}
          <linearGradient id="legalShieldGrad" x1="85" y1="45" x2="125" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* Gradient giấy văn bản */}
          <linearGradient id="legalDocGrad" x1="85" y1="50" x2="120" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
        </defs>

        {/* 1. Ăng-ten và tai nghe Headset */}
        <line x1="60" y1="18" x2="60" y2="28" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="16" r="4" fill="#3B82F6" className="animate-ping" opacity="0.75" />
        <circle cx="60" cy="16" r="3.5" fill="#2563EB" />

        {/* Headphone Band */}
        <path d="M 28 50 C 28 26, 92 26, 92 50" stroke="#3B82F6" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* Tai nghe trái */}
        <rect x="23" y="44" width="7" height="18" rx="3.5" fill="#1D4ED8" />

        {/* 2. Thân / Đầu tròn của Robot Cusi */}
        <circle cx="60" cy="55" r="34" fill="url(#legalCusiBody)" stroke="#E2E8F0" strokeWidth="2" />

        {/* 3. Màn hình visor LED */}
        <rect x="36" y="42" width="48" height="26" rx="13" fill="url(#legalCusiVisor)" />

        {/* Mắt LED xanh cyan phát sáng */}
        <ellipse cx="50" cy="54" rx="4" ry="5.5" fill="#38BDF8" />
        <circle cx="51.5" cy="52" r="1.5" fill="#FFFFFF" />
        <ellipse cx="70" cy="54" rx="4" ry="5.5" fill="#38BDF8" />
        <circle cx="71.5" cy="52" r="1.5" fill="#FFFFFF" />

        {/* Má hồng công nghệ */}
        <ellipse cx="43" cy="61" rx="2.5" ry="1.2" fill="#F472B6" opacity="0.6" />
        <ellipse cx="77" cy="61" rx="2.5" ry="1.2" fill="#F472B6" opacity="0.6" />

        {/* Miệng cười nhỏ thân thiện */}
        <path d="M 56 61 Q 60 64 64 61" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" fill="none" />

        {/* Thân áo cổ robot */}
        <ellipse cx="60" cy="94" rx="26" ry="16" fill="url(#legalCusiBody)" stroke="#E2E8F0" strokeWidth="2" />
        <rect x="52" y="85" width="16" height="5" rx="2.5" fill="#3B82F6" />

        {/* Tay trái */}
        <path d="M 38 88 C 26 94, 28 108, 40 102" stroke="#CBD5E1" strokeWidth="5.5" strokeLinecap="round" fill="none" />

        {/* 4. Vật phẩm cầm trên tay phải: KHIÊN BẢO MẬT (Privacy) hoặc TÀI LIỆU (Terms) */}
        {isPrivacy ? (
          // Khiên bảo vệ thông tin
          <g className="animate-[bounce_3s_ease-in-out_infinite]">
            {/* Cánh tay cầm khiên */}
            <path d="M 82 86 C 92 88, 96 95, 102 92" stroke="#CBD5E1" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            {/* Chiếc khiên */}
            <path
              d="M 104 60 L 124 66 C 124 88, 114 104, 104 110 C 94 104, 84 88, 84 66 Z"
              fill="url(#legalShieldGrad)"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            {/* Biểu tượng ổ khóa / dấu tích trên khiên */}
            <path
              d="M 98 84 L 103 89 L 112 78"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ) : (
          // Cuộn văn bản Điều khoản pháp lý
          <g className="animate-[bounce_3s_ease-in-out_infinite]">
            {/* Cánh tay cầm tài liệu */}
            <path d="M 82 86 C 90 88, 94 94, 100 90" stroke="#CBD5E1" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            {/* Tờ văn bản */}
            <rect
              x="86"
              y="62"
              width="32"
              height="42"
              rx="3"
              fill="url(#legalDocGrad)"
              stroke="#94A3B8"
              strokeWidth="1.5"
              transform="rotate(6 86 62)"
            />
            {/* Các dòng chữ tượng trưng */}
            <line x1="93" y1="72" x2="111" y2="74" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="93" y1="78" x2="108" y2="80" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="93" y1="84" x2="112" y2="86" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="93" y1="90" x2="105" y2="92" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
            {/* Con dấu tròn màu đỏ hợp lệ */}
            <circle cx="107" cy="95" r="4.5" fill="#EF4444" opacity="0.85" />
            <path d="M 105 95 L 106.5 96.5 L 109 93.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
};
