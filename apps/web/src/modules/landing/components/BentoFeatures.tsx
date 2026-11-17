import React from 'react';
import { Reveal } from './Reveal.js';

const HEADLINE = 'Tính Năng CRM';
const INTER = "'Inter', ui-sans-serif, system-ui, sans-serif";

const ITEMS = [
  {
    id: 'inbox',
    title: 'Hộp Thư Đa Kênh',
    desc: 'Tiếp nhận và trả lời tin nhắn từ các kênh trong cùng một hộp thư.',
  },
  {
    id: 'identity',
    title: 'Hồ Sơ Khách Hàng',
    desc: 'Hợp nhất thông tin và lịch sử trao đổi để đội ngũ luôn có đủ ngữ cảnh.',
  },
  {
    id: 'pipeline',
    title: 'Quản Lý Cơ Hội Bán Hàng',
    desc: 'Theo dõi từng cơ hội, người phụ trách và thời hạn phản hồi.',
  },
  {
    id: 'scoring',
    title: 'Chấm Điểm Tiềm Năng',
    desc: 'Ưu tiên khách hàng dựa trên nhu cầu và mức độ sẵn sàng mua.',
  },
];

export const BentoFeatures: React.FC = () => (
  <section
    id="features"
    className="bg-[#F4F7FB] px-4 py-20 font-['Roboto',ui-sans-serif,system-ui,sans-serif] sm:px-6 sm:py-28 lg:px-8 landing-dark:bg-[#0B1F3A]"
  >
    <div className="mx-auto max-w-7xl">
      <Reveal className="max-w-3xl">
        <h2
          className="text-3xl leading-[1.15] tracking-[-0.025em] text-[#0B1F3A] text-balance sm:text-4xl lg:text-5xl landing-dark:text-white"
          style={{ fontFamily: INTER, fontWeight: 800 }}
        >
          {HEADLINE}
        </h2>
      </Reveal>

      <ul className="mt-14 border-t border-slate-300 sm:mt-20 landing-dark:border-white/15">
        {ITEMS.map((item, i) => (
          <li key={item.id} className="group relative border-b border-slate-300 landing-dark:border-white/15">
            <Reveal
              delay={i * 80}
              className="grid gap-4 py-9 sm:py-12 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-14"
            >
              <h3
                className="text-2xl leading-[1.15] tracking-[-0.02em] text-[#0B1F3A] sm:text-3xl lg:col-span-7 lg:text-4xl landing-dark:text-white"
                style={{ fontFamily: INTER, fontWeight: 800 }}
              >
                {item.title}
              </h3>
              <p className="max-w-xl text-lg leading-8 text-slate-600 text-pretty lg:col-span-5 landing-dark:text-slate-300">
                {item.desc}
              </p>
            </Reveal>
            <span
              aria-hidden="true"
              className="absolute inset-x-0 -bottom-px h-0.5 origin-left scale-x-0 bg-[#0074F0] transition-transform duration-500 ease-out group-hover:scale-x-100 motion-reduce:transition-none"
            />
          </li>
        ))}
      </ul>
    </div>
  </section>
);
