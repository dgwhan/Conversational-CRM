import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal.js';

const CONTENT = {
  headline: 'Quy trình vận hành thống nhất',
  supporting:
    'Hợp nhất toàn bộ điểm chạm khách hàng trên một nền tảng duy nhất — sẵn sàng mở rộng theo quy mô doanh nghiệp.',
  steps: [
    {
      id: 1,
      title: 'Hợp nhất hội thoại đa kênh',
      description:
        'Tập trung toàn bộ luồng tương tác từ mọi kênh giao tiếp của doanh nghiệp vào một không gian làm việc đồng bộ, loại bỏ tình trạng phân mảnh dữ liệu.',
    },
    {
      id: 2,
      title: 'Nhận diện và phân loại ngữ cảnh',
      description:
        'Tự động đồng bộ hồ sơ khách hàng xuyên suốt các điểm chạm, ghi nhận nhu cầu và mức độ ưu tiên ngay khi hội thoại phát sinh.',
    },
    {
      id: 3,
      title: 'Điều phối và cộng tác nội bộ',
      description:
        'Phân bổ đúng người phụ trách theo quy tắc vận hành, cho phép đội ngũ phối hợp xử lý liền mạch trong cùng một luồng hội thoại.',
    },
    {
      id: 4,
      title: 'Quản trị vòng đời cơ hội bán hàng',
      description:
        'Chuyển hóa trực tiếp các tương tác thành cơ hội kinh doanh, theo dõi sát sao từng giai đoạn từ lúc tư vấn đến khi chốt giao dịch.',
    },
    {
      id: 5,
      title: 'Kiểm soát chất lượng và cam kết phản hồi',
      description:
        'Đo lường thời gian xử lý theo thời gian thực và kích hoạt cảnh báo tự động, đảm bảo không bỏ sót bất kỳ khách hàng tiềm năng nào.',
    },
  ],
  cta: 'Xem trải nghiệm thực tế',
} as const;

/** A concise process overview with a sticky summary and scannable steps. */
export const HowItWorksSection: React.FC<{ isDark?: boolean }> = ({ isDark: _isDark = false }) => (
  <section
    id="how-it-works"
    aria-labelledby="how-heading"
    className="bg-white py-20 font-['Roboto',ui-sans-serif,system-ui,sans-serif] sm:py-28 landing-dark:bg-[#081628]"
  >
    <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
      <Reveal className="lg:sticky lg:top-24 lg:col-span-5 lg:self-start">
        <h2
          id="how-heading"
          className="max-w-lg text-4xl font-bold leading-[1.08] tracking-[-0.025em] text-[#0B1F3A] text-balance landing-dark:text-white"
          style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", fontWeight: 800 }}
        >
          {CONTENT.headline}
        </h2>
        <p className="mt-5 max-w-md text-lg leading-8 text-slate-600 landing-dark:text-slate-300">
          {CONTENT.supporting}
        </p>
        <a
          href="#live-demo"
          className="mt-7 inline-flex h-11 items-center gap-2 rounded-lg bg-[#0074F0] px-5 text-sm font-medium text-white transition-colors hover:bg-[#0063CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0074F0] focus-visible:ring-offset-2 landing-dark:focus-visible:ring-offset-[#081628]"
        >
          {CONTENT.cta}
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </Reveal>

      <ol className="divide-y divide-[#D0D7DE] border-y border-[#D0D7DE] lg:col-span-7 landing-dark:divide-white/10 landing-dark:border-white/10">
        {CONTENT.steps.map((step, i) => (
          <li key={step.id}>
            <Reveal variant="fade-up" delay={i * 60} className="py-6 sm:py-7">
              <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-4">
                <span
                  aria-hidden="true"
                  className="text-xl font-semibold tabular-nums text-[#6B7280] landing-dark:text-slate-400 sm:text-2xl"
                  style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
                >
                  {String(step.id).padStart(2, '0')}
                </span>
                <h3
                  className="text-lg font-black leading-snug tracking-tight text-[#111827] sm:text-xl landing-dark:text-white"
                  style={{ fontFamily: "'Roboto', ui-sans-serif, system-ui, sans-serif", fontWeight: 900 }}
                >
                  {step.title}
                </h3>
              </div>
              <p className="mt-2 grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 text-base leading-7 text-slate-600 landing-dark:text-slate-300">
                <span aria-hidden="true" />
                <span>{step.description}</span>
              </p>
            </Reveal>
          </li>
        ))}
      </ol>
    </div>
  </section>
);
