import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  RotateCcw,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useTranslation } from '../../../../i18n/index.js';
import { useWorkspaceConfig } from '../../WorkspaceConfigContext.js';
import { confirmDialog } from '../../../../components/feedback/confirmDialog.js';
import { CLIENT_INDUSTRY_PRESETS } from '../../workspacePresets.js';
import type {
  BusinessDomain,
  WorkingHoursConfig,
  WorkspaceTerminology,
} from '../../workspaceConfig.types.js';

import {
  StagesTab,
  CatalogTab,
  TerminologyTab,
  CriteriaTab,
  AlertsTab,
  MessageStorageTab,
  LeadScoringTab,
  type LeadScoringSubSectionId,
} from './tabs/index.js';
import { WorkingHoursTab } from './WorkingHoursTab.js';
import { ShiftManagementTab } from './shift-management/index.js';

export type SettingsSubTabId =
  | 'stages'
  | 'catalog'
  | 'terminology'
  | 'criteria'
  | 'leadScoring'
  | 'alerts'
  | 'workingHours'
  | 'shifts'
  | 'storage';

export interface WorkspaceSettingsTabProps {
  workspaceId: string;
  isOwner: boolean;
  canManageWorkspace?: boolean;
}

export const WorkspaceSettingsTab: React.FC<WorkspaceSettingsTabProps> = ({
  workspaceId,
  isOwner,
  canManageWorkspace = isOwner,
}) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    config,
    isLoading,
    updateConfig,
    applyPreset,
    resetToDefault,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
    addProduct,
    deleteProduct,
    addCriteria,
    deleteCriteria,
  } = useWorkspaceConfig();

  // Đọc subtab từ URL nếu có (?subtab=... hoặc ?tab=shifts)
  const initialSubTab: SettingsSubTabId = (() => {
    const sub = searchParams.get('subtab') as SettingsSubTabId | null;
    if (sub) return sub;
    if (searchParams.get('tab') === 'shifts') return 'shifts';
    return 'stages';
  })();

  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTabId>(initialSubTab);
  const [leadScoringSubSection, setLeadScoringSubSection] =
    useState<LeadScoringSubSectionId>('rules');
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const presetDropdownRef = useRef<HTMLDivElement>(null);

  // Xử lý đóng menu khi click ra ngoài – Không dùng div fixed inset-0 để tránh tràn overlay
  useEffect(() => {
    if (!isPresetMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        presetDropdownRef.current &&
        !presetDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPresetMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPresetMenuOpen]);

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    leadScoring: true, // Mặc định mở, không tự động đóng
  });

  const toggleExpand = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Đồng bộ URL khi đổi subtab và tự động đóng menu mobile
  const handleSelectSubTab = (tabId: SettingsSubTabId) => {
    setActiveSubTab(tabId);
    setIsMobileNavOpen(false);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'settings');
        next.set('subtab', tabId);
        return next;
      },
      { replace: true }
    );
  };

  const handleSaveTerminology = async (terminology: WorkspaceTerminology) => {
    await updateConfig({ terminology });
  };

  const handleSaveWorkingHours = async (workingHours: WorkingHoursConfig) => {
    await updateConfig({ workingHours });
  };

  const handleSaveAlerts = async (unresponsiveAlertMinutes: number) => {
    await updateConfig({ unresponsiveAlertMinutes });
  };

  const handleResetToDefault = async () => {
    const confirmed = await confirmDialog({
      title: 'Khôi phục cấu hình CRM tiêu chuẩn',
      message:
        'Bạn có chắc chắn muốn khôi phục toàn bộ cấu hình về mặc định ban đầu không? Thao tác này sẽ thiết lập lại các giai đoạn phễu, danh mục và thuật ngữ.',
      confirmText: 'Khôi phục gốc',
      cancelText: 'Hủy',
      tone: 'danger',
    });
    if (confirmed) {
      await resetToDefault();
    }
  };

  const handleApplyPreset = async (domain: BusinessDomain) => {
    setIsPresetMenuOpen(false);
    await applyPreset(domain);
  };

  const presetEntries = Object.entries(CLIENT_INDUSTRY_PRESETS) as [
    BusinessDomain,
    (typeof CLIENT_INDUSTRY_PRESETS)[BusinessDomain],
  ][];

  // Danh mục nhóm điều hướng phẳng, không icon (Chuẩn Settings UI)
  const navCategories = [
    {
      title: 'Quy trình & Dữ liệu',
      items: [
        {
          id: 'stages' as SettingsSubTabId,
          label: t('workspaceSettings.tabs.stages', 'Giai đoạn phễu'),
        },
        {
          id: 'catalog' as SettingsSubTabId,
          label:
            config.terminology?.productLabel ||
            t('workspaceSettings.tabs.catalog', 'Sản phẩm & Dịch vụ'),
        },
        {
          id: 'terminology' as SettingsSubTabId,
          label: t('workspaceSettings.tabs.terminology', 'Thuật ngữ hệ thống'),
        },
      ],
    },
    {
      title: 'Tự động hóa & Phân loại',
      items: [
        {
          id: 'criteria' as SettingsSubTabId,
          label: t('workspaceSettings.tabs.criteria', 'Tiêu chí phân loại'),
        },
        {
          id: 'leadScoring' as SettingsSubTabId,
          label: t('workspaceSettings.tabs.leadScoring', 'Chấm điểm Lead'),
          subItems: [
            { id: 'rules' as LeadScoringSubSectionId, label: 'Tiêu chí & Từ khóa' },
            { id: 'thresholds' as LeadScoringSubSectionId, label: 'Ngưỡng phân loại & Hạng' },
            { id: 'decay' as LeadScoringSubSectionId, label: 'Điểm thưởng & Giảm điểm' },
            { id: 'exclusion' as LeadScoringSubSectionId, label: 'Loại trừ & Phủ định' },
          ],
        },
        {
          id: 'alerts' as SettingsSubTabId,
          label: t('workspaceSettings.tabs.alerts', 'Cảnh báo phản hồi'),
        },
      ],
    },
    {
      title: 'Vận hành & Nhân sự',
      items: [
        {
          id: 'workingHours' as SettingsSubTabId,
          label: t(
            'workspaceSettings.tabs.workingHours',
            'Giờ làm việc & Tự động trả lời'
          ),
        },
        {
          id: 'shifts' as SettingsSubTabId,
          label: 'Ca trực & Phân lead',
        },
        {
          id: 'storage' as SettingsSubTabId,
          label: t(
            'workspaceSettings.tabs.storage',
            'Lưu trữ & Dọn dẹp tin nhắn'
          ),
        },
      ],
    },
  ];

  // Tìm label và nhóm của tab đang kích hoạt để hiển thị trên thanh điều hướng mobile
  let activeNavInfo = {
    categoryTitle: 'Quy trình & Dữ liệu',
    itemLabel: t('workspaceSettings.tabs.stages', 'Giai đoạn phễu'),
    subLabel: undefined as string | undefined,
  };
  for (const group of navCategories) {
    for (const item of group.items) {
      if (item.id === activeSubTab) {
        if (activeSubTab === 'leadScoring' && item.subItems) {
          const sub = item.subItems.find((s) => s.id === leadScoringSubSection);
          activeNavInfo = {
            categoryTitle: group.title,
            itemLabel: item.label,
            subLabel: sub ? sub.label : undefined,
          };
        } else {
          activeNavInfo = {
            categoryTitle: group.title,
            itemLabel: item.label,
            subLabel: undefined,
          };
        }
        break;
      }
    }
  }

  return (
    <div className="workspace-flat-detail flex flex-col md:flex-row flex-1 w-full bg-white min-h-[calc(100vh-160px)] items-stretch">
      {/* =========================================================================
          MOBILE SUB-NAV TRIGGER BAR (< md: 360px - 767px)
          Gọn gàng, hiển thị mục đang chọn + nút mở danh mục, không tràn màn hình
         ========================================================================= */}
      <div className="md:hidden w-full border-b border-slate-200 bg-slate-50/95 px-3.5 py-2.5 flex items-center justify-between gap-2 select-none sticky top-0 z-20 shadow-2xs">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 truncate">
            {activeNavInfo.categoryTitle}
          </div>
          <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 truncate">
            <span className="truncate">{activeNavInfo.itemLabel}</span>
            {activeNavInfo.subLabel && (
              <>
                <span className="text-slate-400 font-normal">/</span>
                <span className="text-blue-700 font-semibold truncate">{activeNavInfo.subLabel}</span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileNavOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs shrink-0 cursor-pointer"
          aria-expanded={isMobileNavOpen}
          aria-label="Chuyển đổi danh mục cấu hình"
        >
          <span>{isMobileNavOpen ? 'Thu gọn' : 'Đổi mục'}</span>
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 ${isMobileNavOpen ? 'rotate-180 text-blue-600' : 'text-slate-500'}`}
          />
        </button>
      </div>

      {/* =========================================================================
          1. LEFT SUB-NAV RAIL
          Desktop: Cố định w-64 bên trái với border-r
          Mobile: Mặc định ẩn, mở bung khi bấm "Đổi mục", tự đóng khi chọn xong
         ========================================================================= */}
      <nav
        aria-label="Workspace Settings Sub-Navigation"
        className={`${isMobileNavOpen ? 'flex' : 'hidden'
          } md:flex w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/90 py-3 md:py-5 px-3 select-none flex-col self-stretch z-10 transition-all`}
      >
        {navCategories.map((group, groupIdx) => (
          <div
            key={group.title}
            className={groupIdx > 0 ? 'border-t border-slate-200 my-2.5 md:my-3 pt-2.5 md:pt-3 space-y-0.5' : 'space-y-0.5'}
          >
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 select-none">
              {group.title}
            </div>
            {group.items.map((item) => {
              const isActive = activeSubTab === item.id;
              const hasChildren = Boolean(item.subItems && item.subItems.length > 0);
              const isExpanded = Boolean(expandedItems[item.id]);

              return (
                <div key={item.id} className="space-y-0.5">
                  <div className="relative flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectSubTab(item.id);
                        if (hasChildren && !isExpanded) {
                          setExpandedItems((prev) => ({ ...prev, [item.id]: true }));
                        }
                      }}
                      className={`flex items-center justify-between h-8 w-full rounded-md text-[13px] transition-colors text-left cursor-pointer border-none px-2.5 ${isActive
                          ? 'font-semibold text-blue-700 bg-blue-50/80'
                          : 'font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100/60 bg-transparent'
                        }`}
                    >
                      <div className="flex items-center min-w-0 mr-1">
                        {isActive && (
                          <span
                            className="w-1 h-3.5 rounded-full bg-blue-600 mr-2 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <span className="truncate">{item.label}</span>
                      </div>
                      {hasChildren && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => toggleExpand(item.id, e)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              toggleExpand(item.id, e as unknown as React.MouseEvent);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer rounded flex items-center justify-center shrink-0 ml-1"
                          title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                        >
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ease-in-out ${isExpanded ? 'rotate-180' : 'rotate-0'
                              }`}
                          />
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Nested Sub-items (Tree Guide Line chuẩn mẫu, không tự động đóng) */}
                  {hasChildren && item.subItems && (
                    <div
                      className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'
                        }`}
                    >
                      <div className="ml-3.5 pl-3 border-l border-slate-300 space-y-0.5 py-0.5">
                        {item.subItems.map((sub) => {
                          const isSubActive = isActive && leadScoringSubSection === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => {
                                if (!isActive) handleSelectSubTab(item.id);
                                setLeadScoringSubSection(sub.id);
                                setIsMobileNavOpen(false);
                              }}
                              className={`flex items-center h-7 w-full rounded-md text-xs transition-colors text-left cursor-pointer border-none px-2 ${isSubActive
                                  ? 'font-semibold text-blue-700 bg-blue-50/80'
                                  : 'font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-100/50 bg-transparent'
                                }`}
                            >
                              {isSubActive && (
                                <span
                                  className="w-1 h-3 rounded-full bg-blue-600 mr-1.5 shrink-0"
                                  aria-hidden="true"
                                />
                              )}
                              <span className="truncate">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* =========================================================================
          2. RIGHT MAIN CONTENT CANVAS
          Tối ưu padding từ 360px: px-3.5 sm:px-6 md:px-10, pt-4 sm:pt-8
         ========================================================================= */}
      <main className="flex-1 px-3.5 sm:px-6 md:px-10 pt-4 sm:pt-8 pb-12 sm:pb-16 min-w-0 bg-white">
        {/* Clean Page Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 mb-5 sm:mb-6 border-b border-slate-200">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-slate-950 m-0 break-words">
              {activeSubTab === 'stages' && t('workspaceSettings.tabs.stages', 'Giai đoạn phễu quy trình')}
              {activeSubTab === 'catalog' && (config.terminology?.productLabel || t('workspaceSettings.tabs.catalog', 'Sản phẩm & Dịch vụ'))}
              {activeSubTab === 'terminology' && t('workspaceSettings.tabs.terminology', 'Thuật ngữ hệ thống')}
              {activeSubTab === 'criteria' && t('workspaceSettings.tabs.criteria', 'Tiêu chí đánh giá & phân loại')}
              {activeSubTab === 'leadScoring' && 'Cấu hình Chấm điểm Lead'}
              {activeSubTab === 'alerts' && t('workspaceSettings.tabs.alerts', 'Cảnh báo phản hồi tin nhắn')}
              {activeSubTab === 'workingHours' && t('workspaceSettings.tabs.workingHours', 'Giờ làm việc & Tự động trả lời')}
              {activeSubTab === 'shifts' && 'Ca trực & Điều phối Lead'}
              {activeSubTab === 'storage' && t('workspaceSettings.tabs.storage', 'Lưu trữ & Dọn dẹp tin nhắn')}
            </h1>
          </div>

          {/* Contextual Actions (Chỉ hiển thị DUY NHẤT tại tab Giai đoạn phễu) */}
          {isOwner && activeSubTab === 'stages' && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Dropdown Mẫu Ngành */}
              <div ref={presetDropdownRef} className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => setIsPresetMenuOpen(!isPresetMenuOpen)}
                  disabled={isLoading}
                  className="border border-slate-300 text-xs sm:text-[13px] font-medium px-2.5 sm:px-3 py-1.5 rounded-md hover:bg-slate-50 text-slate-700 bg-white shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Sparkles size={13} className="text-amber-500 shrink-0" />
                  <span>{t('workspaceSettings.applyIndustryTemplate', 'Áp dụng mẫu ngành')}</span>
                  <ChevronDown size={12} className="text-slate-400 shrink-0" />
                </button>

                {isPresetMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-60 max-w-[calc(100vw-28px)] bg-white rounded-lg border border-slate-200 shadow-lg py-1 z-50 divide-y divide-slate-100">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t('workspaceSettings.chooseIndustry', 'Chọn ngành nghề mẫu')}
                    </div>
                    <div className="py-1">
                      {presetEntries.map(([key, preset]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleApplyPreset(key)}
                          className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-blue-50/70 hover:text-blue-700 flex items-center justify-between cursor-pointer transition-colors border-none bg-transparent"
                        >
                          <span className="font-medium">{preset.workspaceName}</span>
                          {config.domain === key && <Check size={13} className="text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Khôi phục gốc (Màu đỏ cho thao tác xóa / reset) */}
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={isLoading}
                title={t('workspaceSettings.resetTooltip', 'Khôi phục về cấu hình CRM tiêu chuẩn')}
                className="border border-red-200 text-xs sm:text-[13px] font-medium px-2.5 sm:px-3 py-1.5 rounded-md hover:bg-red-100 hover:text-red-700 hover:border-red-300 text-red-600 bg-red-50 shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw size={12} className="shrink-0" />
                <span>
                  {t('workspaceSettings.resetDefault', 'Khôi phục gốc')}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Content Section Renderer */}
        {activeSubTab === 'stages' && (
          <StagesTab
            stages={config.pipelineStages || []}
            isOwner={isOwner}
            isLoading={isLoading}
            onAddStage={addStage}
            onUpdateStage={updateStage}
            onDeleteStage={deleteStage}
            onReorderStages={reorderStages}
          />
        )}

        {activeSubTab === 'catalog' && (
          <CatalogTab
            catalog={config.productCatalog || []}
            productLabel={config.terminology?.productLabel}
            isOwner={isOwner}
            isLoading={isLoading}
            onAddProduct={addProduct}
            onDeleteProduct={deleteProduct}
          />
        )}

        {activeSubTab === 'terminology' && (
          <TerminologyTab
            terminology={config.terminology}
            isOwner={isOwner}
            isLoading={isLoading}
            onSave={handleSaveTerminology}
          />
        )}

        {activeSubTab === 'criteria' && (
          <CriteriaTab
            criteria={config.criteria || []}
            isOwner={isOwner}
            isLoading={isLoading}
            onAddCriteria={addCriteria}
            onDeleteCriteria={deleteCriteria}
          />
        )}

        {activeSubTab === 'leadScoring' && (
          <LeadScoringTab
            isOwner={isOwner}
            hideSidebar={true}
            activeSection={leadScoringSubSection}
            onSectionChange={setLeadScoringSubSection}
          />
        )}

        {activeSubTab === 'alerts' && (
          <AlertsTab
            unresponsiveAlertMinutes={config.unresponsiveAlertMinutes}
            isOwner={isOwner}
            isLoading={isLoading}
            onSave={handleSaveAlerts}
          />
        )}

        {activeSubTab === 'workingHours' && (
          <WorkingHoursTab
            workingHours={config.workingHours}
            isOwner={isOwner}
            isLoading={isLoading}
            onSave={handleSaveWorkingHours}
          />
        )}

        {activeSubTab === 'shifts' && (
          <ShiftManagementTab
            workspaceId={config.workspaceId || workspaceId}
            canManageShifts={canManageWorkspace}
            focusMemberId={searchParams.get('memberId') || undefined}
          />
        )}

        {activeSubTab === 'storage' && (
          <MessageStorageTab
            workspaceId={config.workspaceId || workspaceId}
            isOwner={isOwner}
          />
        )}
      </main>
    </div>
  );
};
