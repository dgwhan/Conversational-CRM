import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { WorkspaceConfigService } from '../../workspace-config/application/workspace-config/index.js';
import { standardizeVietnamesePhoneNumber } from '../../customers/domain/phone-standardizer.js';
import { removeVietnameseTones } from '../../customers/domain/unaccent.js';
import { deduplicateTags } from '../domain/tag-mapping/index.js';
import { WorkspaceRole } from '../../../contracts/roles.js';
import {
    CUSTOMER_IMPORT_UNDO_WINDOW_MS,
    type CustomerImportCommitResponse,
    type CustomerImportJobDto,
    type CustomerImportPreviewResponse,
    type CustomerImportRequest,
    type CustomerImportRow,
    type CustomerImportRowResult,
    type CustomerImportSummary,
    type CustomerImportUndoResponse,
    type DuplicateStrategy,
} from '../../../contracts/customer-import.js';

export interface CustomerImportContext {
    workspaceId: string;
    userId?: string;
    userName?: string;
    role: WorkspaceRole;
}

const LEAD_STATUSES = ['NEW', 'POTENTIAL', 'QUALIFIED', 'CONVERTED', 'UNQUALIFIED'] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Nhãn tiếng Việt / tiếng Anh thường gặp trong file → mã trạng thái lead */
const LEAD_STATUS_ALIASES: Record<string, LeadStatus> = {
    new: 'NEW',
    moi: 'NEW',
    'khach moi': 'NEW',
    potential: 'POTENTIAL',
    'tiem nang': 'POTENTIAL',
    lead: 'POTENTIAL',
    qualified: 'QUALIFIED',
    'du dieu kien': 'QUALIFIED',
    converted: 'CONVERTED',
    'da chuyen doi': 'CONVERTED',
    'nhap hoc': 'CONVERTED',
    unqualified: 'UNQUALIFIED',
    'chua phu hop': 'UNQUALIFIED',
    'khong phu hop': 'UNQUALIFIED',
};

const MAX_STORED_ROW_ISSUES = 1000;
const WRITE_CHUNK_SIZE = 500;
const LOOKUP_CHUNK_SIZE = 1000;

/** Dòng đã chuẩn hóa, sẵn sàng ghi DB */
interface NormalizedRow {
    fullName: string;
    phone: string | null;
    phoneNormalized: string | null;
    email: string | null;
    dateOfBirth: Date | null;
    school: string | null;
    address: string | null;
    idCard: string | null;
    notes: string | null;
    interestCourses: string[];
    tags: string[];
    source: string | null;
    /** Giá trị lấy từ chính dòng (không phải mặc định) — chỉ những giá trị này mới được ghi đè lên khách cũ */
    rowLeadStage: string | null;
    rowLeadStatus: LeadStatus | null;
    leadStage: string;
    leadStatus: LeadStatus;
    assignee: Assignee | null;
}

interface Assignee {
    userId: string;
    memberId: string | null;
    name: string;
}

interface ExistingCustomer {
    id: string;
    fullName: string;
    phone: string | null;
    phoneNormalized: string | null;
    email: string | null;
    dateOfBirth: Date | null;
    school: string | null;
    address: string | null;
    idCard: string | null;
    notes: string | null;
    leadStage: string | null;
    leadStatus: string;
    source: string | null;
    channelIdentities: Prisma.JsonValue;
}

interface RowPlan {
    result: CustomerImportRowResult;
    data?: NormalizedRow;
    existing?: ExistingCustomer;
    /** Dữ liệu cập nhật cho khách đã có (action = UPDATE) */
    update?: Prisma.CustomerUpdateInput;
}

