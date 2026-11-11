import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import type {
  ConversationTier,
  KeywordRuleItem,
  LeadScoringSettings,
} from '../../../../../lib/api-client/keyword-rules.js';
import { apiClient } from '../../../../../lib/api-client/index.js';
import { useLeadScoringConfig } from '../../../../inbox/context/leadScoringConfig.js';

interface LeadScoringTabProps {
  isOwner: boolean;
}

type RuleDraft = Omit<KeywordRuleItem, 'id' | 'workspaceId'>;
type NumericSettingKey =
  | 'hotMinScore'
  | 'warmMinScore'
  | 'coldMinScore'
  | 'phoneBonusScore'
  | 'inactivityDecayDays'
  | 'inactivityDecayPoints'
  | 'inactivityDecayWeeklyPoints'
  | 'inactivityDecayIntervalDays'
  | 'exclusionThresholdWeight'
  | 'exclusionPenaltyScore'
  | 'ambiguityScoreGap'
  | 'hotBoundaryMinMessages'
  | 'shortMessageMaxWords'
  | 'negationWindowWords';

const tiers: ConversationTier[] = ['HOT', 'WARM', 'COLD', 'IRRELEVANT'];
const numericSettings: Array<{ key: NumericSettingKey; label: string }> = [
  { key: 'hotMinScore', label: 'Điểm tối thiểu cho hạng cao nhất' },
  { key: 'warmMinScore', label: 'Điểm tối thiểu cho hạng tiếp theo' },
  { key: 'coldMinScore', label: 'Điểm tối thiểu cho hạng mới' },
  { key: 'phoneBonusScore', label: 'Điểm thưởng khi có số điện thoại' },
  { key: 'inactivityDecayDays', label: 'Số ngày bắt đầu giảm điểm do không hoạt động' },
  { key: 'inactivityDecayPoints', label: 'Điểm giảm ban đầu' },
  { key: 'inactivityDecayWeeklyPoints', label: 'Điểm giảm thêm mỗi chu kỳ' },
  { key: 'inactivityDecayIntervalDays', label: 'Số ngày mỗi chu kỳ giảm thêm' },
  { key: 'exclusionThresholdWeight', label: 'Trọng số tối đa để loại trừ' },
  { key: 'exclusionPenaltyScore', label: 'Điểm cuối khi bị loại trừ' },
  { key: 'ambiguityScoreGap', label: 'Khoảng điểm sát ngưỡng để hiệu chỉnh' },
  { key: 'hotBoundaryMinMessages', label: 'Số tin nhắn tối thiểu để hiệu chỉnh sát ngưỡng' },
  { key: 'shortMessageMaxWords', label: 'Số từ tối đa để yêu cầu kiểm tra tin nhắn ngắn' },
  { key: 'negationWindowWords', label: 'Khoảng cách từ để nhận diện phủ định' },
];

const blankRule: RuleDraft = {
  group: '',
  keyword: '',
  weight: 1,
  isActive: true,
  description: '',
};

const numericSettingGroups: Array<{
  title: string;
  description: string;
  keys: NumericSettingKey[];
}> = [
  {
    title: 'Ngưỡng phân loại',
    description: 'Điểm tối thiểu để xếp Lead vào từng hạng.',
    keys: ['hotMinScore', 'warmMinScore', 'coldMinScore'],
  },
  {
    title: 'Điểm thưởng và giảm theo thời gian',
    description: 'Điểm cộng khi có số điện thoại và mức giảm khi khách không hoạt động.',
    keys: [
      'phoneBonusScore',
      'inactivityDecayDays',
      'inactivityDecayPoints',
      'inactivityDecayWeeklyPoints',
      'inactivityDecayIntervalDays',
    ],
  },
  {
    title: 'Loại trừ và xử lý trường hợp chưa rõ',
    description: 'Cấu hình luật loại trừ và cách xử lý tin nhắn sát ngưỡng.',
    keys: [
      'exclusionThresholdWeight',
      'exclusionPenaltyScore',
      'ambiguityScoreGap',
      'hotBoundaryMinMessages',
      'shortMessageMaxWords',
      'negationWindowWords',
    ],
  },
];

const InfoTip: React.FC<{ text: string }> = ({ text }) => (
  <span
    title={text}
    aria-label={text}
    role="img"
    tabIndex={0}
    className="ml-1 inline-flex align-middle text-slate-400 hover:text-blue-600 focus:text-blue-600"
  >
    <Info size={15} aria-hidden="true" />
  </span>
);

