import React from 'react';

/**
 * 1. Chú chim đưa thư thông báo PolarisX (Messenger Bird)
 * Đại diện cho hệ thống Webhook & Cảnh báo tức thì Telegram/Email.
 */
export const MessengerBird: React.FC<{ size?: number; className?: string; ariaLabel?: string }> = ({
  size = 64,
  className = '',
  ariaLabel,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      role="img"
      aria-label={ariaLabel ?? "PolarisX messenger bird"}
    >
      <ellipse cx="50" cy="52" rx="30" ry="24" fill="#0EA5E9" />
      <circle cx="68" cy="40" r="16" fill="#38BDF8" />
      <polygon points="80,40 94,44 80,48" fill="#F59E0B" />
      <circle cx="72" cy="38" r="3.5" fill="#0F172A" />
      <circle cx="73" cy="37" r="1.2" fill="#FFFFFF" />
      {/* Cánh vỗ nhẹ */}
      <path
        d="M 32 50 C 20 40, 25 22, 45 32 C 40 45, 36 50, 32 50 Z"
        fill="#0284C7"
        className="animate-[pulse_1.5s_ease-in-out_infinite]"
      />
      {/* Lá thư ngậm ở mỏ */}
      <rect x="76" y="46" width="14" height="10" rx="1.5" fill="#FFFFFF" stroke="#0284C7" strokeWidth="1" />
      <path d="M 76 46 L 83 52 L 90 46" stroke="#0284C7" strokeWidth="1" />
    </svg>
  );
};

/**
 * 2. Nữ tư vấn viên tuyển sinh (Recruiter Character)
 */
export const RecruiterCharacter: React.FC<{ size?: number; className?: string; ariaLabel?: string }> = ({
  size = 76,
  className = '',
  ariaLabel,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      role="img"
      aria-label={ariaLabel ?? "Sales rep"}
    >
      <circle cx="50" cy="95" r="35" fill="#4338CA" />
      {/* Khuôn mặt */}
      <ellipse cx="50" cy="45" rx="18" ry="20" fill="#FED7AA" />
      {/* Tóc */}
      <path d="M 30 42 C 30 24, 70 24, 70 42 C 70 52, 66 56, 66 56 C 66 56, 34 56, 34 56 C 34 56, 30 52, 30 42 Z" fill="#78350F" />
      {/* Đôi mắt & Kính/Nụ cười */}
      <circle cx="43" cy="44" r="2.5" fill="#0F172A" />
      <circle cx="57" cy="44" r="2.5" fill="#0F172A" />
      <path d="M 46 52 Q 50 56 54 52" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Headset tư vấn */}
      <path d="M 32 44 C 32 28, 68 28, 68 44" stroke="#2563EB" strokeWidth="3" fill="none" />
      <rect x="29" y="40" width="5" height="10" rx="2" fill="#2563EB" />
      <path d="M 31 48 Q 36 60 45 58" stroke="#2563EB" strokeWidth="2" fill="none" />
      <circle cx="46" cy="58" r="2" fill="#0284C7" />
    </svg>
  );
};

/**
 * 3. Thí sinh / Học viên (Student Character)
 */
export const StudentCharacter: React.FC<{ size?: number; className?: string; ariaLabel?: string }> = ({
  size = 76,
  className = '',
  ariaLabel,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      role="img"
      aria-label={ariaLabel ?? "Customer"}
    >
      <circle cx="50" cy="95" r="35" fill="#0284C7" />
      {/* Khuôn mặt */}
      <ellipse cx="50" cy="46" rx="17" ry="19" fill="#FDE68A" />
      {/* Mũ tốt nghiệp / Tóc ngắn */}
      <path d="M 32 40 C 34 26, 66 26, 68 40 C 62 34, 38 34, 32 40 Z" fill="#1E293B" />
      {/* Mắt kính trí tuệ */}
      <rect x="36" y="40" width="11" height="8" rx="2" stroke="#0F172A" strokeWidth="1.8" fill="rgba(255,255,255,0.4)" />
      <rect x="53" y="40" width="11" height="8" rx="2" stroke="#0F172A" strokeWidth="1.8" fill="rgba(255,255,255,0.4)" />
      <line x1="47" y1="44" x2="53" y2="44" stroke="#0F172A" strokeWidth="1.8" />
      <circle cx="41.5" cy="44" r="1.8" fill="#0F172A" />
      <circle cx="58.5" cy="44" r="1.8" fill="#0F172A" />
      <path d="M 46 54 Q 50 58 54 54" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* Balo học sinh */}
      <rect x="22" y="68" width="10" height="20" rx="4" fill="#F59E0B" />
    </svg>
  );
};
