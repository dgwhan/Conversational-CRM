import React from 'react';
import { MessageSquare } from 'lucide-react';

export const EmptyInboxView: React.FC = () => {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white min-w-[380px] h-full select-none">
      <div className="flex flex-col items-center max-w-sm mx-auto">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 flex items-center justify-center mb-3.5">
          <MessageSquare size={24} />
        </div>
        <h3 className="m-0 mb-2 text-sm font-bold text-slate-800">
          Hộp thoại đang trống
        </h3>
        <p className="m-0 text-xs leading-relaxed text-slate-500">
          Chưa có cuộc hội thoại nào. Khi khách hàng nhắn tin từ Facebook Messenger hoặc Zalo,
          tin nhắn sẽ được đẩy tự động qua kết nối WebSocket Realtime và xuất hiện tại đây ngay lập tức.
        </p>
      </div>
    </main>
  );
};

