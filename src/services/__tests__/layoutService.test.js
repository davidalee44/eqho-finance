import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchLayout, saveLayout, debouncedSaveLayout } from '../layoutService';

// Mock fetch
global.fetch = vi.fn();

// Mock supabase auth
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: {
            session: {
              access_token: 'mock-token',
            },
          },
        })
      ),
    },
  },
}));

// Mock audit service
vi.mock('../auditService', () => ({
  logAction: vi.fn(() => Promise.resolve()),
}));

describe('layoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('fetchLayout', () => {
    it('should fetch layout successfully', async () => {
      const mockLayout = { layout_data: [{ id: 1, x: 0, y: 0 }] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayout,
      });

      const result = await fetchLayout();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/layouts'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
      expect(result).toEqual(mockLayout);
    });

    it('should throw error on failed fetch', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(fetchLayout()).rejects.toThrow('Failed to fetch layout');
    });
  });

  describe('saveLayout', () => {
    it('should save layout successfully', async () => {
      const mockLayout = [{ id: 1, x: 0, y: 0 }];
      const mockResponse = { success: true, layout_data: mockLayout };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await saveLayout(mockLayout, 'user-123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/layouts'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ layout_data: mockLayout }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle save errors', async () => {
      const mockLayout = [{ id: 1, x: 0, y: 0 }];

      fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
        json: async () => ({ detail: 'Admin access required' }),
      });

      await expect(saveLayout(mockLayout, 'user-123')).rejects.toThrow(
        'Admin access required'
      );
    });
  });

  describe('debouncedSaveLayout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce save calls', async () => {
      const mockLayout = [{ id: 1, x: 0, y: 0 }];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Make multiple rapid calls
      debouncedSaveLayout(mockLayout, 'user-123', 500);
      debouncedSaveLayout(mockLayout, 'user-123', 500);
      const finalPromise = debouncedSaveLayout(mockLayout, 'user-123', 500);

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(500);

      // Wait for the final promise to resolve
      await finalPromise;

      // Should only call fetch once due to debouncing
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
