import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Sparkles,
  UserCheck,
  Send,
  Phone,
  Tag,
  Clock,
  RotateCcw,
  Bot,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { SIMULATED_CHAT_STREAM } from '../constants/landing.constants.js';

interface ConversationPreview {
  id: string;
  name: string;
  channel: 'facebook' | 'zalo' | 'excel';
  snippet: string;
  time: string;
  score: number;
  unread: boolean;
  tags: string[];
}

const DEMO_CONVERSATIONS: ConversationPreview[] = [
  {
    id: 'conv-1',
    name: 'Nguyễn Minh Quân',
    channel: 'facebook',
    snippet: 'Chào thầy cô, em muốn tìm hiểu...',
    time: 'Vừa xong',
    score: 85,
    unread: true,
    tags: ['Lập trình Web', 'Học bổng'],
  },
  {
    id: 'conv-2',
    name: 'Trần Thu Hà',
    channel: 'zalo',
    snippet: 'Dạ em đã nhận được link tư vấn...',
    time: '12p trước',
    score: 92,
    unread: false,
    tags: ['Thiết kế Đồ họa'],
  },
  {
    id: 'conv-3',
    name: 'Phạm Đức Anh',
    channel: 'facebook',
    snippet: 'Cho em hỏi lịch khai giảng khóa mới...',
    time: '28p trước',
    score: 64,
    unread: false,
    tags: ['Digital Marketing'],
  },
];

export const LiveDemoInbox: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Auto-play loop sequence
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % (SIMULATED_CHAT_STREAM.length + 1));
    }, 3800);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Lead score calculation based on active step
  const currentScore = activeStep === 0 ? 45 : activeStep === 1 ? 85 : 95;

  return (
    <section id="live-demo" className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-cyan-50/80 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-800/50 backdrop-blur-md mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          <span>Mô phỏng trải nghiệm thực tế</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Hộp thư thông minh{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
            xử lý đa kênh tức thì
          </span>
        </h2>
        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
          Tận mắt chứng kiến AI tự động bắt trọn tin nhắn từ Fanpage, gắn thẻ chuyên ngành và tính điểm tiềm năng theo thời gian thực.
        </p>
      </div>

      {/* Interactive Controls Bar */}
      <div className="flex items-center justify-between max-w-5xl mx-auto mb-4 px-2">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          Mô phỏng chu trình live (Bước {Math.min(activeStep + 1, SIMULATED_CHAT_STREAM.length)} / {SIMULATED_CHAT_STREAM.length})
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveStep(0)}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3 h-3" />
            Làm lại từ đầu
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100/60 transition-colors shadow-sm"
          >
            {isPlaying ? 'Tạm dừng auto-play' : 'Tiếp tục auto-play'}
          </button>
        </div>
      </div>

      {/* 3-Column Glassmorphism Demo Container */}
      <div className="max-w-5xl mx-auto bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-3xl shadow-2xl shadow-blue-950/10 overflow-hidden">
        {/* Mockup Window Top Header */}
        <div className="h-10 px-4 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
            Polaris<span className="text-blue-600 font-bold">X</span> Live Inbox Workspace
          </div>
          <div className="text-[11px] text-slate-400 font-mono">v2.4.0</div>
        </div>

        {/* 3 Columns Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
          {/* Left Column: Conversation List (3.5 cols) */}
          <div className="md:col-span-4 border-r border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40 p-3 flex flex-col gap-2">
            <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
              Hội thoại gần đây
            </div>

            {DEMO_CONVERSATIONS.map((conv, idx) => {
              const isSelected = idx === 0;
              return (
                <div
                  key={conv.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700/60 shadow-sm'
                      : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 dark:text-white">
                      <span>{conv.name}</span>
                      {conv.channel === 'facebook' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                          FB
                        </span>
                      )}
                      {conv.channel === 'zalo' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">
                          Zalo
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">{conv.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-2">
                    {conv.snippet}
                  </p>
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex gap-1">
                      {conv.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <span className="font-bold text-amber-500 text-[10px] flex items-center gap-0.5">
                      <Flame className="w-3 h-3" />
                      {conv.score}đ
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Column: Live Chat Dialogue (5 cols) */}
          <div className="md:col-span-5 p-4 flex flex-col justify-between bg-white/40 dark:bg-slate-900/20 border-r border-slate-200/60 dark:border-slate-800/60">
            {/* Chat header */}
            <div className="pb-3 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Nguyễn Minh Quân</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </h4>
                <p className="text-[10px] text-slate-400">Đến từ: Facebook Fanpage Tuyển sinh</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                SLA: 03:42 còn lại
              </span>
            </div>

            {/* Chat message stream */}
            <div className="flex-1 py-4 flex flex-col gap-3 overflow-y-auto">
              {/* Candidate initial message */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-[85%] self-start bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl rounded-tl-sm p-3 text-xs text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
              >
                <div className="font-semibold text-[10px] text-blue-600 dark:text-blue-400 mb-1">
                  Nguyễn Minh Quân (14:20)
                </div>
                <p>{SIMULATED_CHAT_STREAM[0].text}</p>
              </motion.div>

              {/* Bot routing notification message */}
              <AnimatePresence>
                {activeStep >= 1 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="self-center w-full max-w-[90%] bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/70 rounded-xl p-2.5 text-center text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2"
                  >
                    <Bot className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>{SIMULATED_CHAT_STREAM[1].text}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Recruiter Agent response */}
              <AnimatePresence>
                {activeStep >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-[85%] self-end bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm p-3 text-xs shadow-md shadow-blue-600/20"
                  >
                    <div className="font-semibold text-[10px] text-blue-100 mb-1">
                      Tư vấn viên Lan Anh (14:21)
                    </div>
                    <p>{SIMULATED_CHAT_STREAM[2].text}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Fake Reply Input Box */}
            <div className="pt-2">
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                <input
                  type="text"
                  readOnly
                  value="Nhập câu trả lời hoặc chọn kịch bản mẫu..."
                  className="bg-transparent text-xs text-slate-400 flex-1 px-2 outline-none select-none"
                />
                <button
                  className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  aria-label="Gửi phản hồi demo"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: AI Lead Classification & Score (3 cols) */}
          <div className="md:col-span-3 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Hồ sơ & Điểm AI
              </div>

              {/* Lead Candidate Summary */}
              <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    MQ
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Nguyễn Minh Quân
                    </h5>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      0948 ••• •••
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-500" />
                  Đã hợp nhất hồ sơ từ Zalo
                </div>
              </div>

              {/* Lead Potential Gauge */}
              <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 mb-4 text-center">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>Điểm tiềm năng AI</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{currentScore}/100</span>
                </div>

                {/* Animated Score Progress Bar */}
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full"
                    initial={{ width: '45%' }}
                    animate={{ width: `${currentScore}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>

                <div className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Xác suất chốt nhập học: Rất cao (89%)
                </div>
              </div>

              {/* AI Auto-Tags */}
              <div>
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-blue-500" />
                  Thẻ AI tự động gán:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/60">
                    Lập trình Web
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200/60">
                    Xin học bổng 30%
                  </span>
                  {activeStep >= 2 && (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60"
                    >
                      Hẹn tư vấn Zalo
                    </motion.span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom SLA timer */}
            <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                Thời gian phản hồi:
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">58 giây</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
