import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { 
  Download, 
  FileSpreadsheet, 
  Camera, 
  Save, 
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { 
  exportFinancialReportToExcel, 
  exportToCSV, 
  prepareReportDataForExport 
} from '@/lib/exportUtils';
import { 
  captureScreenshot, 
  downloadScreenshot, 
  captureAndSaveScreenshot 
} from '@/lib/screenshotUtils';
import { apiFetch } from '@/lib/api';

/**
 * ReportActions Component
 * Provides export, screenshot, and save functionality for reports
 */
export const ReportActions = ({ 
  reportRef, 
  reportData,
  userId = 'demo-user',
  onSaveComplete = null 
}) => {
  const [exporting, setExporting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExportExcel = async () => {
    if (!reportData) {
      showMessage('No report data available', 'error');
      return;
    }

    setExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `financial_report_${timestamp}.xlsx`;
      
      await exportFinancialReportToExcel(reportData, filename);
      showMessage('Report exported to Excel successfully!');
    } catch (error) {
      console.error('Export error:', error);
      showMessage('Failed to export report', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!reportData) {
      showMessage('No report data available', 'error');
      return;
    }

    setExporting(true);
    try {
      // Export summary metrics to CSV
      const summaryData = [
        {
          metric: 'Total Revenue',
          value: reportData.totalIncome || 0,
          period: reportData.period || '',
        },
        {
          metric: 'Gross Profit',
          value: reportData.grossProfit || 0,
          period: reportData.period || '',
        },
        {
          metric: 'Gross Margin',
          value: `${reportData.grossMargin || 0}%`,
          period: reportData.period || '',
        },
        {
          metric: 'Net Income',
          value: reportData.netIncome || 0,
          period: reportData.period || '',
        },
        {
          metric: 'Total Expenses',
          value: reportData.totalExpenses || 0,
          period: reportData.period || '',
        },
      ];

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `financial_summary_${timestamp}.csv`;

      exportToCSV(summaryData, filename);
      showMessage('Summary exported to CSV successfully!');
    } catch (error) {
      console.error('Export error:', error);
      showMessage('Failed to export to CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleScreenshot = async () => {
    if (!reportRef?.current) {
      showMessage('Report not ready for screenshot', 'error');
      return;
    }

    setCapturing(true);
    try {
      const blob = await captureScreenshot(reportRef.current);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `report_screenshot_${timestamp}.png`;
      
      downloadScreenshot(blob, filename);
      showMessage('Screenshot saved successfully!');
    } catch (error) {
      console.error('Screenshot error:', error);
      showMessage('Failed to capture screenshot', 'error');
    } finally {
      setCapturing(false);
    }
  };

  const handleScreenshotAndSave = async () => {
    if (!reportRef?.current) {
      showMessage('Report not ready for screenshot', 'error');
      return;
    }

    setSaving(true);
    try {
      // Capture and upload screenshot
      const screenshotUrl = await captureAndSaveScreenshot(
        reportRef.current,
        userId,
        'financial_report'
      );

      // Save snapshot with screenshot
      const timestamp = new Date().toISOString();
      const snapshotName = `Auto-saved Report ${new Date().toLocaleDateString()}`;

      await apiFetch('/api/v1/snapshots/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          snapshot_type: 'financial_report',
          snapshot_name: snapshotName,
          description: 'Auto-saved with screenshot',
          data: reportData,
          screenshot_url: screenshotUrl,
          metadata: {
            saved_at: timestamp,
            auto_saved: true,
          },
        }),
      });

      showMessage('Report saved with screenshot to your account!');
      
      if (onSaveComplete) {
        onSaveComplete({ screenshotUrl, snapshotName });
      }
    } catch (error) {
      console.error('Save error:', error);
      showMessage('Failed to save report', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleExportExcel}
          disabled={exporting || !reportData}
          variant="default"
          size="sm"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 mr-2" />
          )}
          Export to Excel
        </Button>

        <Button
          onClick={handleExportCSV}
          disabled={exporting || !reportData}
          variant="outline"
          size="sm"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          Export to CSV
        </Button>

        <Button
          onClick={handleScreenshot}
          disabled={capturing}
          variant="outline"
          size="sm"
        >
          {capturing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Camera className="h-4 w-4 mr-2" />
          )}
          Take Screenshot
        </Button>

        <Button
          onClick={handleScreenshotAndSave}
          disabled={saving}
          variant="outline"
          size="sm"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save to Account
        </Button>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        💡 Tip: Save your reports to track changes over time and ensure data is never lost
      </p>
    </div>
  );
};

export default ReportActions;

