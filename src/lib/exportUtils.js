/**
 * Export Utilities for Financial Reports
 * Supports CSV and Excel exports with proper formatting
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Export data to CSV format
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - Name of the file
 * @param {Array<string>} headers - Optional custom headers
 */
export function exportToCSV(data, filename = 'export.csv', headers = null) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Create CSV content
  let csvContent = csvHeaders.join(',') + '\n';

  // Add data rows
  data.forEach((row) => {
    const values = csvHeaders.map((header) => {
      const value = row[header] || '';
      // Escape quotes and wrap in quotes if contains comma
      const escapedValue = String(value).replace(/"/g, '""');
      return escapedValue.includes(',') ? `"${escapedValue}"` : escapedValue;
    });
    csvContent += values.join(',') + '\n';
  });

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
}

/**
 * Export financial report to formatted Excel
 * @param {Object} reportData - Complete report data
 * @param {string} filename - Name of the Excel file
 */
export function exportFinancialReportToExcel(reportData, filename = 'financial_report.xlsx') {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Add metadata
    wb.Props = {
      Title: 'Financial Report',
      Subject: 'Weekly Financial Analysis',
      Author: 'Eqho Due Diligence',
      CreatedDate: new Date(),
    };

    // Sheet 1: Executive Summary
    const summaryData = [
      ['Weekly Financial Analysis & Cash Flow Forecast'],
      ['Generated:', new Date().toLocaleString()],
      [],
      ['Executive Summary'],
      ['Metric', 'Value'],
      ['Total Revenue', reportData.totalIncome || 0],
      ['Gross Profit', reportData.grossProfit || 0],
      ['Gross Margin', `${reportData.grossMargin || 0}%`],
      ['Net Income', reportData.netIncome || 0],
      ['Total Expenses', reportData.totalExpenses || 0],
      [],
      ['Period', reportData.period || 'N/A'],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);

    // Apply column widths
    ws1['!cols'] = [{ wch: 25 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, ws1, 'Executive Summary');

    // Sheet 2: Cash Flow Forecast (if provided)
    if (reportData.cashFlowForecast && reportData.cashFlowForecast.length > 0) {
      const forecastData = [
        ['90-Day Cash Flow Forecast'],
        [],
        ['Month', 'Inflows', 'Outflows', 'Net Cash Flow', 'Ending Cash'],
        ...reportData.cashFlowForecast.map((row) => [
          row.month,
          row.inflows,
          row.outflows,
          row.netFlow,
          row.endingCash || '',
        ]),
      ];

      const ws2 = XLSX.utils.aoa_to_sheet(forecastData);
      ws2['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

      XLSX.utils.book_append_sheet(wb, ws2, 'Cash Flow Forecast');
    }

    // Sheet 3: Spending by Category (if provided)
    if (reportData.spendingCategories && reportData.spendingCategories.length > 0) {
      const spendingData = [
        ['Spending Breakdown by Category'],
        [],
        ['Category', 'Amount', 'Percentage', 'Trend'],
        ...reportData.spendingCategories.map((row) => [
          row.category,
          row.amount,
          `${row.percent}%`,
          row.trend,
        ]),
      ];

      const ws3 = XLSX.utils.aoa_to_sheet(spendingData);
      ws3['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];

      XLSX.utils.book_append_sheet(wb, ws3, 'Spending');
    }

    // Sheet 4: Risks (if provided)
    if (reportData.risks && reportData.risks.length > 0) {
      const risksData = [
        ['Risk Analysis'],
        [],
        ['Severity', 'Title', 'Description', 'Key Metric'],
        ...reportData.risks.map((row) => [
          row.severity,
          row.title,
          row.description,
          row.metric,
        ]),
      ];

      const ws4 = XLSX.utils.aoa_to_sheet(risksData);
      ws4['!cols'] = [{ wch: 12 }, { wch: 35 }, { wch: 50 }, { wch: 20 }];

      XLSX.utils.book_append_sheet(wb, ws4, 'Risks');
    }

    // Sheet 5: Recommendations (if provided)
    if (reportData.recommendations && reportData.recommendations.length > 0) {
      const recsData = [
        ['Action Plan & Recommendations'],
        [],
        ['Priority', 'Action', 'Impact', 'Timeline'],
        ...reportData.recommendations.map((row) => [
          row.priority,
          row.action,
          row.impact,
          row.timeline,
        ]),
      ];

      const ws5 = XLSX.utils.aoa_to_sheet(recsData);
      ws5['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 25 }, { wch: 15 }];

      XLSX.utils.book_append_sheet(wb, ws5, 'Recommendations');
    }

    // Sheet 6: Recent Transactions (if provided)
    if (reportData.recentTransactions && reportData.recentTransactions.length > 0) {
      const txnData = [
        ['Recent Large Transactions'],
        [],
        ['Date', 'Vendor', 'Category', 'Amount'],
        ...reportData.recentTransactions.map((row) => [
          row.date,
          row.vendor,
          row.category,
          row.amount,
        ]),
      ];

      const ws6 = XLSX.utils.aoa_to_sheet(txnData);
      ws6['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 15 }];

      XLSX.utils.book_append_sheet(wb, ws6, 'Transactions');
    }

    // Write the workbook
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export to Excel');
  }
}

/**
 * Export metrics to Excel
 * @param {Object} metricsData - Metrics data
 * @param {string} filename - Name of the Excel file
 */
export function exportMetricsToExcel(metricsData, filename = 'metrics.xlsx') {
  try {
    const wb = XLSX.utils.book_new();

    // Create metrics sheet
    const data = [
      ['SaaS Metrics Report'],
      ['Generated:', new Date().toLocaleString()],
      [],
      ['Metric', 'Value', 'Unit'],
    ];

    // Add metrics data
    Object.entries(metricsData).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Nested object
        data.push([key.toUpperCase(), '', '']);
        Object.entries(value).forEach(([subKey, subValue]) => {
          data.push([`  ${subKey}`, subValue, '']);
        });
      } else {
        data.push([key, value, '']);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Metrics');

    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Error exporting metrics to Excel:', error);
    throw new Error('Failed to export metrics to Excel');
  }
}

/**
 * Export any table to CSV
 * @param {HTMLTableElement} tableElement - Table DOM element
 * @param {string} filename - Name of the CSV file
 */
export function exportTableToCSV(tableElement, filename = 'table.csv') {
  if (!tableElement) {
    console.warn('No table element provided');
    return;
  }

  const rows = tableElement.querySelectorAll('tr');
  const csvData = [];

  rows.forEach((row) => {
    const cells = row.querySelectorAll('th, td');
    const rowData = Array.from(cells).map((cell) => {
      const text = cell.textContent.trim();
      // Escape quotes and wrap in quotes if contains comma
      const escapedText = text.replace(/"/g, '""');
      return escapedText.includes(',') ? `"${escapedText}"` : escapedText;
    });
    csvData.push(rowData.join(','));
  });

  const csvContent = csvData.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
}

/**
 * Format currency for export
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrencyForExport(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Prepare report data for export
 * @param {Object} metrics - Report metrics
 * @param {Array} cashFlowForecast - Cash flow data
 * @param {Array} spendingCategories - Spending data
 * @param {Array} risks - Risk data
 * @param {Array} recommendations - Recommendations data
 * @param {Array} recentTransactions - Transaction data
 * @returns {Object} Prepared report data
 */
export function prepareReportDataForExport(
  metrics,
  cashFlowForecast,
  spendingCategories,
  risks,
  recommendations,
  recentTransactions
) {
  return {
    totalIncome: metrics?.totalIncome || 0,
    totalCOGS: metrics?.totalCOGS || 0,
    grossProfit: metrics?.grossProfit || 0,
    grossMargin: metrics?.grossMargin || 0,
    netIncome: metrics?.netIncome || 0,
    totalExpenses: metrics?.totalExpenses || 0,
    period: metrics?.period || new Date().toLocaleDateString(),
    cashFlowForecast: cashFlowForecast || [],
    spendingCategories: spendingCategories || [],
    risks: risks || [],
    recommendations: recommendations || [],
    recentTransactions: recentTransactions || [],
  };
}

