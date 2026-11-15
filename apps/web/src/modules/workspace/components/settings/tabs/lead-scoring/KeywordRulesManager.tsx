import React, { useState, useMemo } from 'react';
import { confirmDialog } from '../../../../../../components/feedback/confirmDialog.js';
import { notify } from '../../../../../../components/feedback/toastEmitter.js';
import { apiClient } from '../../../../../../lib/api-client/index.js';
import type { KeywordRuleItem } from '../../../../../../lib/api-client/keyword-rules.js';
import { KeywordBulkImportModal } from './KeywordBulkImportModal.js';
import {
  type RuleDraft,
  type StatusFilter,
  type KeywordRulesManagerProps,
  PAGE_SIZE,
  filterKeywordRules,
  groupKeywordsByCategory,
  KeywordRulesToolbar,
  KeywordBulkActionBar,
  KeywordGroupAccordion,
} from './rules/index.js';

export type { KeywordRulesManagerProps };

export const KeywordRulesManager: React.FC<KeywordRulesManagerProps> = ({
  rules,
  isOwner,
  onReload,
  onQuickAddGroupPrefill,
}) => {
  // 1. Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<StatusFilter>('ALL');

  // 2. Accordion Expanded State
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // 3. Pagination / Windowing per group (Limit 50 initially)
  const [groupVisibleLimits, setGroupVisibleLimits] = useState<Record<string, number>>({});

  // 4. Multi-Select State
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());

  // 5. In-Place Edit State
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleDraft, setEditingRuleDraft] = useState<RuleDraft>({
    group: '',
    keyword: '',
    weight: 1,
    isActive: true,
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // 6. Bulk Action Progress State
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  // 7. Bulk Import Modal State
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportTargetGroup, setBulkImportTargetGroup] = useState<string | undefined>();

  // Available unique groups list
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    rules.forEach((r) => {
      if (r.group?.trim()) set.add(r.group.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [rules]);

  // Overall counts
  const totalActive = useMemo(() => rules.filter((r) => r.isActive).length, [rules]);
  const totalInactive = useMemo(() => rules.filter((r) => !r.isActive).length, [rules]);

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return filterKeywordRules(rules, searchQuery, selectedGroupFilter, selectedStatusFilter);
  }, [rules, searchQuery, selectedGroupFilter, selectedStatusFilter]);

  // Grouped Rules (Group Name -> List of Rules)
  const groupedRules = useMemo(() => {
    const map = groupKeywordsByCategory(filteredRules);
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'vi'));
  }, [filteredRules]);

  const isFiltering = Boolean(
    searchQuery.trim() || selectedGroupFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
  );

  // Auto-expand groups when user is searching or filtering
  const isGroupExpanded = (groupName: string) => {
    if (isFiltering) return true;
    return !collapsedGroups[groupName];
  };

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const expandAllGroups = () => {
    setCollapsedGroups({});
  };

  const collapseAllGroups = () => {
    const allCollapsed: Record<string, boolean> = {};
    availableGroups.forEach((g) => {
      allCollapsed[g] = true;
    });
    setCollapsedGroups(allCollapsed);
  };

  // Pagination per group
  const getVisibleLimit = (groupName: string) => groupVisibleLimits[groupName] || PAGE_SIZE;

  const handleShowMore = (groupName: string) => {
    setGroupVisibleLimits((prev) => ({
      ...prev,
      [groupName]: (prev[groupName] || PAGE_SIZE) + PAGE_SIZE,
    }));
  };

  const handleCollapseItems = (groupName: string) => {
    setGroupVisibleLimits((prev) => ({
      ...prev,
      [groupName]: PAGE_SIZE,
    }));
  };

  // Multi-select management
  const toggleSelectRule = (id: string) => {
    setSelectedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllGroup = (groupRules: KeywordRuleItem[]) => {
    const allSelected = groupRules.every((r) => selectedRuleIds.has(r.id));
    setSelectedRuleIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupRules.forEach((r) => next.delete(r.id));
      } else {
        groupRules.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    const allSelected =
      filteredRules.length > 0 && filteredRules.every((r) => selectedRuleIds.has(r.id));
    setSelectedRuleIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        filteredRules.forEach((r) => next.delete(r.id));
      } else {
        filteredRules.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedRuleIds(new Set());
  };

  // Bulk Actions
  const handleBulkToggleActive = async (targetActive: boolean) => {
    if (selectedRuleIds.size === 0) return;
    setIsBulkOperating(true);
    try {
      const ids = Array.from(selectedRuleIds);
      try {
        await apiClient.bulkUpdateKeywordRules(ids, { isActive: targetActive });
      } catch {
        const CHUNK = 15;
        for (let i = 0; i < ids.length; i += CHUNK) {
          const chunk = ids.slice(i, i + CHUNK);
          await Promise.all(
            chunk.map((id) => apiClient.updateKeywordRule(id, { isActive: targetActive }))
          );
        }
      }
      notify.success(
        `Đã ${targetActive ? 'bật' : 'tắt'} ${selectedRuleIds.size} từ khóa đã chọn.`
      );
      clearSelection();
      await onReload();
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái.');
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRuleIds.size === 0) return;
    const confirmed = await confirmDialog({
      tone: 'danger',
      title: 'Xóa các từ khóa đã chọn?',
      message: `Bạn có chắc chắn muốn xóa ${selectedRuleIds.size} từ khóa đã chọn khỏi hệ thống? Thao tác này không thể hoàn tác.`,
      confirmText: `Xóa ${selectedRuleIds.size} từ khóa`,
      cancelText: 'Hủy',
    });
    if (!confirmed) return;

    setIsBulkOperating(true);
    try {
      const ids = Array.from(selectedRuleIds);
      try {
        await apiClient.bulkDeleteKeywordRules(ids);
      } catch {
        const CHUNK = 15;
        for (let i = 0; i < ids.length; i += CHUNK) {
          const chunk = ids.slice(i, i + CHUNK);
          await Promise.all(chunk.map((id) => apiClient.deleteKeywordRule(id)));
        }
      }
      notify.success(`Đã xóa ${ids.length} từ khóa thành công.`);
      clearSelection();
      await onReload();
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Không thể xóa các từ khóa đã chọn.');
    } finally {
      setIsBulkOperating(false);
    }
  };

  // Group-level Bulk Toggle
  const handleGroupToggleAll = async (groupName: string, currentRules: KeywordRuleItem[]) => {
    const hasInactive = currentRules.some((r) => !r.isActive);
    const targetState = hasInactive;
    setIsBulkOperating(true);
    try {
      const ids = currentRules.map((r) => r.id);
      try {
        await apiClient.bulkUpdateKeywordRules(ids, { isActive: targetState });
      } catch {
        await Promise.all(
          currentRules.map((r) => apiClient.updateKeywordRule(r.id, { isActive: targetState }))
        );
      }
      notify.success(`Đã ${targetState ? 'bật' : 'tắt'} toàn bộ từ khóa trong nhóm "${groupName}".`);
      await onReload();
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Không thể cập nhật nhóm.');
    } finally {
      setIsBulkOperating(false);
    }
  };

  // Group-level Delete All
  const handleGroupDeleteAll = async (groupName: string, currentRules: KeywordRuleItem[]) => {
    const confirmed = await confirmDialog({
      tone: 'danger',
      title: `Xóa toàn bộ nhóm "${groupName}"?`,
      message: `Bạn có chắc chắn muốn xóa tất cả ${currentRules.length} từ khóa trong nhóm "${groupName}" không?`,
      confirmText: 'Xóa toàn bộ',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;

    setIsBulkOperating(true);
    try {
      const ids = currentRules.map((r) => r.id);
      try {
        await apiClient.bulkDeleteKeywordRules(ids);
      } catch {
        await Promise.all(currentRules.map((r) => apiClient.deleteKeywordRule(r.id)));
      }
      notify.success(`Đã xóa toàn bộ nhóm "${groupName}" (${currentRules.length} từ khóa).`);
      setSelectedRuleIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      await onReload();
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Không thể xóa nhóm.');
    } finally {
      setIsBulkOperating(false);
    }
  };

  // In-place Single Item Edit
  const handleStartEdit = (rule: KeywordRuleItem) => {
    setEditingRuleDraft({
      group: rule.group,
      keyword: rule.keyword,
      weight: rule.weight,
      isActive: rule.isActive,
      description: rule.description || '',
    });
    setEditingRuleId(rule.id);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingRuleDraft.group.trim() || !editingRuleDraft.keyword.trim()) {
      notify.error('Nhóm và từ khóa không được để trống.');
      return;
    }
    setIsSavingEdit(true);
    try {
      await apiClient.updateKeywordRule(id, {
        ...editingRuleDraft,
        group: editingRuleDraft.group.trim(),
        keyword: editingRuleDraft.keyword.trim(),
      });
      setEditingRuleId(null);
      notify.success('Đã cập nhật tiêu chí chấm điểm.');
      await onReload();
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Không thể cập nhật từ khóa.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Single Item Delete
  const handleDeleteSingle = async (rule: KeywordRuleItem) => {
    const confirmed = await confirmDialog({
      tone: 'danger',
      title: 'Xóa từ khóa chấm điểm?',
      message: `Bạn có chắc muốn xóa từ khóa "${rule.keyword}"?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;

    try {
      await apiClient.deleteKeywordRule(rule.id);
      notify.success('Đã xóa từ khóa.');
      setSelectedRuleIds((prev) => {
        const next = new Set(prev);
        next.delete(rule.id);
        return next;
      });
      await onReload();
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Không thể xóa từ khóa.');
    }
  };

  // Single Item Toggle
  const handleToggleSingle = async (rule: KeywordRuleItem) => {
    try {
      await apiClient.updateKeywordRule(rule.id, { ...rule, isActive: !rule.isActive });
      await onReload();
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Không thể đổi trạng thái.');
    }
  };

  const isAllFilteredSelected =
    filteredRules.length > 0 && filteredRules.every((r) => selectedRuleIds.has(r.id));
  const isSomeFilteredSelected =
    filteredRules.some((r) => selectedRuleIds.has(r.id)) && !isAllFilteredSelected;

  return (
    <div className="space-y-3">
      {/* 1. SEARCH, FILTER & BULK ACTIONS TOOLBAR */}
      <KeywordRulesToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedGroupFilter={selectedGroupFilter}
        onGroupFilterChange={setSelectedGroupFilter}
        selectedStatusFilter={selectedStatusFilter}
        onStatusFilterChange={setSelectedStatusFilter}
        availableGroups={availableGroups}
        rulesCount={rules.length}
        totalActive={totalActive}
        totalInactive={totalInactive}
        filteredCount={filteredRules.length}
        isFiltering={isFiltering}
        onResetFilters={() => {
          setSearchQuery('');
          setSelectedGroupFilter('ALL');
          setSelectedStatusFilter('ALL');
        }}
        isAllFilteredSelected={isAllFilteredSelected}
        isSomeFilteredSelected={isSomeFilteredSelected}
        onToggleSelectAllFiltered={toggleSelectAllFiltered}
        isOwner={isOwner}
        onExpandAll={expandAllGroups}
        onCollapseAll={collapseAllGroups}
        onOpenBulkImport={() => {
          setBulkImportTargetGroup(
            selectedGroupFilter !== 'ALL' ? selectedGroupFilter : undefined
          );
          setIsBulkImportOpen(true);
        }}
      />

      {/* 2. CONTEXTUAL BULK ACTION BAR (Xuất hiện khi có mục được chọn) */}
      <KeywordBulkActionBar
        selectedCount={selectedRuleIds.size}
        isBulkOperating={isBulkOperating}
        onBulkToggleActive={handleBulkToggleActive}
        onBulkDelete={handleBulkDelete}
        onClearSelection={clearSelection}
      />

      {/* 3. GROUP-BY-CATEGORY COLLAPSIBLE ACCORDIONS & WINDOWED LIST (Flat Hairline Divided) */}
      <div className="pt-1">
        {groupedRules.map(([groupName, groupRules]) => (
          <KeywordGroupAccordion
            key={groupName}
            groupName={groupName}
            groupRules={groupRules}
            isExpanded={isGroupExpanded(groupName)}
            onToggleExpand={() => toggleGroupCollapse(groupName)}
            isOwner={isOwner}
            selectedRuleIds={selectedRuleIds}
            onToggleSelectGroup={toggleSelectAllGroup}
            onQuickAddPrefill={onQuickAddGroupPrefill}
            onGroupToggleAll={handleGroupToggleAll}
            onGroupDeleteAll={handleGroupDeleteAll}
            isBulkOperating={isBulkOperating}
            visibleLimit={getVisibleLimit(groupName)}
            onShowMore={() => handleShowMore(groupName)}
            onCollapseItems={() => handleCollapseItems(groupName)}
            editingRuleId={editingRuleId}
            editingRuleDraft={editingRuleDraft}
            isSavingEdit={isSavingEdit}
            onToggleSelectRule={toggleSelectRule}
            onToggleSingleRule={handleToggleSingle}
            onStartEditRule={handleStartEdit}
            onCancelEditRule={() => setEditingRuleId(null)}
            onSaveEditRule={handleSaveEdit}
            onDraftChange={(patch) => setEditingRuleDraft((prev) => ({ ...prev, ...patch }))}
            onDeleteSingleRule={handleDeleteSingle}
          />
        ))}

        {/* Empty state when no keywords match filters */}
        {groupedRules.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
            {isFiltering
              ? 'Không tìm thấy từ khóa nào phù hợp với bộ lọc tìm kiếm.'
              : 'Chưa có tiêu chí nào. Thêm từ khóa ở trên hoặc nhập hàng loạt để bắt đầu.'}
          </div>
        )}
      </div>

      {/* 4. Bulk Import Modal */}
      <KeywordBulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        availableGroups={availableGroups}
        defaultGroup={bulkImportTargetGroup}
        onSuccess={onReload}
      />
    </div>
  );
};