const clean = (v: string | null | undefined): string => (typeof v === 'string' ? v.trim() : '');
const keyOf = (v: string): string => removeVietnameseTones(v).toLowerCase().replace(/\s+/g, ' ').trim();
const splitList = (v: string | null | undefined): string[] =>
    clean(v)
        .split(/[,;|\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

/**
 * Đọc ngày sinh từ các định dạng hay gặp trong file Excel/CSV của Việt Nam:
 * dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, yyyy-mm-dd và số serial ngày của Excel.
 */
export function parseImportDate(raw: string): Date | null {
    const v = raw.trim();
    if (!v) return null;

    let y: number, m: number, d: number;
    let match: RegExpMatchArray | null;
    if ((match = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/))) {
        [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
    } else if ((match = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) {
        [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
    } else if (/^\d{4,5}(\.\d+)?$/.test(v)) {
        // Số serial của Excel (1 = 1900-01-01, có lỗi năm nhuận 1900 nên mốc là 1899-12-30)
        const serial = Math.floor(Number(v));
        const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
        return date.getUTCFullYear() >= 1900 ? date : null;
    } else {
        return null;
    }

    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return date;
}

@Injectable()
export class CustomerImportService {
    private readonly logger = new Logger(CustomerImportService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Optional() private readonly workspaceConfig?: WorkspaceConfigService,
    ) {}

    /** Chạy thử: kiểm tra dữ liệu và cho biết từng dòng sẽ được tạo mới / cập nhật / bỏ qua, không ghi DB. */
    async preview(req: CustomerImportRequest, ctx: CustomerImportContext): Promise<CustomerImportPreviewResponse> {
        const plans = await this.analyze(req, ctx);
        return { summary: summarize(plans), rows: plans.map((p) => p.result) };
    }

    /** Ghi dữ liệu thật và lưu lịch sử lô import. */
    async commit(req: CustomerImportRequest, ctx: CustomerImportContext): Promise<CustomerImportCommitResponse> {
        const plans = await this.analyze(req, ctx);
        const summary = summarize(plans);
        const creates = plans.filter((p) => p.result.action === 'CREATE' && p.data);
        const updates = plans.filter((p) => p.result.action === 'UPDATE' && p.existing && p.update);

        const issues = plans
            .filter((p) => p.result.action === 'ERROR' || p.result.action === 'SKIP')
            .slice(0, MAX_STORED_ROW_ISSUES)
            .map((p) => p.result);

        const createdByName =
            ctx.userName ??
            (ctx.userId
                ? (await this.prisma.user.findUnique({ where: { id: ctx.userId }, select: { fullName: true } }).catch(() => null))
                      ?.fullName ?? null
                : null);

        const job = await this.prisma.$transaction(
            async (tx) => {
                const createdJob = await tx.customerImportJob.create({
                    data: {
                        workspaceId: ctx.workspaceId,
                        createdById: ctx.userId ?? null,
                        createdByName,
                        fileName: req.fileName,
                        duplicateStrategy: req.duplicateStrategy,
                        source: req.defaults?.source?.trim() || null,
                        totalRows: summary.totalRows,
                        createdCount: summary.createCount,
                        updatedCount: summary.updateCount,
                        skippedCount: summary.skipCount,
                        errorCount: summary.errorCount,
                        errors: issues as unknown as Prisma.InputJsonValue,
                    },
                });

                for (let i = 0; i < creates.length; i += WRITE_CHUNK_SIZE) {
                    await tx.customer.createMany({
                        data: creates
                            .slice(i, i + WRITE_CHUNK_SIZE)
                            .map((p) => this.toCreateInput(p.data!, ctx.workspaceId, createdJob.id)),
                    });
                }

                for (const plan of updates) {
                    await tx.customer.update({ where: { id: plan.existing!.id }, data: plan.update! });
                }

                return createdJob;
            },
            { timeout: 120_000, maxWait: 10_000 },
        );

        this.logger.log(
            `Import "${req.fileName}" (workspace ${ctx.workspaceId}): +${summary.createCount} mới, ${summary.updateCount} cập nhật, ${summary.skipCount} bỏ qua, ${summary.errorCount} lỗi`,
        );

        return { job: this.toJobDto(job, ctx), summary, rows: plans.map((p) => p.result) };
    }

    async listJobs(ctx: CustomerImportContext): Promise<CustomerImportJobDto[]> {
        const jobs = await this.prisma.customerImportJob.findMany({
            where: {
                workspaceId: ctx.workspaceId,
                ...(ctx.role === WorkspaceRole.OWNER ? {} : { createdById: ctx.userId ?? '00000000-0000-0000-0000-000000000000' }),
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
        });
        return jobs.map((j) => this.toJobDto(j, ctx));
    }

    /** Lấy danh sách lỗi / bỏ qua đã lưu của một lô để tải lại file lỗi. */
    async getJobIssues(jobId: string, ctx: CustomerImportContext): Promise<CustomerImportRowResult[]> {
        const job = await this.findJobForCaller(jobId, ctx);
        return Array.isArray(job.errors) ? (job.errors as unknown as CustomerImportRowResult[]) : [];
    }

    /**
     * Hoàn tác lô import trong vòng 24 giờ: xóa các khách hàng do lô này TẠO MỚI, trừ những khách đã phát sinh
     * hội thoại / deal / hoạt động. Các thay đổi lên khách hàng có sẵn (UPDATE) không được hoàn tác.
     */
    async undo(jobId: string, ctx: CustomerImportContext): Promise<CustomerImportUndoResponse> {
        const job = await this.findJobForCaller(jobId, ctx);
        if (job.status !== 'COMPLETED') {
            throw new BadRequestException('Lô import này đã được hoàn tác trước đó.');
        }
        if (Date.now() - job.createdAt.getTime() > CUSTOMER_IMPORT_UNDO_WINDOW_MS) {
            throw new BadRequestException('Chỉ có thể hoàn tác lô import trong vòng 24 giờ.');
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const deletable = await tx.customer.findMany({
                where: {
                    workspaceId: ctx.workspaceId,
                    importJobId: job.id,
                    conversations: { none: {} },
                    deals: { none: {} },
                    activities: { none: {} },
                },
                select: { id: true },
            });
            const ids = deletable.map((c) => c.id);
            for (let i = 0; i < ids.length; i += WRITE_CHUNK_SIZE) {
                await tx.customer.deleteMany({ where: { id: { in: ids.slice(i, i + WRITE_CHUNK_SIZE) } } });
            }
            const keptCount = await tx.customer.count({ where: { workspaceId: ctx.workspaceId, importJobId: job.id } });
            const updatedJob = await tx.customerImportJob.update({
                where: { id: job.id },
                data: { status: 'UNDONE', undoneAt: new Date(), undoneCount: ids.length },
            });
            return { updatedJob, deletedCount: ids.length, keptCount };
        });

        this.logger.log(
            `Hoàn tác import ${job.id}: xóa ${result.deletedCount}, giữ lại ${result.keptCount} khách đã phát sinh dữ liệu`,
        );
        return { job: this.toJobDto(result.updatedJob, ctx), deletedCount: result.deletedCount, keptCount: result.keptCount };
    }

    // ───────────────────────────── Phân tích dữ liệu ─────────────────────────────

    private async analyze(req: CustomerImportRequest, ctx: CustomerImportContext): Promise<RowPlan[]> {
        const lookups = await this.loadLookups(ctx);

        const defaultStage = clean(req.defaults?.leadStage);
        const resolvedDefaultStage = defaultStage ? lookups.resolveStage(defaultStage) : lookups.firstStageId;
        if (!resolvedDefaultStage) {
            throw new BadRequestException(`Giai đoạn mặc định "${defaultStage}" không có trong pipeline của workspace.`);
        }
        const defaultStatusRaw = clean(req.defaults?.leadStatus);
        const resolvedDefaultStatus = defaultStatusRaw ? resolveLeadStatus(defaultStatusRaw) : 'NEW';
        if (!resolvedDefaultStatus) {
            throw new BadRequestException(`Trạng thái mặc định "${defaultStatusRaw}" không hợp lệ.`);
        }
        const defaultSource = clean(req.defaults?.source) || null;

        // 1. Chuẩn hóa từng dòng
        const plans: RowPlan[] = req.rows.map((row, idx) =>
            this.normalizeRow(row, idx + 1, {
                lookups,
                ctx,
                defaultStage: resolvedDefaultStage,
                defaultStatus: resolvedDefaultStatus,
                defaultSource,
            }),
        );

        // 2. Trùng lặp ngay trong file: giữ dòng đầu tiên, các dòng sau báo lỗi
        const seenPhone = new Map<string, number>();
        const seenEmail = new Map<string, number>();
        for (const plan of plans) {
            if (!plan.data) continue;
            const { phoneNormalized, email } = plan.data;
            const dupRow =
                (phoneNormalized && seenPhone.get(phoneNormalized)) || (email && seenEmail.get(email)) || undefined;
            if (dupRow) {
                plan.result.action = 'ERROR';
                plan.result.messages.push(`Trùng SĐT/email với dòng ${dupRow} trong file.`);
                plan.data = undefined;
                continue;
            }
            if (phoneNormalized) seenPhone.set(phoneNormalized, plan.result.row);
            if (email) seenEmail.set(email, plan.result.row);
        }

        // 3. Đối chiếu với khách hàng đã có trong workspace
        const existing = await this.findExisting(ctx.workspaceId, [...seenPhone.keys()], [...seenEmail.keys()]);
        for (const plan of plans) {
            if (!plan.data) continue;
            const match =
                (plan.data.phoneNormalized && existing.byPhone.get(plan.data.phoneNormalized)) ||
                (plan.data.email && existing.byEmail.get(plan.data.email)) ||
                undefined;
            if (!match) {
                plan.result.action = 'CREATE';
                continue;
            }
            plan.existing = match;
            plan.result.existingCustomerId = match.id;
            plan.result.existingCustomerName = match.fullName;
            this.planUpdate(plan, req.duplicateStrategy, ctx);
        }

        return plans;
    }

    private normalizeRow(
        row: CustomerImportRow,
        rowNumber: number,
        opts: {
            lookups: Lookups;
            ctx: CustomerImportContext;
            defaultStage: string;
            defaultStatus: LeadStatus;
            defaultSource: string | null;
        },
    ): RowPlan {
        const messages: string[] = [];
        const fullName = clean(row.fullName).replace(/\s+/g, ' ');
        const result: CustomerImportRowResult = { row: rowNumber, action: 'ERROR', fullName, messages };

        if (!fullName) messages.push('Thiếu họ tên.');
        else if (fullName.length > 255) messages.push('Họ tên dài quá 255 ký tự.');

        // SĐT
        const phoneRaw = clean(row.phone);
        let phone: string | null = null;
        let phoneNormalized: string | null = null;
        if (phoneRaw) {
            phoneNormalized = standardizeVietnamesePhoneNumber(phoneRaw);
            if (!phoneNormalized) messages.push(`Số điện thoại không hợp lệ: "${phoneRaw}".`);
            else phone = phoneRaw;
        }

        // Email
        const emailRaw = clean(row.email).toLowerCase();
        let email: string | null = null;
        if (emailRaw) {
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) && emailRaw.length <= 255) email = emailRaw;
            else messages.push(`Email không hợp lệ: "${emailRaw}".`);
        }
        if (!phoneRaw && !emailRaw) messages.push('Cần ít nhất số điện thoại hoặc email.');

        // Ngày sinh
        const dobRaw = clean(row.dateOfBirth);
        let dateOfBirth: Date | null = null;
        if (dobRaw) {
            dateOfBirth = parseImportDate(dobRaw);
            const year = dateOfBirth?.getUTCFullYear() ?? 0;
            if (!dateOfBirth || year < 1900 || dateOfBirth.getTime() > Date.now()) {
                messages.push(`Ngày sinh không hợp lệ: "${dobRaw}" (dùng dd/mm/yyyy).`);
                dateOfBirth = null;
            }
        }

        // Giai đoạn / trạng thái
        const stageRaw = clean(row.leadStage);
        const rowLeadStage = stageRaw ? opts.lookups.resolveStage(stageRaw) : null;
        if (stageRaw && !rowLeadStage) messages.push(`Giai đoạn "${stageRaw}" không có trong pipeline.`);

        const statusRaw = clean(row.leadStatus);
        const rowLeadStatus = statusRaw ? resolveLeadStatus(statusRaw) : null;
        if (statusRaw && !rowLeadStatus) messages.push(`Trạng thái "${statusRaw}" không hợp lệ.`);

        // Người phụ trách: STAFF luôn tự nhận khách mình import
        let assignee: Assignee | null = null;
        if (opts.ctx.role !== WorkspaceRole.OWNER) {
            assignee = opts.lookups.self;
        } else {
            const assigneeRaw = clean(row.assigneeEmail).toLowerCase();
            if (assigneeRaw) {
                assignee = opts.lookups.membersByEmail.get(assigneeRaw) ?? null;
                if (!assignee) messages.push(`Không tìm thấy thành viên workspace có email "${assigneeRaw}".`);
            }
        }

        const truncate = (v: string | null | undefined, max: number): string | null => clean(v).slice(0, max) || null;
        const interestCourses = splitList(row.interestCourses).map((c) => opts.lookups.resolveCourse(c));

        result.phone = phone ?? (phoneRaw || null);
        result.email = email ?? (emailRaw || null);

        if (messages.length > 0) return { result };

        return {
            result,
            data: {
                fullName,
                phone,
                phoneNormalized,
                email,
                dateOfBirth,
                school: truncate(row.school, 255),
                address: truncate(row.address, 2000),
                idCard: truncate(row.idCard, 50),
                notes: truncate(row.notes, 2000),
                interestCourses: [...new Set(interestCourses)],
                tags: deduplicateTags(splitList(row.tags)),
                source: truncate(row.source, 150) ?? opts.defaultSource,
                rowLeadStage,
                rowLeadStatus,
                leadStage: rowLeadStage ?? opts.defaultStage,
                leadStatus: rowLeadStatus ?? opts.defaultStatus,
                assignee,
            },
        };
    }

    /** Quyết định cập nhật khách đã có theo chiến lược xử lý trùng. */
    private planUpdate(plan: RowPlan, strategy: DuplicateStrategy, ctx: CustomerImportContext): void {
        const { data, existing, result } = plan;
        if (!data || !existing) return;

        if (strategy === 'SKIP') {
            result.action = 'SKIP';
            result.messages.push(`Đã có trong hệ thống: "${existing.fullName}".`);
            return;
        }

        const identities = asRecord(existing.channelIdentities);
        if (ctx.role !== WorkspaceRole.OWNER && !isAssignedTo(identities, ctx.userId)) {
            result.action = 'SKIP';
            result.messages.push(`"${existing.fullName}" do người khác phụ trách, không được cập nhật.`);
            return;
        }

        const overwrite = strategy === 'OVERWRITE';
        const pick = <T>(incoming: T | null, current: T | null): T | undefined => {
            if (incoming === null || incoming === undefined || incoming === '') return undefined;
            if (overwrite) return incoming === current ? undefined : incoming;
            return current === null || current === undefined || current === '' ? incoming : undefined;
        };

        const update: Prisma.CustomerUpdateInput = {};
        const set = <K extends keyof Prisma.CustomerUpdateInput>(key: K, value: Prisma.CustomerUpdateInput[K] | undefined) => {
            if (value !== undefined) update[key] = value;
        };

        if (overwrite && data.fullName !== existing.fullName) set('fullName', data.fullName);
        if (data.phoneNormalized && !existing.phoneNormalized) {
            set('phone', data.phone);
            set('phoneNormalized', data.phoneNormalized);
        }
        set('email', pick(data.email, existing.email));
        const dob = pick(data.dateOfBirth?.toISOString() ?? null, existing.dateOfBirth?.toISOString() ?? null);
        if (dob) set('dateOfBirth', new Date(dob));
        set('school', pick(data.school, existing.school));
        set('address', pick(data.address, existing.address));
        set('idCard', pick(data.idCard, existing.idCard));
        set('source', pick(data.source, existing.source));
        if (data.notes && !(existing.notes ?? '').includes(data.notes)) {
            set('notes', existing.notes ? `${existing.notes}\n${data.notes}` : data.notes);
        }

        // Giai đoạn / trạng thái: chỉ ghi đè khi chính dòng có giá trị (giá trị mặc định không đè lên khách cũ)
        const nextIdentities: Record<string, unknown> = { ...identities };
        const stage = pick(data.rowLeadStage, existing.leadStage);
        if (stage) {
            set('leadStage', stage);
            nextIdentities.leadStage = stage;
        }
        if (overwrite && data.rowLeadStatus && data.rowLeadStatus !== existing.leadStatus) {
            set('leadStatus', data.rowLeadStatus);
            nextIdentities.leadStatus = data.rowLeadStatus;
        }

        // Tag và ngành quan tâm: luôn gộp thêm, không xóa giá trị cũ
        const oldTags = Array.isArray(identities.tags) ? (identities.tags as string[]) : [];
        const mergedTags = deduplicateTags([...oldTags, ...data.tags]);
        const oldCourses = Array.isArray(identities.interestCourses) ? (identities.interestCourses as string[]) : [];
        const mergedCourses = [...new Set([...oldCourses, ...data.interestCourses])];
        let identitiesChanged = stage !== undefined || update.leadStatus !== undefined;
        if (mergedTags.length !== oldTags.length) {
            nextIdentities.tags = mergedTags;
            identitiesChanged = true;
        }
        if (mergedCourses.length !== oldCourses.length) {
            nextIdentities.interestCourses = mergedCourses;
            identitiesChanged = true;
        }

        if (data.assignee && ctx.role === WorkspaceRole.OWNER) {
            const hasAssignee = Boolean(identities.assignedStaffId || identities.assignedMemberId);
            if ((overwrite || !hasAssignee) && identities.assignedStaffId !== data.assignee.userId) {
                Object.assign(nextIdentities, assigneeIdentity(data.assignee));
                identitiesChanged = true;
            }
        }
        if (identitiesChanged) set('channelIdentities', nextIdentities as Prisma.InputJsonValue);

        if (Object.keys(update).length === 0) {
            result.action = 'SKIP';
            result.messages.push(`Đã có trong hệ thống ("${existing.fullName}"), không có thông tin mới để cập nhật.`);
            return;
        }
        result.action = 'UPDATE';
        result.messages.push(`Cập nhật khách hàng có sẵn "${existing.fullName}".`);
        plan.update = update;
    }

    private toCreateInput(data: NormalizedRow, workspaceId: string, importJobId: string): Prisma.CustomerCreateManyInput {
        return {
            workspaceId,
            fullName: data.fullName,
            phone: data.phone,
            phoneNormalized: data.phoneNormalized,
            email: data.email,
            dateOfBirth: data.dateOfBirth,
            school: data.school,
            address: data.address,
            idCard: data.idCard,
            notes: data.notes,
            leadStatus: data.leadStatus,
            leadStage: data.leadStage,
            source: data.source,
            importJobId,
            channelIdentities: {
                leadStatus: data.leadStatus,
                leadStage: data.leadStage,
                interestCourses: data.interestCourses,
                estimatedValue: 0,
                ...(data.tags.length > 0 ? { tags: data.tags } : {}),
                ...(data.assignee ? assigneeIdentity(data.assignee) : {}),
            },
        };
    }

    // ───────────────────────────── Tra cứu ─────────────────────────────

    private async loadLookups(ctx: CustomerImportContext): Promise<Lookups> {
        let stages: Array<{ id: string; name: string }> = [];
        let products: Array<{ id: string; name: string; code?: string }> = [];
        if (this.workspaceConfig) {
            try {
                const config = await this.workspaceConfig.getConfig(ctx.workspaceId);
                stages = [...(config.pipelineStages ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                products = config.productCatalog ?? [];
            } catch (err) {
                this.logger.warn(`Không tải được cấu hình workspace ${ctx.workspaceId}: ${(err as Error).message}`);
            }
        }

        const stageByKey = new Map<string, string>();
        for (const s of stages) {
            stageByKey.set(keyOf(s.id), s.id);
            stageByKey.set(keyOf(s.id.replace(/^STAGE_/i, '')), s.id);
            stageByKey.set(keyOf(s.name), s.id);
        }
        const courseByKey = new Map<string, string>();
        for (const p of products) {
            courseByKey.set(keyOf(p.name), p.name);
            courseByKey.set(keyOf(p.id), p.name);
            if (p.code) courseByKey.set(keyOf(p.code), p.name);
        }

        const workspace = await this.prisma.workspace.findUnique({
            where: { id: ctx.workspaceId },
            select: {
                ownerId: true,
                owner: { select: { id: true, email: true, fullName: true } },
                members: {
                    where: { isActive: true, status: 'ACTIVE' },
                    select: { id: true, userId: true, user: { select: { email: true, fullName: true } } },
                },
            },
        });

        const membersByEmail = new Map<string, Assignee>();
        const membersByUserId = new Map<string, Assignee>();
        if (workspace?.owner) {
            const owner: Assignee = {
                userId: workspace.owner.id,
                memberId: workspace.members.find((m) => m.userId === workspace.owner.id)?.id ?? null,
                name: workspace.owner.fullName,
            };
            membersByEmail.set(workspace.owner.email.toLowerCase(), owner);
            membersByUserId.set(owner.userId, owner);
        }
        for (const m of workspace?.members ?? []) {
            const a: Assignee = { userId: m.userId, memberId: m.id, name: m.user.fullName };
            membersByEmail.set(m.user.email.toLowerCase(), a);
            membersByUserId.set(m.userId, a);
        }

        const self =
            (ctx.userId && membersByUserId.get(ctx.userId)) ||
            (ctx.userId ? { userId: ctx.userId, memberId: null, name: ctx.userName ?? 'Tư vấn viên' } : null);

        return {
            firstStageId: stages[0]?.id ?? 'STAGE_NEW',
            resolveStage: (raw) => stageByKey.get(keyOf(raw)) ?? (stages.length === 0 ? raw.toUpperCase() : null),
            resolveCourse: (raw) => courseByKey.get(keyOf(raw)) ?? raw,
            membersByEmail,
            self,
        };
    }

    private async findExisting(workspaceId: string, phones: string[], emails: string[]) {
        const byPhone = new Map<string, ExistingCustomer>();
        const byEmail = new Map<string, ExistingCustomer>();
        const select = {
            id: true,
            fullName: true,
            phone: true,
            phoneNormalized: true,
            email: true,
            dateOfBirth: true,
            school: true,
            address: true,
            idCard: true,
            notes: true,
            leadStage: true,
            leadStatus: true,
            source: true,
            channelIdentities: true,
        } as const;

        const load = async (where: Prisma.CustomerWhereInput) => {
            const rows = await this.prisma.customer.findMany({
                where: { workspaceId, isMerged: false, ...where },
                select,
                orderBy: { createdAt: 'asc' },
            });
            for (const c of rows) {
                if (c.phoneNormalized && !byPhone.has(c.phoneNormalized)) byPhone.set(c.phoneNormalized, c);
                const email = c.email?.toLowerCase();
                if (email && !byEmail.has(email)) byEmail.set(email, c);
            }
        };

        for (let i = 0; i < phones.length; i += LOOKUP_CHUNK_SIZE) {
            await load({ phoneNormalized: { in: phones.slice(i, i + LOOKUP_CHUNK_SIZE) } });
        }
        for (let i = 0; i < emails.length; i += LOOKUP_CHUNK_SIZE) {
            await load({ email: { in: emails.slice(i, i + LOOKUP_CHUNK_SIZE), mode: 'insensitive' } });
        }
        return { byPhone, byEmail };
    }

    private async findJobForCaller(jobId: string, ctx: CustomerImportContext) {
        const job = await this.prisma.customerImportJob
            .findFirst({ where: { id: jobId, workspaceId: ctx.workspaceId } })
            .catch(() => null);
        if (!job) throw new NotFoundException('Không tìm thấy lô import.');
        if (ctx.role !== WorkspaceRole.OWNER && job.createdById !== ctx.userId) {
            throw new ForbiddenException('Bạn chỉ thao tác được trên lô import do mình thực hiện.');
        }
        return job;
    }

    private toJobDto(
        job: {
            id: string;
            fileName: string;
            status: string;
            duplicateStrategy: string;
            source: string | null;
            totalRows: number;
            createdCount: number;
            updatedCount: number;
            skippedCount: number;
            errorCount: number;
            undoneCount: number;
            createdById: string | null;
            createdByName: string | null;
            createdAt: Date;
            undoneAt: Date | null;
        },
        ctx: CustomerImportContext,
    ): CustomerImportJobDto {
        const canUndo =
            job.status === 'COMPLETED' &&
            job.createdCount > 0 &&
            Date.now() - job.createdAt.getTime() <= CUSTOMER_IMPORT_UNDO_WINDOW_MS &&
            (ctx.role === WorkspaceRole.OWNER || job.createdById === ctx.userId);
        return {
            id: job.id,
            fileName: job.fileName,
            status: job.status === 'UNDONE' ? 'UNDONE' : 'COMPLETED',
            duplicateStrategy: job.duplicateStrategy as DuplicateStrategy,
            source: job.source,
            totalRows: job.totalRows,
            createdCount: job.createdCount,
            updatedCount: job.updatedCount,
            skippedCount: job.skippedCount,
            errorCount: job.errorCount,
            undoneCount: job.undoneCount,
            createdById: job.createdById,
            createdByName: job.createdByName,
            createdAt: job.createdAt.toISOString(),
            undoneAt: job.undoneAt?.toISOString() ?? null,
            canUndo,
        };
    }
}

interface Lookups {
    firstStageId: string;
    resolveStage: (raw: string) => string | null;
    resolveCourse: (raw: string) => string;
    membersByEmail: Map<string, Assignee>;
    self: Assignee | null;
}

function resolveLeadStatus(raw: string): LeadStatus | null {
    const upper = raw.trim().toUpperCase();
    if ((LEAD_STATUSES as readonly string[]).includes(upper)) return upper as LeadStatus;
    return LEAD_STATUS_ALIASES[keyOf(raw)] ?? null;
}

function summarize(plans: RowPlan[]): CustomerImportSummary {
    const count = (a: string) => plans.filter((p) => p.result.action === a).length;
    return {
        totalRows: plans.length,
        createCount: count('CREATE'),
        updateCount: count('UPDATE'),
        skipCount: count('SKIP'),
        errorCount: count('ERROR'),
    };
}

function asRecord(v: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    return v && typeof v === 'object' && !Array.isArray(v) ? { ...(v as Record<string, unknown>) } : {};
}

function assigneeIdentity(a: Assignee): Record<string, unknown> {
    return {
        assignedStaffId: a.userId,
        assignedStaffName: a.name,
        ...(a.memberId ? { assignedMemberId: a.memberId } : {}),
    };
}

/** STAFF chỉ được cập nhật khách do chính mình phụ trách */
function isAssignedTo(identities: Record<string, unknown>, userId: string | undefined): boolean {
    if (!userId) return false;
    return identities.assignedStaffId === userId;
}
