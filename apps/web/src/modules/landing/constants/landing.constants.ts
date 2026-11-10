import type {
  NavLinkItem,
  StatItem,
  ProcessStepItem,
  TestimonialItem,
} from '../types/landing.types.js';

export const LANDING_NAV_LINKS: NavLinkItem[] = [
  { label: 'Tính năng', href: '#features' },
  { label: 'Quy trình', href: '#how-it-works' },
  { label: 'Demo trực tiếp', href: '#live-demo' },
  { label: 'Bảng điều khiển', href: '#dashboard-preview' },
  { label: 'Đánh giá', href: '#testimonials' },
];

export const LANDING_STATS: StatItem[] = [
  {
    value: '10.000+',
    numericValue: 10000,
    suffix: '+',
    label: 'Tin nhắn / Ngày',
    description: 'Xử lý mượt mà hội thoại từ Fanpage, Zalo OA & Zalo cá nhân',
  },
  {
    value: '+65%',
    numericValue: 65,
    suffix: '%',
    label: 'Thời gian phản hồi',
    description: 'Tự động phân loại và định tuyến tư vấn viên dưới 30 giây',
  },
  {
    value: '3.2x',
    numericValue: 3.2,
    suffix: 'x',
    label: 'Tỷ lệ chốt tuyển sinh',
    description: 'Nuôi dưỡng lead đúng thời điểm, không bỏ sót bất kỳ ứng viên nào',
  },
  {
    value: '99.9%',
    numericValue: 99.9,
    suffix: '%',
    label: 'Thời gian hoạt động',
    description: 'Hệ thống hạ tầng ổn định với cảnh báo tức thì Telegram/Email',
  },
];

export const PROCESS_STEPS: ProcessStepItem[] = [
  {
    step: 1,
    title: 'Tiếp nhận đa kênh',
    subtitle: 'Đồng bộ tức thời',
    description:
      'Gom toàn bộ tin nhắn từ Facebook Fanpage, Zalo OA, Zalo cá nhân và tệp Excel về chung một Hộp thư Hội thoại tập trung.',
    channelTags: ['Facebook', 'Zalo OA', 'Zalo Cá nhân', 'Excel'],
    characterRole: 'messenger',
  },
  {
    step: 2,
    title: 'Tự động phân loại',
    subtitle: 'Chấm điểm thông minh',
    description:
      'Thuật toán AI tự động quét nội dung tin nhắn, gán nhãn chuyên ngành (Lập trình, Đồ họa, Marketing) và tính điểm tiềm năng.',
    channelTags: ['AI Classifier', 'Tagging', 'Scoring'],
    characterRole: 'cusi',
  },
  {
    step: 3,
    title: 'Phân công theo SLA',
    subtitle: 'Đúng người - Đúng lúc',
    description:
      'Hệ thống tự động chia ứng viên theo vòng tròn Round-robin hoặc chuyên môn của tư vấn viên kèm đếm ngược SLA phản hồi.',
    channelTags: ['Round-robin', 'SLA 15m', 'Routing'],
    characterRole: 'recruiter',
  },
  {
    step: 4,
    title: 'Chăm sóc & Chốt đơn',
    subtitle: 'Tối ưu chuyển đổi',
    description:
      'Theo dõi sát sao từng bước trên phễu Kanban, đặt lịch hẹn phỏng vấn/tư vấn và đồng bộ trạng thái đóng học phí/đặt cọc.',
    channelTags: ['Kanban CRM', 'Lịch hẹn', 'Thực thu'],
    characterRole: 'student',
  },
];

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'test-1',
    quote:
      'Từ ngày áp dụng PolarisX CRM, bộ phận Tuyển sinh của chúng tôi không còn tình trạng sót tin nhắn của thí sinh vào đợt cao điểm. Tốc độ phản hồi giảm từ 3 tiếng xuống còn chưa đầy 5 phút!',
    author: 'TS. Nguyễn Văn Hùng',
    role: 'Trưởng ban Tuyển sinh & Đào tạo',
    organization: 'Học viện Công nghệ CUSC',
    avatarText: 'NH',
    metricsResult: 'Tăng 42% tỷ lệ nộp hồ sơ sớm',
  },
  {
    id: 'test-2',
    quote:
      'Hộp thư hợp nhất 3 cột cực kỳ trực quan và mượt mà. Đội ngũ tư vấn viên làm quen chỉ trong 1 buổi sáng là thành thạo.',
    author: 'Trần Thị Mai Phương',
    role: 'Giám đốc Tuyển sinh Miền Nam',
    organization: 'Tổ hợp Giáo dục Polaris Edu',
    avatarText: 'MP',
    metricsResult: 'Tiết kiệm 3 giờ xử lý dữ liệu mỗi ngày',
  },
  {
    id: 'test-3',
    quote:
      'Khả năng hợp nhất định danh số điện thoại từ cả Zalo và Facebook giúp chúng tôi tránh được việc 2 nhân viên cùng gọi điện tư vấn cho 1 phụ huynh. Trải nghiệm rất chuyên nghiệp!',
    author: 'Lê Hoàng Khôi',
    role: 'Trưởng phòng Marketing & Tư vấn',
    organization: 'Trung tâm Đào tạo Kỹ thuật số',
    avatarText: 'LK',
    metricsResult: 'Loại bỏ 100% tình trạng trùng lead',
  },
];

export const SIMULATED_CHAT_STREAM = [
  {
    sender: 'candidate',
    name: 'Nguyễn Minh Quân',
    channel: 'facebook',
    time: '14:20',
    text: 'Chào thầy cô, em muốn tìm hiểu khóa học Lập trình Web Fullstack và chính sách học bổng tuyển sinh đợt này ạ.',
    tags: ['Lập trình Web', 'Xin học bổng'],
    score: 85,
  },
  {
    sender: 'bot',
    name: 'PolarisX AI Bot',
    channel: 'system',
    time: '14:20',
    text: 'Chào bạn Quân! Hệ thống đã ghi nhận nhu cầu của bạn và tự động kết nối tư vấn viên phụ trách CNTT.',
  },
  {
    sender: 'agent',
    name: 'Tư vấn viên Lan Anh',
    channel: 'facebook',
    time: '14:21',
    text: 'Chào Quân! Chị Lan Anh sẽ gửi cho em lộ trình chi tiết và điều kiện nhận học bổng 30% qua Zalo nhé!',
  },
];
