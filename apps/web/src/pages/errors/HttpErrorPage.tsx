import React, { useState } from 'react';
import {
  AlertCircle,
  ShieldAlert,
  Lock,
  Clock,
  ServerCrash,
  WifiOff,
  RefreshCw,
  Home,
  MapPin,
  ChevronDown,
  ChevronUp,
  LogIn,
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { useTranslation } from '../../i18n/index.js';

export interface HttpErrorPageProps {
  statusCode: number;
  errorMessage?: string;
  errorLocation?: string;
  errorDetails?: unknown;
  onRetry?: () => void;
  onGoHome?: () => void;
}

export const HttpErrorPage: React.FC<HttpErrorPageProps> = ({
  statusCode,
  errorMessage,
  errorLocation,
  errorDetails,
  onRetry = () => window.location.reload(),
  onGoHome = () => (window.location.href = '/'),
}) => {
  const { t } = useTranslation();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Cấu hình nội dung và gợi ý chuyên biệt cho từng mã HTTP
  const getErrorConfig = () => {
    switch (statusCode) {
      case 400:
        return {
          code: '400',
          badgeText: 'Bad Request',
          title: t('errors.code400Title', 'Yêu Cầu Không Hợp Lệ (400)'),
          desc: t('errors.code400Desc', 'Máy chủ không thể xử lý yêu cầu do dữ liệu gửi lên bị sai cấu trúc, thiếu tham số bắt buộc hoặc vi phạm kiểm thực Zod.'),
          icon: <AlertCircle size={36} className="text-warning" />,
          advice: t('errors.code400Advice', 'Vui lòng kiểm tra lại cấu trúc trường dữ liệu (Kênh, Người gửi, Thời gian) hoặc tham số URL.'),
          variantClass: 'theme-warning',
        };
      case 401:
        return {
          code: '401',
          badgeText: 'Unauthorized',
          title: t('errors.code401Title', 'Chưa Xác Thực Danh Tính (401)'),
          desc: t('errors.code401Desc', 'Phiên làm việc của bạn đã hết hạn hoặc bạn chưa cung cấp mã truy cập (Access Token / Chữ ký Webhook) hợp lệ.'),
          icon: <Lock size={36} className="text-danger" />,
          advice: t('errors.code401Advice', 'Vui lòng đăng nhập lại tài khoản CRM hoặc kiểm tra chữ ký HMAC trong trường hợp gọi Webhook.'),
          variantClass: 'theme-danger',
        };
      case 403:
        return {
          code: '403',
          badgeText: 'Forbidden',
          title: t('errors.code403Title', 'Từ Chối Quyền Truy Cập (403)'),
          desc: t('errors.code403Desc', 'Bạn không có quyền hạn (Vai trò nhân viên / Role) để truy cập hoặc thực thi hành động này trên hệ thống.'),
          icon: <ShieldAlert size={36} className="text-danger" />,
          advice: t('errors.code403Advice', 'Liên hệ quản trị viên (ADMIN) để được cấp quyền quản lý tính năng tương ứng.'),
          variantClass: 'theme-danger',
        };
      case 404:
        return {
          code: '404',
          badgeText: 'Not Found',
          title: t('errors.code404Title', 'Không Tìm Thấy Trang (404)'),
          desc: t('errors.code404Desc', 'Không tìm thấy tài nguyên hoặc bạn không có quyền truy cập liên kết này.'),
          icon: <AlertCircle size={36} className="text-warning" />,
          advice: t('errors.code404Advice', 'Vui lòng kiểm tra lại đường dẫn URL hoặc quay về trang trước.'),
          variantClass: 'theme-warning',
        };
      case 429:
        return {
          code: '429',
          badgeText: 'Too Many Requests',
          title: t('errors.code429Title', 'Quá Nhiều Yêu Cầu Cùng Lúc (429)'),
          desc: t('errors.code429Desc', 'Hệ thống phát hiện tần suất gửi request quá nhanh từ thiết bị của bạn và đã tạm thời kích hoạt giới hạn tốc độ (Rate Limiting).'),
          icon: <Clock size={36} className="text-warning" />,
          advice: t('errors.code429Advice', 'Vui lòng tạm ngưng thao tác trong 30 giây rồi thử lại để tránh làm nghẽn máy chủ.'),
          variantClass: 'theme-warning',
        };
      case 502:
      case 504:
        return {
          code: String(statusCode),
          badgeText: statusCode === 502 ? 'Bad Gateway' : 'Gateway Timeout',
          title: `${t('errors.code502Title', 'Cổng Kết Nối Quá Giới Hạn')} (${statusCode})`,
          desc: t('errors.code502Desc', 'Máy chủ Gateway hoặc Reverse Proxy không nhận được phản hồi kịp thời từ dịch vụ Backend API hoặc Database.'),
          icon: <WifiOff size={36} className="text-danger" />,
          advice: t('errors.code502Advice', 'Kiểm tra xem dịch vụ API tại cổng 3000 hoặc cơ sở dữ liệu PostgreSQL có đang bị treo không.'),
          variantClass: 'theme-danger',
        };
      case 503:
        return {
          code: '503',
          badgeText: 'Service Unavailable',
          title: t('errors.code503Title', 'Dịch Vụ Tạm Thời Gián Đoạn (503)'),
          desc: t('errors.code503Desc', 'Hệ thống đang trong quá trình bảo trì, khởi động lại hoặc các dịch vụ hàng đợi Redis / BullMQ đang quá tải.'),
          icon: <ServerCrash size={36} className="text-danger" />,
          advice: t('errors.code503Advice', 'Vui lòng thử lại sau ít phút hoặc liên hệ đội ngũ DevOps để kiểm tra hạ tầng.'),
          variantClass: 'theme-danger',
        };
      case 500:
      default:
        return {
          code: String(statusCode || 500),
          badgeText: 'Internal Server Error',
          title: t('errors.code500Title', 'Sự Cố Máy Chủ Nội Bộ (500)'),
          desc: t('errors.code500Desc', 'Backend NestJS đã gặp một lỗi ngoại lệ chưa được xử lý trong quá trình ghi dữ liệu hoặc kết nối PostgreSQL.'),
          icon: <ServerCrash size={36} className="text-danger" />,
          advice: t('errors.code500Advice', 'Thông tin lỗi chi tiết đã được ghi nhận vào nhật ký hệ thống (System Logs).'),
          variantClass: 'theme-danger',
        };
    }
  };

  const config = getErrorConfig();

  return (
    <div className="crm-error-page-wrapper">
      <div className={`crm-error-page-container ${config.variantClass}`}>
        {/* Mã lỗi lớn */}
        <div className={`error-code-badge error-code-${config.code.startsWith('5') ? '5xx' : config.code}`}>
          <span>{config.code}</span>
        </div>

        <div className="error-icon-circle">{config.icon}</div>

        <h1 className="error-title">{config.title}</h1>

        <p className="error-desc">
          {errorMessage || config.desc}
        </p>

        {/* Khung chẩn đoán lỗi và nơi phát sinh */}
        <div className="error-diagnostic-box">
          {errorLocation && (
            <div className="diagnostic-item">
              <span className="diagnostic-label">
                <MapPin size={14} /> {t('errors.locationLabel', 'Nơi phát sinh lỗi:')}
              </span>
              <code className="diagnostic-code">{errorLocation}</code>
            </div>
          )}

          <div className="diagnostic-item">
            <span className="diagnostic-label">{t('errors.adviceLabel', 'Khuyến nghị khắc phục:')}</span>
            <span className="diagnostic-text">{config.advice}</span>
          </div>

          {errorDetails !== undefined && errorDetails !== null && (
            <div className="technical-details-wrapper">
              <button
                type="button"
                className="technical-details-toggle"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              >
                <span>{showTechnicalDetails ? t('errors.serverDebugHide', 'Ẩn chi tiết phản hồi từ Server') : t('errors.serverDebugShow', 'Xem chi tiết phản hồi từ Server (Debug)')}</span>
                {showTechnicalDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {showTechnicalDetails && (
                <pre className="technical-details-pre">
                  {typeof errorDetails === 'string'
                    ? errorDetails
                    : JSON.stringify(errorDetails, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Nhóm nút hành động */}
        <div className="error-actions-group">
          <Button
            variant="primary"
            size="lg"
            icon={<RefreshCw size={16} />}
            onClick={onRetry}
          >
            {t('errors.retryBtn', 'Thử Lại')}
          </Button>

          {statusCode === 401 && (
            <Button
              variant="secondary"
              size="lg"
              icon={<LogIn size={16} />}
              onClick={() => (window.location.href = '/login')}
            >
              {t('errors.reloginBtn', 'Đăng Nhập Lại')}
            </Button>
          )}

          <Button
            variant="secondary"
            size="lg"
            icon={<Home size={16} />}
            onClick={onGoHome}
          >
            {t('errors.backHomeBtn', 'Về Trang Chủ CRM')}
          </Button>
        </div>
      </div>
    </div>
  );
};
