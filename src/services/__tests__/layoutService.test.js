/* eslint-disable no-undef */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchLayout,
  saveLayout,
  debouncedSaveLayout,
  layoutToStorageFormat,
  storageToLayoutFormat,
  getDefaultLayout,
  fetchRGLLayout,
  saveRGLLayout,
} from '../layoutService';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

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
    localStorageMock.clear();
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

  describe('layoutToStorageFormat', () => {
    it('should convert RGL format to storage format', () => {
      const rglLayout = [
        { i: 'slide-0', x: 0, y: 0, w: 24, h: 5, minW: 4, minH: 3 },
        { i: 'slide-1', x: 0, y: 5, w: 8, h: 5, minW: 4, minH: 3 },
      ];

      const result = layoutToStorageFormat(rglLayout);

      expect(result).toEqual([
        { id: 'slide-0', x: 0, y: 0, w: 24, h: 5 },
        { id: 'slide-1', x: 0, y: 5, w: 8, h: 5 },
      ]);
    });

    it('should handle empty array', () => {
      const result = layoutToStorageFormat([]);
      expect(result).toEqual([]);
    });

    it('should strip extra RGL properties', () => {
      const rglLayout = [
        {
          i: 'card-1',
          x: 0,
          y: 0,
          w: 6,
          h: 4,
          minW: 4,
          minH: 3,
          maxW: 24,
          maxH: 16,
          static: false,
          moved: true,
        },
      ];

      const result = layoutToStorageFormat(rglLayout);

      expect(result[0]).not.toHaveProperty('minW');
      expect(result[0]).not.toHaveProperty('static');
      expect(result[0]).not.toHaveProperty('moved');
      expect(result[0]).toHaveProperty('id', 'card-1');
    });
  });

  describe('storageToLayoutFormat', () => {
    it('should convert storage format to RGL format', () => {
      const storageLayout = [
        { id: 'slide-0', x: 0, y: 0, w: 24, h: 5 },
        { id: 'slide-1', x: 0, y: 5, w: 8, h: 5 },
      ];

      const result = storageToLayoutFormat(storageLayout);

      expect(result[0]).toHaveProperty('i', 'slide-0');
      expect(result[0]).toHaveProperty('minW', 4);
      expect(result[0]).toHaveProperty('minH', 3);
      expect(result[1]).toHaveProperty('i', 'slide-1');
    });

    it('should handle empty array', () => {
      const result = storageToLayoutFormat([]);
      expect(result).toEqual([]);
    });

    it('should handle non-array input', () => {
      const result = storageToLayoutFormat(null);
      expect(result).toEqual([]);
    });

    it('should apply default values for missing properties', () => {
      const storageLayout = [{ id: 'partial-card' }];

      const result = storageToLayoutFormat(storageLayout);

      expect(result[0]).toEqual({
        i: 'partial-card',
        x: 0,
        y: 0,
        w: 8,
        h: 5,
        minW: 4,
        minH: 3,
        maxW: 24,
        maxH: 16,
      });
    });
  });

  describe('getDefaultLayout', () => {
    it('should return default layout in RGL format', () => {
      const defaultLayout = getDefaultLayout();

      expect(defaultLayout).toBeInstanceOf(Array);
      expect(defaultLayout.length).toBeGreaterThan(0);
      expect(defaultLayout[0]).toHaveProperty('i');
      expect(defaultLayout[0]).toHaveProperty('minW');
      expect(defaultLayout[0]).toHaveProperty('minH');
    });

    it('should include all default slides', () => {
      const defaultLayout = getDefaultLayout();

      // Check that slide-0 through slide-10 are present
      const slideIds = defaultLayout.map((item) => item.i);
      expect(slideIds).toContain('slide-0');
      expect(slideIds).toContain('slide-1');
    });
  });

  describe('fetchRGLLayout', () => {
    it('should fetch and convert layout from backend', async () => {
      const mockLayout = {
        layout_data: [
          { id: 'slide-0', x: 0, y: 0, w: 24, h: 5 },
        ],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayout,
      });

      const result = await fetchRGLLayout();

      expect(result[0]).toHaveProperty('i', 'slide-0');
      expect(result[0]).toHaveProperty('minW');
    });

    it('should fall back to localStorage on backend error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      localStorageMock.setItem(
        'eqho-dashboard-layout',
        JSON.stringify([{ id: 'local-slide', x: 0, y: 0, w: 12, h: 4 }])
      );

      const result = await fetchRGLLayout();

      expect(result[0]).toHaveProperty('i', 'local-slide');
    });

    it('should fall back to default layout when localStorage is empty', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      localStorageMock.getItem.mockReturnValue(null);

      const result = await fetchRGLLayout();

      // Should return default layout
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('i', 'slide-0');
    });
  });

  describe('saveRGLLayout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should convert and save layout', async () => {
      const rglLayout = [
        { i: 'slide-0', x: 0, y: 0, w: 24, h: 5, minW: 4, minH: 3 },
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const promise = saveRGLLayout(rglLayout, 'user-123', 100);
      
      // Should save to localStorage immediately
      expect(localStorageMock.setItem).toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(fetch).toHaveBeenCalled();
    });
  });
});
