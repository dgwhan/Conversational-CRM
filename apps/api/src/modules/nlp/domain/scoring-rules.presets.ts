/**
 * Danh mục Quy tắc Từ khóa Mẫu & Benchmark (Scoring Rules Presets)
 * Áp dụng cho bài toán Tìm kiếm & Đánh giá Khách hàng Tiềm năng đa ngành nghề (Multi-domain CRM).
 * Được tách thành file cấu hình riêng biệt để dễ dàng quản trị, cập nhật và tái sử dụng.
 */

import type { KeywordRuleItem } from '../keyword-scoring.js';
import { SCORING_RULE_GROUPS } from './scoring.constants.js';

/**
 * Bộ quy tắc từ khóa chuẩn đa ngành dùng cho Benchmark và đánh giá chất lượng hội thoại
 */
export const MULTI_DOMAIN_BENCHMARK_RULES: KeywordRuleItem[] = [
  // 1. Nhóm Quan tâm chi phí, giá cả, tư vấn (+2 đến +3 điểm)
  {
    id: 'rule-bao-gia',
    keyword: 'báo giá',
    weight: 3,
    group: SCORING_RULE_GROUPS.INTERESTED,
    isActive: true,
    description: 'Khách hỏi báo giá dịch vụ / sản phẩm',
  },
  {
    id: 'rule-bang-gia',
    keyword: 'bảng giá',
    weight: 3,
    group: SCORING_RULE_GROUPS.INTERESTED,
    isActive: true,
    description: 'Khách xin bảng giá chi tiết',
  },
  {
    id: 'rule-chi-phi',
    keyword: 'chi phí',
    weight: 3,
    group: SCORING_RULE_GROUPS.INTERESTED,
    isActive: true,
    description: 'Khách hỏi chi phí thực hiện / triển khai',
  },
  {
    id: 'rule-gia-ca',
    keyword: 'giá cả',
    weight: 3,
    group: SCORING_RULE_GROUPS.INTERESTED,
    isActive: true,
    description: 'Khách hỏi giá cả chung',
  },
  {
    id: 'rule-tv',
    keyword: 'tư vấn',
    weight: 2,
    group: SCORING_RULE_GROUPS.INTERESTED,
    isActive: true,
    description: 'Khách yêu cầu tư vấn thông tin',
  },
  {
    id: 'rule-lich',
    keyword: 'lịch',
    weight: 3,
    group: SCORING_RULE_GROUPS.INTERESTED,
    isActive: true,
    description: 'Khách hỏi lịch hẹn / lịch triển khai / lịch làm việc',
  },

  // 2. Nhóm Sẵn sàng chuyển đổi / Chốt deal / Đăng ký (+5 điểm)
  {
    id: 'rule-dk',
    keyword: 'đăng ký',
    weight: 5,
    group: SCORING_RULE_GROUPS.READY_TO_CONVERT,
    isActive: true,
    description: 'Khách muốn đăng ký mua / sử dụng dịch vụ',
  },
  {
    id: 'rule-dat-coc',
    keyword: 'đặt cọc',
    weight: 5,
    group: SCORING_RULE_GROUPS.READY_TO_CONVERT,
    isActive: true,
    description: 'Khách muốn đặt cọc tiền giữ sản phẩm / vị trí',
  },
  {
    id: 'rule-giu-cho',
    keyword: 'giữ chỗ',
    weight: 5,
    group: SCORING_RULE_GROUPS.READY_TO_CONVERT,
    isActive: true,
    description: 'Khách yêu cầu giữ chỗ suất ưu đãi',
  },
  {
    id: 'rule-ky-hop-dong',
    keyword: 'ký hợp đồng',
    weight: 5,
    group: SCORING_RULE_GROUPS.READY_TO_CONVERT,
    isActive: true,
    description: 'Khách muốn tiến hành ký kết hợp đồng',
  },

  // 3. Nhóm Hồ sơ / Giấy tờ xác thực (+3 điểm)
  {
    id: 'rule-cccd',
    keyword: 'cccd',
    weight: 3,
    group: SCORING_RULE_GROUPS.INFO_OR_DOCS,
    isActive: true,
    description: 'Khách cung cấp CCCD / định danh',
  },
  {
    id: 'rule-ho-so',
    keyword: 'hồ sơ',
    weight: 3,
    group: SCORING_RULE_GROUPS.INFO_OR_DOCS,
    isActive: true,
    description: 'Khách gửi hồ sơ doanh nghiệp / hồ sơ đăng ký',
  },

  // 4. Nhóm Loại trừ / Spam / Ứng tuyển (-100 điểm)
  {
    id: 'rule-spam',
    keyword: 'tuyển dụng',
    weight: -100,
    group: SCORING_RULE_GROUPS.EXCLUSION,
    isActive: true,
    description: 'Hỏi tuyển dụng nhân sự (không phải khách mua)',
  },
  {
    id: 'rule-ung-tuyen',
    keyword: 'ứng tuyển',
    weight: -100,
    group: SCORING_RULE_GROUPS.EXCLUSION,
    isActive: true,
    description: 'Ứng tuyển việc làm',
  },
  {
    id: 'rule-quang-cao',
    keyword: 'quảng cáo',
    weight: -100,
    group: SCORING_RULE_GROUPS.EXCLUSION,
    isActive: true,
    description: 'Spam dịch vụ quảng cáo',
  },
  {
    id: 'rule-chao-ban',
    keyword: 'chào bán',
    weight: -100,
    group: SCORING_RULE_GROUPS.EXCLUSION,
    isActive: true,
    description: 'Chào bán dịch vụ bên ngoài',
  },
];

