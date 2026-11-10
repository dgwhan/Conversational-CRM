import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  MessageSquare,
  Send,
  Mail,
  Shield,
  Heart,
  Globe,
} from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="relative mt-20 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Col (2 cols) */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Polaris<span className="text-blue-600 dark:text-blue-400 font-black">X</span>
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mb-6">
              Nền tảng Quản trị Quan hệ Ứng viên & Khách hàng Hội thoại (Conversational CRM) thế hệ mới, tối ưu hóa công tác tuyển sinh và chăm sóc đa kênh.
            </p>
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:text-blue-600 transition-colors"
                aria-label="Facebook Fanpage"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
              <a
                href="https://t.me"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:text-sky-500 transition-colors"
                aria-label="Telegram Channel"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href="mailto:contact@polarisx.edu.vn"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:text-rose-500 transition-colors"
                aria-label="Email liên hệ"
              >
                <Mail className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:text-indigo-500 transition-colors"
                aria-label="Cổng thông tin"
              >
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 1: Tính năng */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Tính năng nổi bật
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Hộp thư hợp nhất 3 cột
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  AI Phân loại & Chấm điểm
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Phân công SLA tự động
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Hợp nhất định danh khách hàng
                </a>
              </li>
              <li>
                <a href="#dashboard-preview" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Bảng điều khiển & KPI thời gian thực
                </a>
              </li>
            </ul>
          </div>

          {/* Col 2: Kênh tích hợp */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Kênh kết nối
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <span className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1">
                  Facebook Fanpage Graph API
                </span>
              </li>
              <li>
                <span className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1">
                  Zalo Official Account (OA)
                </span>
              </li>
              <li>
                <span className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1">
                  Zalo Cá nhân Webhook
                </span>
              </li>
              <li>
                <span className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1">
                  Nhập tệp Excel / CSV
                </span>
              </li>
              <li>
                <span className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1">
                  Cảnh báo tức thì Telegram Bot
                </span>
              </li>
            </ul>
          </div>

          {/* Col 3: Bảo mật & Tuân thủ */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              An toàn dữ liệu
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>Phân quyền RBAC đa cấp</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>Chống rò rỉ BOLA / IDOR</span>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Điều khoản dịch vụ
                </Link>
              </li>
              <li>
                <span className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Trạng thái hệ thống (99.9% SLA)
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom sub-footer */}
        <div className="pt-8 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} Polaris<span className="text-blue-600 dark:text-blue-400 font-bold">X</span> Conversational CRM. Mọi quyền được bảo lưu.</p>
          <p className="flex items-center gap-1">
            Phát triển với sự tận tâm dành riêng cho giáo dục & đào tạo
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  );
};
