import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'IS_PUBLIC_KEY';

/**
 * Đánh dấu endpoint công khai (không yêu cầu đăng nhập).
 *
 * Hệ thống áp dụng nguyên tắc "deny by default": mọi route đều cần Access Token hợp lệ
 * (JwtAuthGuard toàn cục), trừ các route gắn @Public(). Chỉ dùng cho:
 *  - Health check, đăng nhập / đăng ký / refresh / khôi phục mật khẩu
 *  - Webhook của nền tảng thứ ba (tự xác thực bằng chữ ký HMAC)
 */
export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);
