import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { getRequestIdentity, requireWorkspaceId } from '../../../common/auth/request-identity.js';
import { CustomerImportService, type CustomerImportContext } from '../application/customer-import.service.js';
import { CustomerImportRequestSchema, type CustomerImportRequest } from '../../../contracts/customer-import.js';

/**
 * Nhập danh sách khách hàng từ file CSV/XLSX.
 * File được đọc ở trình duyệt; API nhận các dòng đã ánh xạ cột, kiểm tra và ghi vào bảng customers.
 * OWNER import cho cả workspace; STAFF import thì khách tự động thuộc về chính họ.
 */
@Controller('customers/import')
export class CustomerImportController {
    constructor(private readonly importService: CustomerImportService) {}

    /** Chạy thử: trả về kết quả dự kiến của từng dòng, không ghi dữ liệu. */
    @Post('preview')
    preview(@Req() req: unknown, @Body(new ZodValidationPipe(CustomerImportRequestSchema)) body: CustomerImportRequest) {
        return this.importService.preview(body, this.context(req));
    }

    /** Ghi dữ liệu và lưu lịch sử lô import. */
    @Post()
    commit(@Req() req: unknown, @Body(new ZodValidationPipe(CustomerImportRequestSchema)) body: CustomerImportRequest) {
        return this.importService.commit(body, this.context(req));
    }

    /** Lịch sử import (OWNER thấy tất cả, STAFF thấy lô của mình). */
    @Get('jobs')
    listJobs(@Req() req: unknown) {
        return this.importService.listJobs(this.context(req));
    }

    /** Các dòng lỗi / bỏ qua của một lô, để tải lại file lỗi. */
    @Get('jobs/:id/issues')
    getJobIssues(@Req() req: unknown, @Param('id', ParseUUIDPipe) id: string) {
        return this.importService.getJobIssues(id, this.context(req));
    }

    /** Hoàn tác lô import trong 24 giờ (xóa khách hàng do lô tạo mới và chưa phát sinh dữ liệu). */
    @Post('jobs/:id/undo')
    undo(@Req() req: unknown, @Param('id', ParseUUIDPipe) id: string) {
        return this.importService.undo(id, this.context(req));
    }

    private context(req: unknown): CustomerImportContext {
        const identity = getRequestIdentity(req);
        return { workspaceId: requireWorkspaceId(req), userId: identity.userId, role: identity.role };
    }
}
