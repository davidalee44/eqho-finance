# Version Control System

## Overview

Snapshot-based version control for financial reports using PostgreSQL and Supabase Storage. Enables users to save report states, restore previous versions, and export data in multiple formats.

## Architecture

### Backend Components

**Database**
- `report_snapshots` table with JSONB data storage
- Row Level Security (RLS) for user isolation
- Indexes on `user_id`, `created_at`, and `snapshot_type`
- Auto-updating `updated_at` timestamp via trigger

**Service Layer**
- `snapshot_service.py`: CRUD operations, validates user ownership
- Handles screenshot URL management
- Provides snapshot statistics

**API Layer**
- `snapshots.py`: REST endpoints with Pydantic validation
- Standard HTTP methods (GET, POST, PATCH, DELETE)
- User ID required on all operations for security

### Frontend Components

**Utilities**
- `exportUtils.js`: Excel/CSV generation using `xlsx` library
- `screenshotUtils.js`: DOM capture using `html2canvas`, Supabase upload
- `api.js`: HTTP client with error handling and caching

**UI Components**
- `VersionControl.jsx`: Save, list, restore, and delete snapshots
- `ReportActions.jsx`: Export and screenshot action buttons
- `FinancialReport.jsx`: Integrates version control UI

### Data Flow

```
User Action
    ↓
Frontend Component (React)
    ↓
Utility Function (JS)
    ↓
Backend API (FastAPI)
    ↓
Service Layer (Python)
    ↓
Supabase (PostgreSQL + Storage)
```

## Installation

### 1. Database Setup

Run the migration script in Supabase SQL Editor:

```sql
-- File: backend/migrations/create_snapshots_table.sql
-- Creates table, indexes, RLS policies, and storage bucket
```

This creates:
- `report_snapshots` table
- Storage bucket `report-screenshots`
- RLS policies for user isolation
- Indexes for query performance

### 2. Backend Configuration

Environment variables required:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

Router is automatically included in `app/main.py`.

### 3. Frontend Dependencies

Already installed via `package.json`:
- `xlsx` - Excel file generation
- `html2canvas` - Screenshot capture
- `file-saver` - File downloads

## Usage

### Save Snapshot

```javascript
import { apiFetch } from '@/lib/api';

const snapshot = await apiFetch('/api/v1/snapshots/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'user-123',
    snapshot_type: 'financial_report',
    snapshot_name: 'Q4 2025',
    description: 'Pre-budget adjustment',
    data: { /* report state */ },
    metadata: { timestamp: new Date().toISOString() }
  })
});
```

### List Snapshots

```javascript
const snapshots = await apiFetch(
  `/api/v1/snapshots/?user_id=user-123&snapshot_type=financial_report&limit=50`
);
```

### Export to Excel

```javascript
import { exportFinancialReportToExcel, prepareReportDataForExport } from '@/lib/exportUtils';

const data = prepareReportDataForExport(
  metrics,
  cashFlowForecast,
  spendingCategories,
  risks,
  recommendations,
  transactions
);

exportFinancialReportToExcel(data, 'financial_report_2025-11-12.xlsx');
```

### Capture Screenshot

```javascript
import { captureScreenshot, downloadScreenshot } from '@/lib/screenshotUtils';

const reportElement = document.getElementById('report');
const blob = await captureScreenshot(reportElement);
downloadScreenshot(blob, 'report_screenshot.png');
```

### Upload Screenshot to Supabase

```javascript
import { captureAndSaveScreenshot } from '@/lib/screenshotUtils';

const url = await captureAndSaveScreenshot(
  reportElement,
  'user-123',
  'financial_report'
);
// Returns: https://.../report-screenshots/user-123/filename.png
```

## API Reference

### POST /api/v1/snapshots/

Create a new snapshot.

**Request Body:**
```json
{
  "user_id": "string",
  "snapshot_type": "string",
  "snapshot_name": "string",
  "description": "string (optional)",
  "data": {},
  "metadata": {} (optional),
  "screenshot_url": "string (optional)"
}
```

**Response:** Created snapshot object with `id`, `created_at`, `updated_at`

### GET /api/v1/snapshots/

List snapshots for a user.

**Query Parameters:**
- `user_id` (required): User identifier
- `snapshot_type` (optional): Filter by type
- `limit` (optional): Max results, default 50

**Response:** Array of snapshot objects

### GET /api/v1/snapshots/{id}

Get a specific snapshot.

**Query Parameters:**
- `user_id` (required): For security validation

**Response:** Snapshot object

### PATCH /api/v1/snapshots/{id}

Update snapshot name, description, or metadata.

**Query Parameters:**
- `user_id` (required): For security validation

**Request Body:** Partial snapshot object with fields to update

**Response:** Updated snapshot object

### DELETE /api/v1/snapshots/{id}

Delete a snapshot and associated screenshot.

**Query Parameters:**
- `user_id` (required): For security validation

**Response:** `{"message": "Snapshot deleted successfully"}`

## Security

### Row Level Security (RLS)

