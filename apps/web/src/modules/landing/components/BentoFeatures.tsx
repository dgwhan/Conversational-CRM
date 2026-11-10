import React from 'react';
import {
  Inbox,
  Sparkles,
  GitPullRequest,
  Users2,
  FileCheck2,
  BellRing,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';

export const BentoFeatures: React.FC = () => {
  return (
    <section id="features" className="py-16 sm:py-24 px-3 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header Mục Tính Năng */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-4 shadow-xs">
            <Sparkles size={13} className="text-blue-600" />
            Hệ sinh thái tính năng
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Mọi Công Cụ Tuyển Sinh Đều Nằm Trong{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
              Polaris
            </span>
            <span className="text-blue-600 dark:text-blue-400 font-black">X</span>
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed px-2">
            Được kiến tạo chuyên sâu cho các trường đại học, cao đẳng, trung tâm đào tạo và doanh nghiệp dịch vụ.
          </p>
        </div>

        {/* Bento Grid 8 Thẻ Kính (Glass Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Unified Inbox (Lớn, col-span-2 trên LG) */}
          <div className="lg:col-span-2 group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                  <Inbox size={22} />
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-bold">
                  Kênh trung tâm
                </span>
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Hộp Thư Hợp Nhất 3 Cột (Unified Inbox)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Gom toàn bộ tin nhắn từ Facebook Fanpage, Zalo OA và Zalo cá nhân về chung một giao diện 3 cột chuẩn Pancake. Tư vấn viên trả lời đa kênh tức thì mà không cần chuyển đổi ứng dụng.
              </p>
            </div>
            {/* Visual preview nhỏ */}
            <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-blue-100/80 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-semibold">
                Facebook Chat
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-sky-100/80 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 text-xs font-semibold">
                Zalo OA & Personal
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-semibold">
                Import Excel nhanh
              </span>
            </div>
          </div>

          {/* Card 2: Phân loại & Chấm điểm thông minh */}
          <div className="group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />
            <div>
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25 mb-4 shrink-0">
                <Sparkles size={22} />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                Tự Động Phân Loại & Chấm Điểm
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Tự động quét tin nhắn để gắn nhãn nhu cầu ngành học, xác định độ nóng (Hot Lead) và tính thang điểm tiềm năng từ 0 đến 100.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full w-[85%] rounded-full animate-pulse" />
              </div>
              <span className="text-xs font-bold text-purple-600 shrink-0">Lead Hot (85)</span>
            </div>
          </div>

          {/* Card 3: Quản lý Phễu Kanban & SLA */}
          <div className="group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 mb-4 shrink-0">
              <GitPullRequest size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                Phễu Tuyển Sinh & Đồng Hồ SLA
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Kéo thả ứng viên qua các giai đoạn phễu. Đếm ngược thời gian phản hồi SLA (15 phút, 30 phút) giúp đội ngũ tư vấn không trễ hẹn.
              </p>
            </div>
            <div className="mt-4 sm:mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 text-amber-700 text-xs font-bold">
              ⏱ SLA đếm ngược: 12 phút còn lại
            </div>
          </div>

          {/* Card 4: Hợp nhất hồ sơ khách hàng */}
          <div className="group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 mb-4 shrink-0">
              <Users2 size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                Hợp Nhất Định Danh Đa Kênh
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Tự động nhận diện và gộp dữ liệu trùng lặp khi một thí sinh vừa nhắn tin trên Facebook, vừa hỏi qua Zalo bằng số điện thoại.
              </p>
            </div>
            <div className="mt-4 sm:mt-5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ 1 Hồ sơ duy nhất xuyên suốt đa kênh
            </div>
          </div>

          {/* Card 5: Quản lý hồ sơ & Lịch sử tư vấn */}
          <div className="group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/25 mb-4 shrink-0">
              <FileCheck2 size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                Theo Dõi Toàn Trình Hồ Sơ
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Lưu trữ lịch sử trao đổi, ghi chú tư vấn, học bạ, lệ phí tuyển sinh và chứng từ đặt cọc an toàn, minh bạch.
              </p>
            </div>
            <div className="mt-4 sm:mt-5 text-[11px] font-semibold text-slate-500">
              Cập nhật nhật ký theo thời gian thực (Audit Trail)
            </div>
          </div>

          {/* Card 6: Thông báo Telegram & Email */}
          <div className="group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/25 mb-4 shrink-0">
              <BellRing size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                Cảnh Báo Tức Thì Telegram / Email
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Nhận thông báo ngay lập tức qua bot Telegram khi có thí sinh nộp hồ sơ, khi trễ SLA hoặc khi lead nóng cần xử lý gấp.
              </p>
            </div>
            <div className="mt-4 sm:mt-5 text-[11px] font-bold text-rose-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span>Thời gian bắn tin nhắn: &lt; 1 giây</span>
            </div>
          </div>

          {/* Card 7: Báo cáo Thống kê & KPI */}
          <div className="group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 mb-4 shrink-0">
              <BarChart3 size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                Bảng Báo Cáo & Thống Kê Realtime
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Theo dõi biểu đồ tỷ lệ chuyển đổi, hiệu suất tư vấn viên, doanh số học phí dự kiến và xuất file Excel / CSV chỉ với 1 cú click.
              </p>
            </div>
            <div className="mt-4 sm:mt-5 text-[11px] font-semibold text-amber-600">
              Xuất dữ liệu chuẩn UTF-8 BOM cho Excel
            </div>
          </div>

          {/* Card 8: Phân quyền RBAC & Phòng chống Broken Access Control */}
          <div className="group rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 mb-4 shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                Bảo Mật RBAC & Ngăn Chặn BOLA
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Tách biệt tuyệt đối quyền hạn Chủ doanh nghiệp (Owner) và Tư vấn viên (Staff/Agent). Trả về 403 Forbidden nếu vi phạm quyền hạn IDOR.
              </p>
            </div>
            <div className="mt-4 sm:mt-5 text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              ✓ Kiểm soát đa tầng tại từng Route có ID
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
