import React, { useState } from 'react';
import { TableProperties, FileSpreadsheet, PenLine, Database, Sheet } from 'lucide-react';
import { Alert } from '../../../components/ui/Alert.js';
import { Tabs, type TabItem } from '../../../components/ui/Tabs.js';
import { useWorkspaceConfig } from '../../workspace/WorkspaceConfigContext.js';
import { useMessageImport } from '../hooks/useMessageImport.js';
import { SpreadsheetGrid } from '../components/SpreadsheetGrid.js';
import { CsvImportSection } from '../components/CsvImportSection.js';
import { ManualImportSection } from '../components/ManualImportSection.js';
import { GoogleSheetIntegrationSection } from '../components/GoogleSheetIntegrationSection.js';
import { SavedMessagesTable } from '../components/SavedMessagesTable.js';
import { ImportResultsSummary } from '../components/ImportResultsSummary.js';
import { ImportErrorTable } from '../components/ImportErrorTable.js';
import type { ManualImportRow } from '../types/messaging.types.js';

import { useTranslation } from '../../../i18n/index.js';
export type TabKey = 'grid' | 'csv' | 'manual' | 'gsheet' | 'saved';

export const MessagingImportPage: React.FC = () => {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState<TabKey>('grid');

  const {
    csvContent,
    setCsvContent,
    fileName,
    loading,
    result,
    errorMessage,
    setErrorMessage,
    manualRows,
    downloadTemplate,
    generate100SampleRows,
    handleFileUpload,
    submitCsvImport,
    submitManualImport,
    submitGoogleSheetImport,
    submitCustomRows,
    addManualRow,
    removeManualRow,
    updateManualRow,
  } = useMessageImport();

  const { config } = useWorkspaceConfig();
  const customerLabel = config?.terminology?.entityName || t('messagingImport.defaultCustomer', 'Khách Hàng');

  const handleImportGridRows = async (rows: ManualImportRow[]) => {
    await submitCustomRows(rows);
  };

  const tabItems: TabItem<TabKey>[] = [
    {
      id: 'grid',
      label: t('messagingImport.tabs.grid', 'Bảng Tính In-App Grid (Ctrl+V)'),
      icon: <TableProperties size={14} />,
    },
    {
      id: 'csv',
      label: t('messagingImport.tabs.csv', 'Import File CSV'),
      icon: <FileSpreadsheet size={14} />,
    },
    {
      id: 'manual',
      label: t('messagingImport.tabs.manual', 'Nhập Tay Cơ Bản'),
      icon: <PenLine size={14} />,
    },
    {
      id: 'gsheet',
      label: t('messagingImport.tabs.gsheet', 'Đồng Bộ Google Sheet'),
      icon: <Sheet size={14} />,
    },
    {
      id: 'saved',
      label: t('messagingImport.tabs.saved', 'Tin Nhắn Đã Lưu (Database)'),
      icon: <Database size={14} />,
    },
  ];

  return (
    <div className="messaging-import-page w-full max-w-[1600px] mx-auto p-3 sm:p-4 min-h-full space-y-3.5 sm:space-y-4">
      {/* 1. Header Đồng Bộ Hệ Thống */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 m-0">
            {t('messagingImport.pageTitle', 'Quản Lý & Tiếp Nhận Tin Nhắn')}
          </h1>
          <p className="text-xs text-slate-500 m-0 mt-0.5 leading-relaxed">
            {t('messagingImport.pageDesc', 'Bảng tính trực quan hỗ trợ copy/paste từ Google Sheets & Excel, kiểm thực nghiêm ngặt qua Zod và quản lý toàn bộ kho dữ liệu tin nhắn tư vấn {customer}.', { customer: customerLabel.toLowerCase() })}
          </p>
        </div>
      </div>

      {/* Global Alert */}
      {errorMessage && (
        <Alert
          variant="danger"
          title={t('messagingImport.errorTitle', 'Thông báo lỗi')}
          onClose={() => setErrorMessage(null)}
          className="mb-2"
        >
          {errorMessage}
        </Alert>
      )}

      {/* 2. Thanh Tabs trượt gạch dưới hệ thống chuẩn */}
      <Tabs<TabKey>
        items={tabItems}
        activeTab={currentTab}
        onChange={setCurrentTab}
      />

      {/* 3. Nội dung Tab đang chọn */}
      <div className="w-full">
        {currentTab === 'grid' && (
          <SpreadsheetGrid
            onImportRows={handleImportGridRows}
            loading={loading}
          />
        )}

        {currentTab === 'csv' && (
          <CsvImportSection
            csvContent={csvContent}
            onCsvChange={setCsvContent}
            fileName={fileName}
            onFileUpload={handleFileUpload}
            onDownloadTemplate={downloadTemplate}
            onGenerate100Rows={generate100SampleRows}
            onSubmit={submitCsvImport}
            loading={loading}
          />
        )}

        {currentTab === 'manual' && (
          <ManualImportSection
            rows={manualRows}
            onAddRow={addManualRow}
            onRemoveRow={removeManualRow}
            onUpdateRow={updateManualRow}
            onSubmit={submitManualImport}
            loading={loading}
          />
        )}

        {currentTab === 'gsheet' && (
          <GoogleSheetIntegrationSection
            onImportGoogleSheet={submitGoogleSheetImport}
            loading={loading}
          />
        )}

        {currentTab === 'saved' && (
          <SavedMessagesTable />
        )}
      </div>

      {/* 4. Results Section */}
      {result && currentTab !== 'saved' && (
        <div className="space-y-3 pt-2" id="results">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {t('messagingImport.resultsTitle', 'Kết quả xử lý và kiểm thực')}
            </span>
          </div>

          <ImportResultsSummary result={result} />

          <ImportErrorTable errors={result.errors} />
        </div>
      )}
    </div>
  );
};