function ruleDraft(rule: KeywordRuleItem): RuleDraft {
  return {
    group: rule.group,
    keyword: rule.keyword,
    weight: rule.weight,
    isActive: rule.isActive,
    description: rule.description || '',
  };
}

export const LeadScoringTab: React.FC<LeadScoringTabProps> = ({ isOwner }) => {
  const { rules, settings, isLoading, reload } = useLeadScoringConfig();
  const [newRule, setNewRule] = useState<RuleDraft>(blankRule);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<RuleDraft>(blankRule);
  const [settingsDraft, setSettingsDraft] = useState<LeadScoringSettings | null>(settings);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    setSettingsDraft(settings);
  }, [settings]);

  const updateRuleDraft = (
    draft: RuleDraft,
    setter: React.Dispatch<React.SetStateAction<RuleDraft>>,
    field: keyof RuleDraft,
    value: string | number | boolean,
  ) => {
    setter({ ...draft, [field]: value });
  };

  const handleCreateRule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newRule.group.trim() || !newRule.keyword.trim()) {
      notify.error('Nhập nhóm và từ khóa trước khi thêm tiêu chí.');
      return;
    }

    setIsSavingRule(true);
    try {
      await apiClient.createKeywordRule({ ...newRule, group: newRule.group.trim(), keyword: newRule.keyword.trim() });
      setNewRule(blankRule);
      if (await reload()) notify.success('Đã thêm tiêu chí chấm điểm.');
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Không thể thêm tiêu chí chấm điểm.');
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleUpdateRule = async (id: string) => {
    if (!editingRule.group.trim() || !editingRule.keyword.trim()) {
      notify.error('Nhóm và từ khóa không được để trống.');
      return;
    }

    setIsSavingRule(true);
    try {
      await apiClient.updateKeywordRule(id, {
        ...editingRule,
        group: editingRule.group.trim(),
        keyword: editingRule.keyword.trim(),
      });
      setEditingRuleId(null);
      if (await reload()) notify.success('Đã cập nhật tiêu chí chấm điểm.');
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Không thể cập nhật tiêu chí chấm điểm.');
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = async (rule: KeywordRuleItem) => {
    if (!window.confirm(`Xóa tiêu chí "${rule.keyword}"?`)) return;

    setIsSavingRule(true);
    try {
      await apiClient.deleteKeywordRule(rule.id);
      if (await reload()) notify.success('Đã xóa tiêu chí chấm điểm.');
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Không thể xóa tiêu chí chấm điểm.');
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsDraft) return;

    setIsSavingSettings(true);
    try {
      await apiClient.updateLeadScoringSettings(settingsDraft);
      if (await reload()) notify.success('Đã lưu cấu hình chấm điểm.');
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Không thể lưu cấu hình chấm điểm.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Đang tải cấu hình chấm điểm...
      </div>
    );
  }

  if (!settingsDraft) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Không tải được cấu hình chấm điểm. Hãy tải lại trang hoặc kiểm tra quyền truy cập workspace.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="m-0 text-base font-semibold text-slate-900">
            Tiêu chí nhận diện
            <InfoTip text="Tạo từ khóa, nhóm và trọng số riêng. Khi nội dung tin nhắn khớp từ khóa, trọng số sẽ được dùng để tính điểm Lead." />
          </h2>
          <p className="mt-1 mb-0 text-sm text-slate-500">
            Tạo nhóm, từ khóa và trọng số theo cách khách hàng của bạn trao đổi. Không có bộ từ khóa mẫu được áp dụng tự động.
          </p>
        </div>

        <form onSubmit={handleCreateRule} className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-12">
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Nhóm tùy chỉnh</span>
            <input
              value={newRule.group}
              onChange={(event) => updateRuleDraft(newRule, setNewRule, 'group', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm"
              maxLength={50}
              required
              disabled={!isOwner || isSavingRule}
            />
          </label>
          <label className="space-y-1 md:col-span-3">
            <span className="text-xs font-medium text-slate-600">Từ khóa / cụm từ</span>
            <input
              value={newRule.keyword}
              onChange={(event) => updateRuleDraft(newRule, setNewRule, 'keyword', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm"
              maxLength={200}
              required
              disabled={!isOwner || isSavingRule}
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Trọng số</span>
            <input
              type="number"
              step="1"
              value={newRule.weight}
              onChange={(event) => updateRuleDraft(newRule, setNewRule, 'weight', Number(event.target.value))}
              className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm"
              required
              disabled={!isOwner || isSavingRule}
            />
          </label>
          <label className="space-y-1 md:col-span-4">
            <span className="text-xs font-medium text-slate-600">Mô tả</span>
            <input
              value={newRule.description}
              onChange={(event) => updateRuleDraft(newRule, setNewRule, 'description', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm"
              maxLength={500}
              disabled={!isOwner || isSavingRule}
            />
          </label>
          <div className="flex items-center justify-between gap-3 md:col-span-12">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={newRule.isActive}
                onChange={(event) => updateRuleDraft(newRule, setNewRule, 'isActive', event.target.checked)}
                disabled={!isOwner || isSavingRule}
              />
              Đang áp dụng
            </label>
            <button
              type="submit"
              disabled={!isOwner || isSavingRule}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Thêm tiêu chí
            </button>
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="px-2 py-2 font-medium">Nhóm</th>
                <th className="px-2 py-2 font-medium">Từ khóa</th>
                <th className="px-2 py-2 font-medium">Trọng số</th>
                <th className="px-2 py-2 font-medium">Trạng thái</th>
                <th className="px-2 py-2 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((rule) => {
                const isEditing = editingRuleId === rule.id;
                return (
                  <tr key={rule.id} className="align-top">
                    <td className="px-2 py-3">
                      {isEditing ? (
                        <input
                          value={editingRule.group}
                          onChange={(event) => updateRuleDraft(editingRule, setEditingRule, 'group', event.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1.5"
                          maxLength={50}
                        />
                      ) : rule.group}
                    </td>
                    <td className="px-2 py-3">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            value={editingRule.keyword}
                            onChange={(event) => updateRuleDraft(editingRule, setEditingRule, 'keyword', event.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1.5"
                            maxLength={200}
                          />
                          <input
                            value={editingRule.description || ''}
                            onChange={(event) => updateRuleDraft(editingRule, setEditingRule, 'description', event.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                            placeholder="Mô tả"
                            maxLength={500}
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-slate-800">{rule.keyword}</div>
                          {rule.description && <div className="mt-0.5 text-xs text-slate-500">{rule.description}</div>}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          step="1"
                          value={editingRule.weight}
                          onChange={(event) => updateRuleDraft(editingRule, setEditingRule, 'weight', Number(event.target.value))}
                          className="w-24 rounded border border-slate-300 px-2 py-1.5"
                        />
                      ) : (
                        <span className={rule.weight < 0 ? 'text-rose-600' : 'text-slate-700'}>
                          {rule.weight > 0 ? `+${rule.weight}` : rule.weight}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      {isEditing ? (
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={editingRule.isActive}
                            onChange={(event) => updateRuleDraft(editingRule, setEditingRule, 'isActive', event.target.checked)}
                          />
                          Áp dụng
                        </label>
                      ) : (
                        <span className={rule.isActive ? 'text-emerald-700' : 'text-slate-400'}>
                          {rule.isActive ? 'Đang áp dụng' : 'Đã tắt'}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-2 whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              disabled={!isOwner || isSavingRule}
                              onClick={() => void handleUpdateRule(rule.id)}
                              className="text-xs font-medium text-blue-700 disabled:opacity-50"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRuleId(null)}
                              className="text-xs text-slate-500"
                            >
                              Hủy
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={!isOwner || isSavingRule}
                              onClick={() => {
                                setEditingRule(ruleDraft(rule));
                                setEditingRuleId(rule.id);
                              }}
                              className="text-xs font-medium text-blue-700 disabled:opacity-50"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              disabled={!isOwner || isSavingRule}
                              onClick={() => void handleDeleteRule(rule)}
                              className="text-xs font-medium text-rose-600 disabled:opacity-50"
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-sm text-slate-500">
                    Chưa có tiêu chí nào. Thêm tiêu chí để bắt đầu chấm điểm theo quy tắc riêng.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="m-0 text-base font-semibold text-slate-900">
            Ngưỡng và hành vi chấm điểm
            <InfoTip text="Các thiết lập bên dưới ảnh hưởng đến cách tính điểm, phân hạng và giải thích kết quả của Lead." />
          </h2>
          <p className="mt-1 mb-0 text-sm text-slate-500">
            Mở từng mục để chỉnh các thiết lập liên quan. Các thay đổi chỉ có hiệu lực sau khi lưu.
          </p>
        </div>

        <div className="space-y-2">
          {numericSettingGroups.map((group, index) => (
            <details key={group.title} open={index === 0} className="rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                {group.title}
                <InfoTip text={group.description} />
              </summary>
              <p className="mb-3 mt-1 text-xs text-slate-500">{group.description}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.keys.map((key) => {
                  const setting = numericSettings.find((item) => item.key === key);
                  if (!setting) return null;
                  return (
                    <label key={key} className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">{setting.label}</span>
                      <input
                        type="number"
                        step="1"
                        value={settingsDraft[key]}
                        onChange={(event) =>
                          setSettingsDraft({ ...settingsDraft, [key]: Number(event.target.value) })
                        }
                        disabled={!isOwner}
                        className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm disabled:bg-slate-50"
                      />
                    </label>
                  );
                })}
              </div>
              {group.title === 'Loại trừ và xử lý trường hợp chưa rõ' && (
                <>
                  <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={settingsDraft.ambiguityResolutionEnabled}
                      onChange={(event) =>
                        setSettingsDraft({ ...settingsDraft, ambiguityResolutionEnabled: event.target.checked })
                      }
                      disabled={!isOwner}
                    />
                    Bật xử lý tin nhắn sát ngưỡng và tin nhắn ngắn
                  </label>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Từ/cụm từ phủ định phía trước</span>
                      <span className="block text-xs text-slate-400">Mỗi dòng là một cụm được kiểm tra trước từ khóa.</span>
                      <textarea
                        value={settingsDraft.negationTerms.join('\n')}
                        onChange={(event) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            negationTerms: event.target.value.split('\n').map((term) => term.trim()).filter(Boolean),
                          })
                        }
                        rows={5}
                        disabled={!isOwner}
                        className="w-full resize-y rounded-md border border-slate-300 px-2.5 py-2 text-sm disabled:bg-slate-50"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-600">Từ/cụm từ phủ định phía sau</span>
                      <span className="block text-xs text-slate-400">Mỗi dòng là một cụm được kiểm tra sau từ khóa.</span>
                      <textarea
                        value={settingsDraft.negationPostTerms.join('\n')}
                        onChange={(event) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            negationPostTerms: event.target.value.split('\n').map((term) => term.trim()).filter(Boolean),
                          })
                        }
                        rows={5}
                        disabled={!isOwner}
                        className="w-full resize-y rounded-md border border-slate-300 px-2.5 py-2 text-sm disabled:bg-slate-50"
                      />
                    </label>
                  </div>
                </>
              )}
            </details>
          ))}
          <details className="rounded-lg border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">
              Tên hạng và khuyến nghị
              <InfoTip text="Tùy chỉnh nhãn hiển thị và hướng xử lý cho từng hạng Lead." />
            </summary>
            <p className="mb-3 mt-1 text-xs text-slate-500">Tùy chỉnh nhãn hiển thị và hướng xử lý cho từng hạng Lead.</p>
            <div className="space-y-3">
          {tiers.map((tier) => (
            <div key={tier} className="grid gap-3 rounded-lg border border-slate-100 p-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Tên hạng {tier}</span>
                <input
                  value={settingsDraft.tierLabels[tier]}
                  onChange={(event) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      tierLabels: { ...settingsDraft.tierLabels, [tier]: event.target.value },
                    })
                  }
                  maxLength={100}
                  disabled={!isOwner}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm disabled:bg-slate-50"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Khuyến nghị cho hạng {tier}</span>
                <textarea
                  value={settingsDraft.tierRecommendations[tier]}
                  onChange={(event) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      tierRecommendations: { ...settingsDraft.tierRecommendations, [tier]: event.target.value },
                    })
                  }
                  maxLength={500}
                  rows={2}
                  disabled={!isOwner}
                  className="w-full resize-y rounded-md border border-slate-300 px-2.5 py-2 text-sm disabled:bg-slate-50"
                />
              </label>
            </div>
          ))}
            </div>
          </details>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={!isOwner || isSavingSettings}
            onClick={() => void handleSaveSettings()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingSettings ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </section>
    </div>
  );
};
