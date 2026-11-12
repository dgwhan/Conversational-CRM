import type { Locale } from '../../../i18n/index.js';
import type {
  NavLinkItem,
  StatItem,
  ProcessStepItem,
  TestimonialItem,
} from '../types/landing.types.js';

/**
 * Nội dung landing page (song ngữ vi/en), định vị PolarisX là CRM hội thoại đa ngành.
 * Các ngành mẫu khớp với preset domain của workspace:
 * EDUCATION, REAL_ESTATE, BEAUTY_SPA, RETAIL, B2B_SAAS.
 */

export type IndustryId = 'education' | 'realEstate' | 'beauty' | 'retail' | 'b2b';

export const INDUSTRY_ORDER: IndustryId[] = ['education', 'realEstate', 'beauty', 'retail', 'b2b'];

export interface IndustryCard {
  id: IndustryId;
  name: string;
  description: string;
  stages: string[];
  terms: string[];
}

export interface DemoConversation {
  id: string;
  name: string;
  channel: 'facebook' | 'zalo';
  snippet: string;
  time: string;
  score: number;
  tags: string[];
}

export interface DemoScenario {
  label: string;
  sourceName: string;
  customerName: string;
  customerInitials: string;
  agentName: string;
  customerText: string;
  botText: string;
  agentText: string;
  tags: [string, string];
  followUpTag: string;
  conversations: DemoConversation[];
}

export interface KpiCard {
  label: string;
  value: string;
  note: string;
}

export interface LandingContent {
  nav: {
    links: NavLinkItem[];
    homeAria: string;
    brandSubtitle: string;
    goToCrm: string;
    login: string;
    tryFree: string;
    loginMobile: string;
    tryMobile: string;
    menuAria: string;
    themeAria: string;
    languageAria: string;
  };
  hero: {
    pill: string;
    titleLead: string;
    subtitle: string;
    ctaDashboard: string;
    ctaTry: string;
    ctaDemo: string;
    trust: [string, string, string];
    floatingBadges: [string, string, string];
    mascot: string;
    mock: {
      online: string;
      conversations: string;
      newCount: string;
      list: { name: string; source: string; snippet: string }[];
      chatName: string;
      typing: string;
      score: string;
      customerMsg: string;
      botMsgBefore: string;
      botTag: string;
      botMsgAfter: string;
      inputHint: string;
      leadPanelTitle: string;
      sourceLabel: string;
      sourceValue: string;
      phoneLabel: string;
      zaloLabel: string;
      zaloValue: string;
      autoTagsLabel: string;
      tags: [string, string];
    };
  };
  stats: StatItem[];
  industries: {
    pill: string;
    titleLead: string;
    titleHighlight: string;
    subtitle: string;
    stagesLabel: string;
    termsLabel: string;
    items: IndustryCard[];
    customNoteTitle: string;
    customNote: string;
  };
  features: {
    pill: string;
    titleLead: string;
    subtitle: string;
    inbox: { badge: string; title: string; description: string; chips: [string, string, string] };
    scoring: { title: string; description: string; meter: string };
    pipeline: { title: string; description: string; footer: string };
    identity: { title: string; description: string; footer: string };
    timeline: { title: string; description: string; footer: string };
    alerts: { title: string; description: string; footer: string };
    reports: { title: string; description: string; footer: string };
    security: { title: string; description: string; footer: string };
  };
  how: {
    pill: string;
    titleLead: string;
    titleHighlight: string;
    subtitleBefore: string;
    subtitleAfter: string;
    stepLabel: string;
    steps: ProcessStepItem[];
    slaTitle: string;
    slaDescription: string;
    slaCta: string;
    characterLabels: { messenger: string; agent: string; customer: string };
  };
  demo: {
    pill: string;
    titleLead: string;
    titleHighlight: string;
    subtitle: string;
    industryPickerLabel: string;
    cycleLabel: string;
    reset: string;
    pause: string;
    resume: string;
    tabs: { chat: string; conversations: string; lead: string };
    windowTitle: string;
    recentConversations: string;
    profileTitle: string;
    mergedFrom: string;
    scoreLabel: string;
    closeChance: string;
    autoTags: string;
    responseTime: string;
    responseValue: string;
    inputPlaceholder: string;
    sendAria: string;
    scoreSuffix: string;
    scenarios: Record<IndustryId, DemoScenario>;
  };
  dashboard: {
    pill: string;
    titleLead: string;
    titleHighlight: string;
    subtitle: string;
    kpis: [KpiCard, KpiCard, KpiCard, KpiCard];
    chartTitle: string;
    chartSubtitle: string;
    tabs: {
      trends: { short: string; long: string };
      products: { short: string; long: string };
      channels: { short: string; long: string };
    };
    weekdays: string[];
    products: { name: string; value: string }[];
    channelLegend: [string, string, string, string];
    totalLeads: string;
  };
  testimonials: {
    pill: string;
    titleLead: string;
    titleHighlight: string;
    subtitleBefore: string;
    subtitleAfter: string;
    items: TestimonialItem[];
    goTo: string;
    prev: string;
    next: string;
  };
  cta: {
    pill: string;
    title: string;
    subtitle: string;
    checklist: [string, string, string];
    primary: string;
    secondary: string;
    mascot: string;
  };
  footer: {
    description: string;
    emailAria: string;
    portalAria: string;
    featuresTitle: string;
    featureLinks: string[];
    channelsTitle: string;
    channels: string[];
    securityTitle: string;
    securityItems: [string, string];
    privacy: string;
    terms: string;
    status: string;
    rights: string;
    madeFor: string;
  };
}