All queries are automatically filtered by `auth.uid() = user_id`. Users cannot access snapshots belonging to other users, even with direct SQL access.

Policies:
```sql
-- SELECT: Users can view their own snapshots
CREATE POLICY "Users can view own snapshots"
  ON report_snapshots FOR SELECT
  USING (auth.uid()::text = user_id);

-- INSERT: Users can create their own snapshots
CREATE POLICY "Users can create own snapshots"
  ON report_snapshots FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- UPDATE: Users can update their own snapshots
CREATE POLICY "Users can update own snapshots"
  ON report_snapshots FOR UPDATE
  USING (auth.uid()::text = user_id);

-- DELETE: Users can delete their own snapshots
CREATE POLICY "Users can delete own snapshots"
  ON report_snapshots FOR DELETE
  USING (auth.uid()::text = user_id);
```

### Storage Security

Screenshots are stored in user-specific folders: `user-id/filename.png`

Storage policies:
- Users can only upload to their own folder
- Users can only view files in their own folder
- Users can only delete files in their own folder

### API Validation

- All endpoints validate `user_id` matches request context
- Pydantic models enforce type safety
- Error messages don't expose internal details

## Testing

### Backend Tests

```bash
cd backend
pytest tests/test_snapshot_service.py
```

Test coverage:
- Create snapshot with valid data
- Create snapshot with missing required fields
- List snapshots for user
- Update snapshot fields
- Delete snapshot and verify screenshot removal
- RLS policy enforcement

### Frontend Tests

```bash
npm test
```

Test coverage:
- Export to Excel generates valid workbook
- Export to CSV creates proper format
- Screenshot capture returns blob
- API calls handle errors correctly

### Manual Testing

1. Start backend: `uvicorn app.main:app --reload`
2. Start frontend: `npm run dev`
3. Test sequence:
   - Save a snapshot
   - Export to Excel
   - Capture screenshot
   - List version history
   - Restore previous version
   - Delete snapshot

## Performance

### Database
- Indexed queries: ~50-150ms
- JSONB storage: Efficient for flexible data structures
- Pagination: Limits result sets to prevent large payloads

### Frontend
- Export: Client-side, ~100-500ms depending on data size
- Screenshot: ~1-2s for full report capture
- Upload: ~500ms for typical screenshot (~1MB)

### Storage
- Screenshots: Compressed PNG, typically 500KB-2MB
- CDN delivery via Supabase
- Automatic cleanup when snapshot deleted

## Limitations

- Screenshot capture requires modern browser with canvas support
- Excel export limited by browser memory (typically handles 10K+ rows)
- Snapshots have no hard size limit but large JSONB may impact performance
- Storage quota enforced by Supabase plan

## Troubleshooting

### "Failed to create snapshot"

Check:
1. Backend is running: `curl http://localhost:8000/health`
2. Supabase credentials in `.env`
3. RLS policies exist: Run migration script
4. Browser console for detailed error

### "Export to Excel fails"

Check:
1. `xlsx` package installed: `npm list xlsx`
2. Browser console for JavaScript errors
3. Report data is properly formatted
4. Browser has sufficient memory

### "Screenshot capture fails"

Check:
1. `html2canvas` installed: `npm list html2canvas`
2. CORS configured for external images
3. Report element has valid ref
4. Browser supports canvas API

### "Upload to Supabase fails"

Check:
1. Storage bucket `report-screenshots` exists
2. Storage policies configured
3. User has upload permissions
4. File size within limits (default 5MB)

## Migration from Previous System

If migrating from another version control system:

1. Export existing snapshots to JSON
2. Format data to match schema
3. Bulk insert via Supabase API
4. Update screenshot URLs if applicable
5. Verify RLS policies work correctly

## Monitoring

Recommended metrics to track:
- Snapshot creation rate per user
- Storage usage per user
- Export frequency by format
- Screenshot capture success rate
- API error rate by endpoint
- Average response times

## Maintenance

### Regular Tasks

**Weekly:**
- Monitor error logs for failed operations
- Check storage usage trends

**Monthly:**
- Review slow query logs
- Update dependencies
- Analyze snapshot retention patterns

**Quarterly:**
- Archive or delete old snapshots (optional)
- Review RLS policies
- Update documentation

### Backup Strategy

Supabase handles automatic backups. For additional safety:
- Export snapshots periodically via API
- Store screenshots in secondary location
- Document recovery procedures

## Future Considerations

### Potential Enhancements

- Snapshot comparison/diff view
- Automatic scheduled snapshots
- Collaborative annotations
- Snapshot tags and search
- PDF export format
- Webhook notifications on snapshot events
- Batch operations (restore multiple, bulk delete)

### Scalability

Current architecture supports:
- 1000+ snapshots per user
- 100+ concurrent users
- 10GB+ total storage

To scale beyond:
- Add caching layer (Redis)
- Implement snapshot archival
- Use CDN for screenshot delivery
- Add read replicas for queries
- Implement rate limiting

## References

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [xlsx Documentation](https://docs.sheetjs.com/)
- [html2canvas Documentation](https://html2canvas.hertzen.com/)
