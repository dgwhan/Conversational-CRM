import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, Copy, Check } from 'lucide-react';
import { Button } from '../components/ui/Button.js';

import { translate, getActiveLocale } from '../i18n/translate.js';
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });

    // Phát hiện lỗi không tải được dynamic chunk (do hệ thống vừa deploy phiên bản mới)
    const isChunkLoadFailed =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed');

    if (isChunkLoadFailed) {
      const storageKey = 'crm_chunk_reload_lock';
      const lastReload = sessionStorage.getItem(storageKey);
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(storageKey, String(now));
        window.location.reload();
      }
    }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleCopyError = (): void => {
    const { error, errorInfo } = this.state;
    const text = `ERROR REPORT:
Time: ${new Date().toISOString()}
Message: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}`;

    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2500);
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, copied } = this.state;
      const isChunkLoadFailed =
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Importing a module script failed');

      return (
        <div className="crm-error-boundary-screen">
          <div className="crm-error-boundary-card">
            <div className="error-card-badge">
              <AlertCircle size={24} className="text-danger" />
            </div>

            <h1 className="error-card-title">
              {isChunkLoadFailed ? translate('errors.boundaryUpdatedTitle', 'Hệ Thống Đã Được Cập Nhật Phiên Bản Mới') : translate('errors.boundaryCrashTitle', 'Đã Xảy Ra Lỗi Giao Diện Hệ Thống')}
            </h1>
            <p className="error-card-desc">
              {isChunkLoadFailed
                ? translate('errors.boundaryUpdatedDesc', 'Hệ thống vừa hoàn tất triển khai phiên bản mới trên máy chủ. Trình duyệt của bạn đang giữ bản đệm (cache) cũ, vui lòng bấm "Tải lại trang" để cập nhật ngay.')
                : translate('errors.boundaryCrashDesc', 'Ứng dụng phát hiện sự cố không mong muốn trong quá trình kết xuất dữ liệu. Thông tin chi tiết kỹ thuật bên dưới giúp lập trình viên xác định chính xác vị trí bị lỗi.')}
            </p>

            {/* Vị trí và thông điệp lỗi */}
            <div className="error-diagnostic-panel">
              <div className="diagnostic-row">
                <span className="diagnostic-label">{translate('errors.boundaryMessageLabel', 'Thông điệp lỗi:')}</span>
                <span className="diagnostic-value text-danger font-bold">
                  {error?.message || translate('errors.boundaryUnknown', 'Lỗi không xác định')}
                </span>
              </div>
              <div className="diagnostic-row">
                <span className="diagnostic-label">{translate('errors.boundaryTimeLabel', 'Thời gian phát sinh:')}</span>
                <span className="diagnostic-value">
                  {new Date().toLocaleString(getActiveLocale() === 'en' ? 'en-US' : 'vi-VN')}
                </span>
              </div>
            </div>

            {/* Stack trace chi tiết */}
            <div className="error-stack-wrapper">
              <label className="form-label">{translate('errors.boundaryStackLabel', 'Chi tiết Stack Trace & Vị trí Component:')}</label>
              <pre className="error-stack-pre">
                {error?.stack}
                {errorInfo?.componentStack}
              </pre>
            </div>

            {/* Nút hành động */}
            <div className="error-card-actions">
              <Button
                variant="primary"
                icon={<RefreshCw size={15} />}
                onClick={this.handleReload}
              >
                {translate('errors.boundaryReload', 'Tải lại trang')}
              </Button>
              <Button
                variant="secondary"
                icon={<Home size={15} />}
                onClick={this.handleGoHome}
              >
                {translate('errors.boundaryGoHome', 'Về Trang Chủ')}
              </Button>
              <Button
                variant="outline"
                icon={copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
                onClick={this.handleCopyError}
              >
                {copied ? translate('errors.boundaryCopied', 'Đã sao chép báo cáo') : translate('errors.boundaryCopy', 'Sao chép chi tiết lỗi')}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