const vi: LandingContent = {
  nav: {
    links: [
      { label: 'Tính năng', href: '#features' },
      { label: 'Ngành nghề', href: '#industries' },
      { label: 'Quy trình', href: '#how-it-works' },
      { label: 'Demo trực tiếp', href: '#live-demo' },
      { label: 'Đánh giá', href: '#testimonials' },
    ],
    homeAria: 'Trang chủ PolarisX Conversational CRM',
    brandSubtitle: 'Conversational CRM',
    goToCrm: 'Vào trang CRM',
    login: 'Đăng nhập',
    tryFree: 'Dùng thử miễn phí',
    loginMobile: 'Đăng nhập hệ thống',
    tryMobile: 'Dùng thử PolarisX ngay',
    menuAria: 'Mở menu',
    themeAria: 'Đổi giao diện sáng/tối',
    languageAria: 'Chuyển đổi ngôn ngữ',
  },
  hero: {
    pill: 'CRM hội thoại đa kênh, đa ngành',
    titleLead: 'Một Hộp Thư Cho Mọi Khách Hàng, Mọi Ngành Hàng Cùng',
    subtitle:
      'Gom tin nhắn từ Zalo, Facebook Fanpage và tệp Excel về một nơi. Tự động phân loại, chấm điểm khách tiềm năng và giao đúng người tư vấn, dù bạn kinh doanh giáo dục, bất động sản, spa, bán lẻ hay dịch vụ B2B.',
    ctaDashboard: 'Vào Bảng Điều Khiển CRM',
    ctaTry: 'Trải nghiệm PolarisX miễn phí',
    ctaDemo: 'Xem demo trực tiếp',
    trust: [
      'Mẫu cấu hình sẵn cho 5 ngành',
      'Phân quyền RBAC theo từng workspace',
      'Dùng mượt trên điện thoại và máy tính',
    ],
    floatingBadges: ['Zalo OA & Cá nhân', 'Facebook Fanpage', 'Cảnh báo Telegram'],
    mascot: 'PolarisX chào bạn! 👋',
    mock: {
      online: 'Trực tuyến',
      conversations: 'Hội thoại (24)',
      newCount: '5 mới',
      list: [
        { name: 'Nguyễn Minh Quân', source: 'Facebook', snippet: 'Căn 2 phòng ngủ còn hàng không ạ?' },
        { name: 'Trần Bảo Ngọc', source: 'Zalo OA', snippet: 'Cho mình đặt lịch chăm sóc da...' },
        { name: 'Lê Hoàng Nam', source: 'Excel', snippet: 'Báo giá gói phần mềm 50 user...' },
      ],
      chatName: 'Nguyễn Minh Quân',
      typing: 'Đang nhắn tin',
      score: 'Điểm: 85/100',
      customerMsg: 'Chào anh chị, dự án còn căn 2 phòng ngủ hướng Đông Nam không ạ? Em cần vay ngân hàng 70%.',
      botMsgBefore: 'Chào anh Quân! Hệ thống đã gắn nhãn ',
      botTag: '#Căn hộ 2PN',
      botMsgAfter: ' và chuyển ngay cho chuyên viên phụ trách dự án.',
      inputHint: 'Nhập phản hồi hoặc chọn câu trả lời mẫu...',
      leadPanelTitle: 'Thông tin khách hàng',
      sourceLabel: 'Nguồn:',
      sourceValue: 'Facebook Page',
      phoneLabel: 'Số điện thoại:',
      zaloLabel: 'Zalo:',
      zaloValue: 'Đã hợp nhất',
      autoTagsLabel: 'Nhãn tự động:',
      tags: ['Căn hộ 2PN', 'Cần vay'],
    },
  },
  stats: [
    {
      value: '10.000+',
      numericValue: 10000,
      suffix: '+',
      label: 'Tin nhắn / Ngày',
      description: 'Xử lý mượt mà hội thoại từ Fanpage, Zalo OA và Zalo cá nhân',
    },
    {
      value: '-65%',
      numericValue: 65,
      suffix: '%',
      label: 'Thời gian phản hồi',
      description: 'Tự động phân loại và giao khách cho nhân viên phù hợp chỉ trong vài giây',
    },
    {
      value: '3.2x',
      numericValue: 3.2,
      suffix: 'x',
      label: 'Tỷ lệ chốt giao dịch',
      description: 'Chăm sóc khách đúng thời điểm, không bỏ sót bất kỳ khách tiềm năng nào',
    },
    {
      value: '5+',
      numericValue: 5,
      suffix: '+',
      label: 'Ngành có mẫu sẵn',
      description: 'Giáo dục, bất động sản, spa, bán lẻ, B2B và tự tùy biến cho ngành của bạn',
    },
  ],
  industries: {
    pill: 'Một nền tảng, nhiều ngành hàng',
    titleLead: 'Tự điều chỉnh theo',
    titleHighlight: 'cách bạn bán hàng',
    subtitle:
      'Chọn mẫu ngành khi tạo workspace: giai đoạn phễu, thuật ngữ, danh mục sản phẩm và tiêu chí chấm điểm được thiết lập sẵn. Mỗi chi nhánh hay thương hiệu có thể là một workspace riêng.',
    stagesLabel: 'Phễu mẫu',
    termsLabel: 'Thuật ngữ',
    items: [
      {
        id: 'education',
        name: 'Giáo dục & Đào tạo',
        description: 'Trường học, trung tâm ngoại ngữ, kỹ năng và đào tạo nghề.',
        stages: ['Liên hệ mới', 'Tư vấn', 'Học thử', 'Nhập học'],
        terms: ['Học viên', 'Khóa học', 'Học phí'],
      },
      {
        id: 'realEstate',
        name: 'Bất động sản',
        description: 'Sàn giao dịch, chủ đầu tư và đội môi giới dự án.',
        stages: ['Quan tâm', 'Xem nhà mẫu', 'Đặt cọc', 'Ký hợp đồng'],
        terms: ['Khách mua', 'Căn / Lô', 'Giá trị căn'],
      },
      {
        id: 'beauty',
        name: 'Spa & Thẩm mỹ',
        description: 'Spa, thẩm mỹ viện, nha khoa và phòng khám dịch vụ.',
        stages: ['Hỏi giá', 'Đặt lịch', 'Trải nghiệm', 'Mua liệu trình'],
        terms: ['Khách hàng', 'Liệu trình', 'Giá liệu trình'],
      },
      {
        id: 'retail',
        name: 'Bán lẻ & Online',
        description: 'Shop thời trang, mỹ phẩm, đồ gia dụng bán qua mạng xã hội.',
        stages: ['Hỏi hàng', 'Chốt đơn', 'Đang giao', 'Đã nhận'],
        terms: ['Người mua', 'Sản phẩm', 'Giá trị đơn'],
      },
      {
        id: 'b2b',
        name: 'Dịch vụ B2B & SaaS',
        description: 'Phần mềm, agency, logistics và dịch vụ doanh nghiệp.',
        stages: ['Lead mới', 'Demo', 'Báo giá', 'Ký hợp đồng'],
        terms: ['Doanh nghiệp', 'Gói dịch vụ', 'Giá trị hợp đồng'],
      },
    ],
    customNoteTitle: 'Ngành của bạn chưa có trong danh sách?',
    customNote:
      'Tự đặt tên giai đoạn, thuật ngữ, danh mục sản phẩm và tiêu chí chấm điểm trong phần Cài đặt workspace, không cần lập trình.',
  },
  features: {
    pill: 'Hệ sinh thái tính năng',
    titleLead: 'Mọi Công Cụ Bán Hàng & Chăm Sóc Khách Đều Nằm Trong',
    subtitle:
      'Dành cho mọi đội ngũ tư vấn và bán hàng qua tin nhắn: từ trung tâm đào tạo, sàn bất động sản, chuỗi spa đến shop online và doanh nghiệp B2B.',
    inbox: {
      badge: 'Kênh trung tâm',
      title: 'Hộp Thư Hợp Nhất 3 Cột',
      description:
        'Gom toàn bộ tin nhắn từ Facebook Fanpage, Zalo OA và Zalo cá nhân về một giao diện 3 cột. Nhân viên trả lời mọi kênh ngay tại chỗ, không cần chuyển qua lại giữa các ứng dụng.',
      chips: ['Facebook Chat', 'Zalo OA & Cá nhân', 'Nhập Excel nhanh'],
    },
    scoring: {
      title: 'Tự Động Phân Loại & Chấm Điểm',
      description:
        'Quét nội dung tin nhắn để gắn nhãn sản phẩm quan tâm, ngân sách, thời điểm mua và chấm điểm tiềm năng từ 0 đến 100 theo tiêu chí riêng của bạn.',
      meter: 'Khách nóng (85)',
    },
    pipeline: {
      title: 'Phễu Bán Hàng Tùy Biến & SLA',
      description:
        'Kéo thả khách hàng qua các giai đoạn do bạn định nghĩa. Đồng hồ SLA đếm ngược (15, 30 phút) giúp đội ngũ không để khách chờ.',
      footer: '⏱ SLA đếm ngược: còn 12 phút',
    },
    identity: {
      title: 'Hợp Nhất Định Danh Đa Kênh',
      description:
        'Tự động nhận diện và gộp hồ sơ trùng khi cùng một khách vừa nhắn Facebook, vừa hỏi qua Zalo bằng số điện thoại.',
      footer: '✓ Một hồ sơ duy nhất xuyên suốt mọi kênh',
    },
    timeline: {
      title: 'Theo Dõi Toàn Trình Giao Dịch',
      description:
        'Lưu lịch sử trao đổi, ghi chú tư vấn, báo giá, hợp đồng và chứng từ đặt cọc ở một nơi, rõ ràng và an toàn.',
      footer: 'Nhật ký thay đổi theo thời gian thực (Audit Trail)',
    },
    alerts: {
      title: 'Cảnh Báo Tức Thì Telegram / Email',
      description:
        'Nhận thông báo qua bot Telegram khi khách để lại thông tin, đặt lịch, khi trễ SLA hoặc khi có khách nóng cần xử lý gấp.',
      footer: 'Thời gian gửi thông báo: < 1 giây',
    },
    reports: {
      title: 'Báo Cáo & Thống Kê Realtime',
      description:
        'Theo dõi tỷ lệ chuyển đổi, hiệu suất từng nhân viên, doanh thu dự kiến theo sản phẩm và xuất Excel / CSV chỉ với 1 cú nhấp.',
      footer: 'Xuất dữ liệu UTF-8 BOM, mở đúng trên Excel',
    },
    security: {
      title: 'Bảo Mật RBAC & Ngăn Chặn BOLA',
      description:
        'Tách biệt quyền Chủ sở hữu (Owner) và Nhân viên (Staff) theo từng workspace. Mọi truy cập trái phép đều bị chặn với mã 403.',
      footer: '✓ Kiểm soát quyền tại từng route có ID',
    },
  },
  how: {
    pill: 'Quy trình vận hành thông minh',
    titleLead: 'Từ tin nhắn đầu tiên đến',
    titleHighlight: 'giao dịch thành công',
    subtitleBefore: 'Chỉ với 4 bước tự động hóa khép kín, Polaris',
    subtitleAfter:
      ' CRM giúp đội ngũ tư vấn và bán hàng tăng năng suất gấp 3 lần và không còn để khách hàng phải chờ.',
    stepLabel: 'Bước',
    steps: [
      {
        step: 1,
        title: 'Tiếp nhận đa kênh',
        subtitle: 'Đồng bộ tức thời',
        description:
          'Gom toàn bộ tin nhắn từ Facebook Fanpage, Zalo OA, Zalo cá nhân và tệp Excel về chung một hộp thư hội thoại.',
        channelTags: ['Facebook', 'Zalo OA', 'Zalo cá nhân', 'Excel'],
        characterRole: 'messenger',
      },
      {
        step: 2,
        title: 'Tự động phân loại',
        subtitle: 'Chấm điểm thông minh',
        description:
          'Hệ thống đọc nội dung tin nhắn, gắn nhãn theo sản phẩm hoặc dịch vụ khách quan tâm và tính điểm tiềm năng theo cấu hình của bạn.',
        channelTags: ['Gắn nhãn', 'Từ khóa', 'Chấm điểm'],
        characterRole: 'cusi',
      },
      {
        step: 3,
        title: 'Phân công theo SLA',
        subtitle: 'Đúng người, đúng lúc',
        description:
          'Tự động chia khách theo vòng tròn (round-robin) hoặc theo chuyên môn của nhân viên, kèm đồng hồ đếm ngược thời gian phản hồi.',
        channelTags: ['Round-robin', 'SLA 15 phút', 'Định tuyến'],
        characterRole: 'recruiter',
      },
      {
        step: 4,
        title: 'Chăm sóc & Chốt giao dịch',
        subtitle: 'Tối ưu chuyển đổi',
        description:
          'Theo dõi từng khách trên phễu Kanban theo giai đoạn của ngành bạn, đặt lịch hẹn và ghi nhận đặt cọc, thanh toán.',
        channelTags: ['Phễu Kanban', 'Lịch hẹn', 'Doanh thu'],
        characterRole: 'student',
      },
    ],
    slaTitle: 'Cam kết phản hồi khách dưới 5 phút',
    slaDescription: 'Tự động cảnh báo qua Telegram khi nhân viên chưa trả lời khách sau 15 phút.',
    slaCta: 'Xem trải nghiệm thực tế',
    characterLabels: {
      messenger: 'Chim đưa thư PolarisX',
      agent: 'Nhân viên tư vấn',
      customer: 'Khách hàng',
    },
  },
  demo: {
    pill: 'Mô phỏng trải nghiệm thực tế',
    titleLead: 'Hộp thư thông minh',
    titleHighlight: 'cho từng ngành hàng',
    subtitle:
      'Chọn một ngành để xem hệ thống tự bắt tin nhắn, gắn nhãn nhu cầu và chấm điểm khách tiềm năng theo thời gian thực.',
    industryPickerLabel: 'Chọn ngành mô phỏng',
    cycleLabel: 'Chu trình tự động (Bước {current} / {total})',
    reset: 'Làm lại',
    pause: 'Tạm dừng',
    resume: 'Tiếp tục',
    tabs: { chat: 'Chat', conversations: 'Hội thoại (3)', lead: 'Hồ sơ' },
    windowTitle: 'Live Inbox Workspace',
    recentConversations: 'Hội thoại gần đây',
    profileTitle: 'Hồ sơ & Điểm',
    mergedFrom: 'Đã hợp nhất với hồ sơ Zalo',
    scoreLabel: 'Điểm tiềm năng',
    closeChance: 'Khả năng chốt: Rất cao (89%)',
    autoTags: 'Nhãn tự động gán:',
    responseTime: 'Thời gian phản hồi:',
    responseValue: '58 giây',
    inputPlaceholder: 'Nhập câu trả lời hoặc chọn mẫu có sẵn...',
    sendAria: 'Gửi phản hồi demo',
    scoreSuffix: 'đ',
    scenarios: {
      education: {
        label: 'Giáo dục',
        sourceName: 'Fanpage Trung tâm Anh ngữ',
        customerName: 'Nguyễn Minh Quân',
        customerInitials: 'MQ',
        agentName: 'Tư vấn viên Lan Anh',
        customerText: 'Chào trung tâm, em muốn hỏi khóa IELTS 6.5 buổi tối và ưu đãi học phí tháng này ạ.',
        botText: 'Đã ghi nhận nhu cầu IELTS và chuyển cho tư vấn viên phụ trách khóa buổi tối.',
        agentText: 'Chào Quân! Chị Lan Anh gửi em lịch khai giảng và ưu đãi giảm 20% học phí qua Zalo nhé.',
        tags: ['IELTS 6.5', 'Hỏi ưu đãi'],
        followUpTag: 'Hẹn học thử',
        conversations: [
          { id: 'edu-1', name: 'Nguyễn Minh Quân', channel: 'facebook', snippet: 'Em muốn hỏi khóa IELTS...', time: 'Vừa xong', score: 85, tags: ['IELTS', 'Ưu đãi'] },
          { id: 'edu-2', name: 'Trần Thu Hà', channel: 'zalo', snippet: 'Dạ em đã nhận lịch học thử...', time: '12 phút', score: 92, tags: ['Giao tiếp'] },
          { id: 'edu-3', name: 'Phạm Đức Anh', channel: 'facebook', snippet: 'Khi nào khai giảng lớp mới ạ?', time: '28 phút', score: 64, tags: ['Thiếu nhi'] },
        ],
      },
      realEstate: {
        label: 'Bất động sản',
        sourceName: 'Fanpage Dự án căn hộ',
        customerName: 'Lê Hoàng Phúc',
        customerInitials: 'HP',
        agentName: 'Chuyên viên Minh Tuấn',
        customerText: 'Dự án còn căn 2 phòng ngủ tầng trung không anh? Mình cần vay ngân hàng khoảng 70%.',
        botText: 'Đã gắn nhãn căn 2PN, cần vay và chuyển cho chuyên viên phụ trách dự án.',
        agentText: 'Chào anh Phúc! Em gửi anh bảng giá, chính sách vay 0% lãi 18 tháng và hẹn xem nhà mẫu cuối tuần nhé.',
        tags: ['Căn 2PN', 'Cần vay 70%'],
        followUpTag: 'Hẹn xem nhà mẫu',
        conversations: [
          { id: 're-1', name: 'Lê Hoàng Phúc', channel: 'facebook', snippet: 'Còn căn 2 phòng ngủ không...', time: 'Vừa xong', score: 85, tags: ['2PN', 'Cần vay'] },
          { id: 're-2', name: 'Đỗ Thanh Tâm', channel: 'zalo', snippet: 'Anh gửi em sơ đồ tầng 12...', time: '9 phút', score: 90, tags: ['Penthouse'] },
          { id: 're-3', name: 'Vũ Quốc Bảo', channel: 'facebook', snippet: 'Phí quản lý bao nhiêu/m²?', time: '35 phút', score: 58, tags: ['Studio'] },
        ],
      },
      beauty: {
        label: 'Spa & Thẩm mỹ',
        sourceName: 'Zalo OA Chuỗi Spa',
        customerName: 'Trần Bảo Ngọc',
        customerInitials: 'BN',
        agentName: 'Chuyên viên Thảo My',
        customerText: 'Spa ơi, mình muốn đặt lịch chăm sóc da mụn chiều thứ 7, có gói liệu trình nào không?',
        botText: 'Đã gắn nhãn chăm sóc da mụn, khách muốn đặt lịch và chuyển cho chi nhánh gần nhất.',
        agentText: 'Chào chị Ngọc! Em giữ lịch 15:00 thứ 7 và gửi chị gói 10 buổi đang giảm 30% nhé.',
        tags: ['Da mụn', 'Muốn đặt lịch'],
        followUpTag: 'Đã giữ lịch',
        conversations: [
          { id: 'sp-1', name: 'Trần Bảo Ngọc', channel: 'zalo', snippet: 'Mình muốn đặt lịch chăm sóc da...', time: 'Vừa xong', score: 85, tags: ['Da mụn', 'Đặt lịch'] },
          { id: 'sp-2', name: 'Phan Thị Hồng', channel: 'facebook', snippet: 'Gói triệt lông giá bao nhiêu?', time: '6 phút', score: 77, tags: ['Triệt lông'] },
          { id: 'sp-3', name: 'Ngô Mai Chi', channel: 'zalo', snippet: 'Chị muốn đổi lịch sang Chủ nhật...', time: '41 phút', score: 70, tags: ['Khách cũ'] },
        ],
      },
      retail: {
        label: 'Bán lẻ',
        sourceName: 'Fanpage Shop thời trang',
        customerName: 'Hoàng Gia Huy',
        customerInitials: 'GH',
        agentName: 'Nhân viên Khánh Linh',
        customerText: 'Shop ơi áo khoác mẫu mới còn size L màu đen không, ship về Cần Thơ mất mấy ngày?',
        botText: 'Đã gắn nhãn hỏi hàng, size L và chuyển cho nhân viên chốt đơn khu vực miền Tây.',
        agentText: 'Chào anh Huy! Mẫu này còn size L màu đen, giao 2 ngày và miễn phí ship cho đơn từ 500k ạ.',
        tags: ['Áo khoác size L', 'Hỏi phí ship'],
        followUpTag: 'Chờ xác nhận đơn',
        conversations: [
          { id: 'rt-1', name: 'Hoàng Gia Huy', channel: 'facebook', snippet: 'Áo khoác còn size L không...', time: 'Vừa xong', score: 85, tags: ['Áo khoác', 'Size L'] },
          { id: 'rt-2', name: 'Lý Ngọc Trâm', channel: 'zalo', snippet: 'Đơn của mình giao tới đâu rồi?', time: '15 phút', score: 66, tags: ['Đang giao'] },
          { id: 'rt-3', name: 'Mai Anh Thư', channel: 'facebook', snippet: 'Lấy 3 cái có giảm giá không?', time: '22 phút', score: 88, tags: ['Sỉ'] },
        ],
      },
      b2b: {
        label: 'B2B & SaaS',
        sourceName: 'Website & Fanpage công ty',
        customerName: 'Công ty Ánh Dương',
        customerInitials: 'AD',
        agentName: 'Sales Quốc Việt',
        customerText: 'Bên mình cần phần mềm cho 50 nhân viên, có tích hợp hóa đơn điện tử không? Xin báo giá giúp.',
        botText: 'Đã gắn nhãn doanh nghiệp 50 user, cần tích hợp và chuyển cho sales phụ trách khách hàng doanh nghiệp.',
        agentText: 'Chào anh chị! Em gửi báo giá gói Business 50 user và đề xuất lịch demo 30 phút vào thứ Ba ạ.',
        tags: ['50 user', 'Cần báo giá'],
        followUpTag: 'Đã đặt lịch demo',
        conversations: [
          { id: 'b2-1', name: 'Công ty Ánh Dương', channel: 'facebook', snippet: 'Xin báo giá cho 50 nhân viên...', time: 'Vừa xong', score: 85, tags: ['50 user', 'Báo giá'] },
          { id: 'b2-2', name: 'Logistics Phương Nam', channel: 'zalo', snippet: 'Bên em muốn dùng thử 14 ngày...', time: '18 phút', score: 81, tags: ['Dùng thử'] },
          { id: 'b2-3', name: 'Agency Sao Mai', channel: 'facebook', snippet: 'Có API kết nối website không?', time: '50 phút', score: 62, tags: ['API'] },
        ],
      },
    },
  },
  dashboard: {
    pill: 'Báo cáo & Phân tích chuyên sâu',
    titleLead: 'Kiểm soát toàn diện hiệu suất qua',
    titleHighlight: 'bảng điều khiển trực quan',
    subtitle:
      'Số khách mới, tỷ lệ chốt, phân bổ theo kênh, doanh thu theo sản phẩm và năng suất từng nhân viên đều được cập nhật theo thời gian thực cho từng workspace.',
    kpis: [
      { label: 'Khách mới trong tháng', value: '4.820', note: '+28.4% so với tháng trước' },
      { label: 'Giao dịch thành công', value: '1.145', note: 'Tỷ lệ chuyển đổi: 23.7%' },
      { label: 'Doanh thu thực thu', value: '8.65 tỷ', note: 'Đạt 112% chỉ tiêu' },
      { label: 'Đạt chuẩn SLA 15 phút', value: '98.2%', note: 'Phản hồi trung bình: 2.4 phút' },
    ],
    chartTitle: 'Hiệu quả phễu và phân bổ đa kênh',
    chartSubtitle: 'Ví dụ tổng hợp từ 4 workspace thuộc 4 ngành khác nhau',
    tabs: {
      trends: { short: 'Xu hướng', long: 'Xu hướng khách mới' },
      products: { short: 'Sản phẩm', long: 'Sản phẩm / Dịch vụ' },
      channels: { short: 'Kênh', long: 'Tỷ trọng kênh' },
    },
    weekdays: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    products: [
      { name: 'Khóa IELTS 6.5+', value: '1.420' },
      { name: 'Liệu trình da', value: '1.180' },
      { name: 'Căn hộ 2PN', value: '890' },
      { name: 'Gói phần mềm Pro', value: '1.330' },
    ],
    channelLegend: ['Facebook Fanpage:', 'Zalo OA & Chat:', 'Excel / Sự kiện:', 'Khác (Website, Hotline):'],
    totalLeads: 'Tổng khách',
  },
  testimonials: {
    pill: 'Niềm tin từ nhiều ngành hàng',
    titleLead: 'Được tin dùng bởi',
    titleHighlight: 'doanh nghiệp ở nhiều lĩnh vực',
    subtitleBefore: 'Chia sẻ từ những người trực tiếp vận hành đội ngũ tư vấn và bán hàng với Polaris',
    subtitleAfter: '.',
    items: [
      {
        id: 'test-edu',
        quote:
          'Mùa cao điểm tuyển sinh, chúng tôi không còn sót tin nhắn nào của phụ huynh. Thời gian phản hồi giảm từ 3 tiếng xuống chưa đầy 5 phút.',
        author: 'Nguyễn Văn Hùng',
        role: 'Trưởng phòng Tuyển sinh',
        organization: 'Hệ thống trung tâm Anh ngữ (8 cơ sở)',
        avatarText: 'NH',
        metricsResult: 'Tăng 42% học viên đăng ký sớm',
      },
      {
        id: 'test-re',
        quote:
          'Khách hỏi dự án qua cả Zalo lẫn Facebook, trước đây hai môi giới thường gọi trùng một người. Giờ mỗi khách chỉ có một hồ sơ và một người phụ trách.',
        author: 'Lê Hoàng Khôi',
        role: 'Giám đốc Kinh doanh',
        organization: 'Sàn giao dịch bất động sản tại TP.HCM',
        avatarText: 'LK',
        metricsResult: 'Loại bỏ 100% tình trạng trùng khách',
      },
      {
        id: 'test-spa',
        quote:
          'Nhân viên lễ tân làm quen hộp thư 3 cột chỉ trong một buổi sáng. Lịch hẹn từ Zalo và Facebook giờ nằm chung một chỗ, không còn ghi sổ tay.',
        author: 'Trần Thị Mai Phương',
        role: 'Quản lý vận hành',
        organization: 'Chuỗi spa & thẩm mỹ (5 chi nhánh)',
        avatarText: 'MP',
        metricsResult: 'Tiết kiệm 3 giờ xử lý mỗi ngày',
      },
      {
        id: 'test-retail',
        quote:
          'Đơn hỏi hàng trên Fanpage được gắn nhãn sản phẩm và chuyển ngay cho người chốt đơn. Tỷ lệ khách hỏi rồi mua tăng rõ rệt sau một tháng.',
        author: 'Phạm Quốc Đạt',
        role: 'Chủ cửa hàng',
        organization: 'Thương hiệu thời trang bán online',
        avatarText: 'QĐ',
        metricsResult: 'Tăng 35% tỷ lệ chốt đơn',
      },
    ],
    goTo: 'Đi tới đánh giá',
    prev: 'Đánh giá trước',
    next: 'Đánh giá kế tiếp',
  },
  cta: {
    pill: 'Sẵn sàng chuyển đổi số cùng PolarisX',
    title: 'Bứt phá doanh số ngay hôm nay',
    subtitle:
      'Trải nghiệm CRM hội thoại đa kênh hoàn chỉnh: gom tin nhắn tự động, phân loại tức thì, phễu bán hàng theo đúng ngành của bạn và tăng tốc độ chốt giao dịch lên gấp 3 lần.',
    checklist: ['Triển khai nhanh dưới 24 giờ', 'Mẫu cấu hình cho từng ngành', 'Hỗ trợ kỹ thuật 24/7'],
    primary: 'Bắt đầu dùng thử miễn phí',
    secondary: 'Tìm hiểu thêm các tính năng',
    mascot: 'Sẵn sàng bứt phá! 🎉',
  },
  footer: {
    description:
      'Nền tảng CRM hội thoại đa kênh, đa ngành: gom tin nhắn, chăm sóc và chốt giao dịch cho giáo dục, bất động sản, spa, bán lẻ và doanh nghiệp B2B.',
    emailAria: 'Email liên hệ',
    portalAria: 'Cổng thông tin',
    featuresTitle: 'Tính năng nổi bật',
    featureLinks: [
      'Hộp thư hợp nhất 3 cột',
      'Phân loại & chấm điểm tự động',
      'Phân công SLA tự động',
      'Hợp nhất định danh khách hàng',
      'Bảng điều khiển & KPI thời gian thực',
    ],
    channelsTitle: 'Kênh kết nối',
    channels: [
      'Facebook Fanpage Graph API',
      'Zalo Official Account (OA)',
      'Zalo cá nhân (Webhook)',
      'Nhập tệp Excel / CSV',
      'Cảnh báo tức thì Telegram Bot',
    ],
    securityTitle: 'An toàn dữ liệu',
    securityItems: ['Phân quyền RBAC đa cấp', 'Chống rò rỉ BOLA / IDOR'],
    privacy: 'Chính sách bảo mật',
    terms: 'Điều khoản dịch vụ',
    status: 'Trạng thái hệ thống (99.9% uptime)',
    rights: 'Mọi quyền được bảo lưu.',
    madeFor: 'Phát triển tận tâm cho doanh nghiệp Việt',
  },
};

const en: LandingContent = {
  nav: {
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Industries', href: '#industries' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Live demo', href: '#live-demo' },
      { label: 'Reviews', href: '#testimonials' },
    ],
    homeAria: 'PolarisX Conversational CRM home',
    brandSubtitle: 'Conversational CRM',
    goToCrm: 'Open CRM',
    login: 'Log in',
    tryFree: 'Try it free',
    loginMobile: 'Log in',
    tryMobile: 'Try PolarisX now',
    menuAria: 'Open menu',
    themeAria: 'Toggle light/dark theme',
    languageAria: 'Switch language',
  },
  hero: {
    pill: 'Multi-industry conversational CRM',
    titleLead: 'One Inbox for Every Customer, in Every Industry, with',
    subtitle:
      'Bring Zalo, Facebook Page and Excel leads into one place. Automatically classify and score prospects and route them to the right rep, whether you sell courses, property, spa treatments, retail goods or B2B services.',
    ctaDashboard: 'Open CRM dashboard',
    ctaTry: 'Try PolarisX for free',
    ctaDemo: 'Watch the live demo',
    trust: [
      'Ready-made setups for 5 industries',
      'Per-workspace role-based access',
      'Works smoothly on phone and desktop',
    ],
    floatingBadges: ['Zalo OA & Personal', 'Facebook Page', 'Telegram alerts'],
    mascot: 'Hi from PolarisX! 👋',
    mock: {
      online: 'Live',
      conversations: 'Conversations (24)',
      newCount: '5 new',
      list: [
        { name: 'Nguyen Minh Quan', source: 'Facebook', snippet: 'Any 2-bedroom units left?' },
        { name: 'Tran Bao Ngoc', source: 'Zalo OA', snippet: 'I would like to book a facial...' },
        { name: 'Le Hoang Nam', source: 'Excel', snippet: 'Quote for 50 software seats...' },
      ],
      chatName: 'Nguyen Minh Quan',
      typing: 'Typing',
      score: 'Score: 85/100',
      customerMsg: 'Hi, do you still have 2-bedroom units facing south-east? I need a 70% bank loan.',
      botMsgBefore: 'Hi Quan! We tagged this as ',
      botTag: '#2-bedroom',
      botMsgAfter: ' and passed it to the project specialist right away.',
      inputHint: 'Type a reply or pick a saved answer...',
      leadPanelTitle: 'Customer details',
      sourceLabel: 'Source:',
      sourceValue: 'Facebook Page',
      phoneLabel: 'Phone:',
      zaloLabel: 'Zalo:',
      zaloValue: 'Merged',
      autoTagsLabel: 'Auto tags:',
      tags: ['2-bedroom', 'Needs loan'],
    },
  },
  stats: [
    {
      value: '10,000+',
      numericValue: 10000,
      suffix: '+',
      label: 'Messages / day',
      description: 'Handles Facebook Page, Zalo OA and personal Zalo conversations with ease',
    },
    {
      value: '-65%',
      numericValue: 65,
      suffix: '%',
      label: 'Response time',
      description: 'Leads are classified and routed to the right rep within seconds',
    },
    {
      value: '3.2x',
      numericValue: 3.2,
      suffix: 'x',
      label: 'Close rate',
      description: 'Follow up at the right moment and never lose a promising lead',
    },
    {
      value: '5+',
      numericValue: 5,
      suffix: '+',
      label: 'Industry templates',
      description: 'Education, real estate, spa, retail, B2B, or customize for your own',
    },
  ],
  industries: {
    pill: 'One platform, many industries',
    titleLead: 'Adapts to',
    titleHighlight: 'the way you sell',
    subtitle:
      'Pick an industry template when you create a workspace and get pipeline stages, terminology, product catalog and scoring rules set up for you. Each branch or brand can run in its own workspace.',
    stagesLabel: 'Sample pipeline',
    termsLabel: 'Terminology',
    items: [
      {
        id: 'education',
        name: 'Education & Training',
        description: 'Schools, language centers, skills and vocational training.',
        stages: ['New inquiry', 'Consulting', 'Trial class', 'Enrolled'],
        terms: ['Student', 'Course', 'Tuition'],
      },
      {
        id: 'realEstate',
        name: 'Real Estate',
        description: 'Agencies, developers and project sales teams.',
        stages: ['Interested', 'Site visit', 'Deposit', 'Contract signed'],
        terms: ['Buyer', 'Unit / Lot', 'Unit value'],
      },
      {
        id: 'beauty',
        name: 'Spa & Beauty',
        description: 'Spas, aesthetic clinics, dental and service clinics.',
        stages: ['Price inquiry', 'Booked', 'First visit', 'Package sold'],
        terms: ['Client', 'Treatment', 'Package price'],
      },
      {
        id: 'retail',
        name: 'Retail & E-commerce',
        description: 'Fashion, cosmetics and home goods sold via social media.',
        stages: ['Product inquiry', 'Order placed', 'Shipping', 'Delivered'],
        terms: ['Shopper', 'Product', 'Order value'],
      },
      {
        id: 'b2b',
        name: 'B2B Services & SaaS',
        description: 'Software, agencies, logistics and business services.',
        stages: ['New lead', 'Demo', 'Proposal', 'Closed won'],
        terms: ['Company', 'Plan', 'Contract value'],
      },
    ],
    customNoteTitle: "Don't see your industry?",
    customNote:
      'Name your own stages, terminology, product catalog and scoring rules in Workspace settings. No coding needed.',
  },
  features: {
    pill: 'Everything in one place',
    titleLead: 'Every Sales & Customer Care Tool You Need, Inside',
    subtitle:
      'Built for any team that sells and supports customers over chat: training centers, property agencies, spa chains, online shops and B2B companies.',
    inbox: {
      badge: 'Central hub',
      title: 'Unified 3-Column Inbox',
      description:
        'All messages from Facebook Pages, Zalo OA and personal Zalo in one 3-column view. Reps reply on every channel from one screen, with no app switching.',
      chips: ['Facebook Chat', 'Zalo OA & Personal', 'Quick Excel import'],
    },
    scoring: {
      title: 'Automatic Tagging & Lead Scoring',
      description:
        'Reads each message to tag the product of interest, budget and buying timeline, then scores the lead from 0 to 100 using your own criteria.',
      meter: 'Hot lead (85)',
    },
    pipeline: {
      title: 'Custom Sales Pipeline & SLA',
      description:
        'Drag customers through the stages you define. SLA countdowns (15 or 30 minutes) make sure no customer is left waiting.',
      footer: '⏱ SLA countdown: 12 min left',
    },
    identity: {
      title: 'Cross-Channel Identity Merge',
      description:
        'Detects and merges duplicate profiles when the same customer messages on Facebook and asks again on Zalo with their phone number.',
      footer: '✓ One profile across every channel',
    },
    timeline: {
      title: 'End-to-End Deal Timeline',
      description:
        'Keep chat history, rep notes, quotes, contracts and deposit receipts together, clear and secure.',
      footer: 'Real-time change log (audit trail)',
    },
    alerts: {
      title: 'Instant Telegram / Email Alerts',
      description:
        'Get a Telegram bot alert when a customer leaves their details, books an appointment, misses an SLA, or a hot lead needs attention.',
      footer: 'Alert delivery: < 1 second',
    },
    reports: {
      title: 'Real-Time Reports & Analytics',
      description:
        'Track conversion rates, each rep’s performance and expected revenue by product, and export to Excel / CSV in one click.',
      footer: 'UTF-8 BOM export that opens correctly in Excel',
    },
    security: {
      title: 'RBAC Security & BOLA Protection',
      description:
        'Owner and Staff permissions are separated in every workspace. Unauthorized access is always blocked with a 403.',
      footer: '✓ Access checks on every ID-based route',
    },
  },
  how: {
    pill: 'How it works',
    titleLead: 'From the first message to',
    titleHighlight: 'a closed deal',
    subtitleBefore: 'With 4 fully automated steps, Polaris',
    subtitleAfter: ' CRM helps sales and support teams work 3x faster and never keep a customer waiting.',
    stepLabel: 'Step',
    steps: [
      {
        step: 1,
        title: 'Capture every channel',
        subtitle: 'Instant sync',
        description:
          'Collect every message from Facebook Pages, Zalo OA, personal Zalo and Excel files into one conversation inbox.',
        channelTags: ['Facebook', 'Zalo OA', 'Personal Zalo', 'Excel'],
        characterRole: 'messenger',
      },
      {
        step: 2,
        title: 'Classify automatically',
        subtitle: 'Smart scoring',
        description:
          'The system reads each message, tags the product or service the customer wants and scores the lead using your configuration.',
        channelTags: ['Tagging', 'Keywords', 'Scoring'],
        characterRole: 'cusi',
      },
      {
        step: 3,
        title: 'Assign with SLAs',
        subtitle: 'Right rep, right time',
        description:
          'Distribute customers round-robin or by rep expertise, with a countdown on every first response.',
        channelTags: ['Round-robin', '15-min SLA', 'Routing'],
        characterRole: 'recruiter',
      },
      {
        step: 4,
        title: 'Nurture & close',
        subtitle: 'Higher conversion',
        description:
          'Track each customer on a Kanban pipeline built for your industry, book appointments and record deposits and payments.',
        channelTags: ['Kanban pipeline', 'Appointments', 'Revenue'],
        characterRole: 'student',
      },
    ],
    slaTitle: 'Reply to customers in under 5 minutes',
    slaDescription: 'Telegram alerts fire automatically when a rep hasn’t replied within 15 minutes.',
    slaCta: 'See it in action',
    characterLabels: {
      messenger: 'PolarisX messenger bird',
      agent: 'Sales rep',
      customer: 'Customer',
    },
  },
  demo: {
    pill: 'Interactive simulation',
    titleLead: 'A smart inbox',
    titleHighlight: 'for every industry',
    subtitle:
      'Pick an industry to watch the system catch a message, tag the customer’s needs and score the lead in real time.',
    industryPickerLabel: 'Choose an industry',
    cycleLabel: 'Auto sequence (step {current} / {total})',
    reset: 'Restart',
    pause: 'Pause',
    resume: 'Resume',
    tabs: { chat: 'Chat', conversations: 'Chats (3)', lead: 'Profile' },
    windowTitle: 'Live Inbox Workspace',
    recentConversations: 'Recent conversations',
    profileTitle: 'Profile & score',
    mergedFrom: 'Merged with Zalo profile',
    scoreLabel: 'Lead score',
    closeChance: 'Close likelihood: very high (89%)',
    autoTags: 'Auto-applied tags:',
    responseTime: 'Response time:',
    responseValue: '58 seconds',
    inputPlaceholder: 'Type a reply or pick a template...',
    sendAria: 'Send demo reply',
    scoreSuffix: ' pts',
    scenarios: {
      education: {
        label: 'Education',
        sourceName: 'Language center Facebook Page',
        customerName: 'Nguyen Minh Quan',
        customerInitials: 'MQ',
        agentName: 'Advisor Lan Anh',
        customerText: 'Hi, I’d like to ask about the evening IELTS 6.5 course and this month’s tuition offer.',
        botText: 'IELTS inquiry recorded and routed to the advisor for evening classes.',
        agentText: 'Hi Quan! I’ll send you the start dates and the 20% tuition discount on Zalo.',
        tags: ['IELTS 6.5', 'Asked about offer'],
        followUpTag: 'Trial class booked',
        conversations: [
          { id: 'edu-1', name: 'Nguyen Minh Quan', channel: 'facebook', snippet: 'Asking about the IELTS course...', time: 'Just now', score: 85, tags: ['IELTS', 'Offer'] },
          { id: 'edu-2', name: 'Tran Thu Ha', channel: 'zalo', snippet: 'Got the trial class schedule...', time: '12 min', score: 92, tags: ['Speaking'] },
          { id: 'edu-3', name: 'Pham Duc Anh', channel: 'facebook', snippet: 'When does the new class start?', time: '28 min', score: 64, tags: ['Kids'] },
        ],
      },
      realEstate: {
        label: 'Real estate',
        sourceName: 'Apartment project Facebook Page',
        customerName: 'Le Hoang Phuc',
        customerInitials: 'HP',
        agentName: 'Specialist Minh Tuan',
        customerText: 'Any mid-floor 2-bedroom units left? I’ll need a bank loan for about 70%.',
        botText: 'Tagged as 2-bedroom, needs a loan, and routed to the project specialist.',
        agentText: 'Hi Phuc! Here is the price list and the 18-month 0% interest loan offer. Shall we book a show-unit visit this weekend?',
        tags: ['2-bedroom', 'Needs 70% loan'],
        followUpTag: 'Site visit booked',
        conversations: [
          { id: 're-1', name: 'Le Hoang Phuc', channel: 'facebook', snippet: 'Any 2-bedroom units left...', time: 'Just now', score: 85, tags: ['2BR', 'Loan'] },
          { id: 're-2', name: 'Do Thanh Tam', channel: 'zalo', snippet: 'Please send the 12th floor plan...', time: '9 min', score: 90, tags: ['Penthouse'] },
          { id: 're-3', name: 'Vu Quoc Bao', channel: 'facebook', snippet: 'What is the service fee per m²?', time: '35 min', score: 58, tags: ['Studio'] },
        ],
      },
      beauty: {
        label: 'Spa & beauty',
        sourceName: 'Spa chain Zalo OA',
        customerName: 'Tran Bao Ngoc',
        customerInitials: 'BN',
        agentName: 'Specialist Thao My',
        customerText: 'Hi, I’d like to book an acne facial on Saturday afternoon. Do you have treatment packages?',
        botText: 'Tagged as acne care, wants to book, and routed to the nearest branch.',
        agentText: 'Hi Ngoc! I’ve held 3:00 PM on Saturday for you and sent the 10-session package at 30% off.',
        tags: ['Acne care', 'Wants to book'],
        followUpTag: 'Slot held',
        conversations: [
          { id: 'sp-1', name: 'Tran Bao Ngoc', channel: 'zalo', snippet: 'I’d like to book a facial...', time: 'Just now', score: 85, tags: ['Acne', 'Booking'] },
          { id: 'sp-2', name: 'Phan Thi Hong', channel: 'facebook', snippet: 'How much is laser hair removal?', time: '6 min', score: 77, tags: ['Hair removal'] },
          { id: 'sp-3', name: 'Ngo Mai Chi', channel: 'zalo', snippet: 'Can I move my visit to Sunday...', time: '41 min', score: 70, tags: ['Returning'] },
        ],
      },
      retail: {
        label: 'Retail',
        sourceName: 'Fashion shop Facebook Page',
        customerName: 'Hoang Gia Huy',
        customerInitials: 'GH',
        agentName: 'Sales rep Khanh Linh',
        customerText: 'Do you still have the new jacket in black, size L? How long is shipping to Can Tho?',
        botText: 'Tagged as product inquiry, size L, and routed to the Mekong region sales rep.',
        agentText: 'Hi Huy! Black size L is in stock, delivery takes 2 days and shipping is free on orders over 500k.',
        tags: ['Jacket size L', 'Shipping question'],
        followUpTag: 'Awaiting order confirmation',
        conversations: [
          { id: 'rt-1', name: 'Hoang Gia Huy', channel: 'facebook', snippet: 'Jacket in size L still available...', time: 'Just now', score: 85, tags: ['Jacket', 'Size L'] },
          { id: 'rt-2', name: 'Ly Ngoc Tram', channel: 'zalo', snippet: 'Where is my order now?', time: '15 min', score: 66, tags: ['Shipping'] },
          { id: 'rt-3', name: 'Mai Anh Thu', channel: 'facebook', snippet: 'Any discount if I buy 3?', time: '22 min', score: 88, tags: ['Bulk'] },
        ],
      },
      b2b: {
        label: 'B2B & SaaS',
        sourceName: 'Company website & Facebook Page',
        customerName: 'Anh Duong Co.',
        customerInitials: 'AD',
        agentName: 'Sales rep Quoc Viet',
        customerText: 'We need software for 50 employees. Does it integrate with e-invoicing? Please send a quote.',
        botText: 'Tagged as 50-seat company needing integration and routed to the enterprise sales rep.',
        agentText: 'Hello! I’ve sent the Business plan quote for 50 seats and suggest a 30-minute demo on Tuesday.',
        tags: ['50 seats', 'Needs quote'],
        followUpTag: 'Demo scheduled',
        conversations: [
          { id: 'b2-1', name: 'Anh Duong Co.', channel: 'facebook', snippet: 'Quote for 50 employees...', time: 'Just now', score: 85, tags: ['50 seats', 'Quote'] },
          { id: 'b2-2', name: 'Phuong Nam Logistics', channel: 'zalo', snippet: 'We’d like a 14-day trial...', time: '18 min', score: 81, tags: ['Trial'] },
          { id: 'b2-3', name: 'Sao Mai Agency', channel: 'facebook', snippet: 'Is there an API for our website?', time: '50 min', score: 62, tags: ['API'] },
        ],
      },
    },
  },
  dashboard: {
    pill: 'Reports & deep analytics',
    titleLead: 'Full visibility into performance with',
    titleHighlight: 'a clear, visual dashboard',
    subtitle:
      'New customers, close rate, channel mix, revenue by product and each rep’s productivity update in real time for every workspace.',
    kpis: [
      { label: 'New customers this month', value: '4,820', note: '+28.4% vs last month' },
      { label: 'Deals won', value: '1,145', note: 'Conversion rate: 23.7%' },
      { label: 'Collected revenue', value: '8.65B ₫', note: '112% of target' },
      { label: '15-min SLA met', value: '98.2%', note: 'Avg. response: 2.4 min' },
    ],
    chartTitle: 'Pipeline performance and channel mix',
    chartSubtitle: 'Sample roll-up across 4 workspaces in 4 different industries',
    tabs: {
      trends: { short: 'Trend', long: 'New customer trend' },
      products: { short: 'Products', long: 'Products / Services' },
      channels: { short: 'Channels', long: 'Channel mix' },
    },
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    products: [
      { name: 'IELTS 6.5+ course', value: '1,420' },
      { name: 'Skin treatment', value: '1,180' },
      { name: '2-bedroom unit', value: '890' },
      { name: 'Software Pro plan', value: '1,330' },
    ],
    channelLegend: ['Facebook Page:', 'Zalo OA & Chat:', 'Excel / Events:', 'Other (Website, Hotline):'],
    totalLeads: 'Total customers',
  },
  testimonials: {
    pill: 'Trusted across industries',
    titleLead: 'Trusted by',
    titleHighlight: 'businesses in many fields',
    subtitleBefore: 'Hear from the people who run their sales and support teams with Polaris',
    subtitleAfter: '.',
    items: [
      {
        id: 'test-edu',
        quote:
          'During peak enrollment season we no longer miss a single parent’s message. Response time dropped from 3 hours to under 5 minutes.',
        author: 'Nguyen Van Hung',
        role: 'Head of Admissions',
        organization: 'English language center network (8 campuses)',
        avatarText: 'NH',
        metricsResult: '42% more early registrations',
      },
      {
        id: 'test-re',
        quote:
          'Buyers ask about projects on both Zalo and Facebook, and two agents used to call the same person. Now every buyer has one profile and one owner.',
        author: 'Le Hoang Khoi',
        role: 'Sales Director',
        organization: 'Real estate agency in Ho Chi Minh City',
        avatarText: 'LK',
        metricsResult: 'Duplicate leads eliminated',
      },
      {
        id: 'test-spa',
        quote:
          'Our front desk learned the 3-column inbox in one morning. Bookings from Zalo and Facebook now live in one place instead of a notebook.',
        author: 'Tran Thi Mai Phuong',
        role: 'Operations Manager',
        organization: 'Spa & beauty chain (5 branches)',
        avatarText: 'MP',
        metricsResult: '3 hours saved every day',
      },
      {
        id: 'test-retail',
        quote:
          'Product questions on our Page get tagged and handed to whoever closes the order. Our inquiry-to-purchase rate went up noticeably within a month.',
        author: 'Pham Quoc Dat',
        role: 'Store owner',
        organization: 'Online fashion brand',
        avatarText: 'QD',
        metricsResult: '35% higher order close rate',
      },
    ],
    goTo: 'Go to review',
    prev: 'Previous review',
    next: 'Next review',
  },
  cta: {
    pill: 'Ready to go digital with PolarisX',
    title: 'Grow your sales starting today',
    subtitle:
      'Get a complete multi-channel conversational CRM: automatic message capture, instant classification, a pipeline built for your industry and deals closed up to 3x faster.',
    checklist: ['Up and running in under 24 hours', 'Templates for every industry', '24/7 technical support'],
    primary: 'Start your free trial',
    secondary: 'Explore all features',
    mascot: 'Ready to grow! 🎉',
  },
  footer: {
    description:
      'A multi-channel, multi-industry conversational CRM to capture messages, nurture customers and close deals in education, real estate, spa, retail and B2B.',
    emailAria: 'Contact email',
    portalAria: 'Website',
    featuresTitle: 'Key features',
    featureLinks: [
      'Unified 3-column inbox',
      'Automatic tagging & scoring',
      'SLA-based assignment',
      'Customer identity merge',
      'Real-time dashboard & KPIs',
    ],
    channelsTitle: 'Channels',
    channels: [
      'Facebook Page Graph API',
      'Zalo Official Account (OA)',
      'Personal Zalo (webhook)',
      'Excel / CSV import',
      'Telegram Bot alerts',
    ],
    securityTitle: 'Data security',
    securityItems: ['Multi-level RBAC', 'BOLA / IDOR protection'],
    privacy: 'Privacy policy',
    terms: 'Terms of service',
    status: 'System status (99.9% uptime)',
    rights: 'All rights reserved.',
    madeFor: 'Built with care for growing businesses',
  },
};

export const LANDING_CONTENT: Record<Locale, LandingContent> = { vi, en };
