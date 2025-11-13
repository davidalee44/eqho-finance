# Testing Guide

## Overview

This project uses Vitest and React Testing Library for testing. Tests are co-located with the code they test in `__tests__` directories.

## Running Tests

```bash
# Run tests in watch mode (interactive)
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI dashboard
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are organized in `__tests__` directories alongside the code:

```
src/
  components/
    ui/
      __tests__/
        button.test.jsx
        tour.test.jsx
  services/
    __tests__/
      layoutService.test.js
  hooks/
    __tests__/
      useDraggableCards.test.js
  contexts/
    __tests__/
      AuthContext.test.jsx
  lib/
    __tests__/
      utils.test.js
```

## Writing Tests

### Component Tests

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle clicks', () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### Service Tests

```js
import { vi } from 'vitest';
import { myService } from '../myService';

// Mock fetch or other globals
global.fetch = vi.fn();

describe('myService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch data', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'test' }),
    });

    const result = await myService.fetchData();
    expect(result).toEqual({ data: 'test' });
  });
});
```

### Hook Tests

```js
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('should update state', () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.updateValue('new value');
    });

    expect(result.current.value).toBe('new value');
  });
});
```

## Test Coverage

Current test coverage includes:

- **UI Components**: Button, Tour, AlertDialog
- **Services**: layoutService
- **Utilities**: cn (className utility)
- **Hooks**: useDraggableCards
- **Contexts**: AuthContext

## Mocks and Utilities

Test setup (`src/test/setup.js`) includes global mocks for:

- IntersectionObserver
- ResizeObserver
- matchMedia
- localStorage/sessionStorage
- window.scrollTo

## Best Practices

1. **Test behavior, not implementation** - Focus on what the user sees and does
2. **Use accessible queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Mock external dependencies** - Mock Supabase, fetch, etc.
4. **Clean up after tests** - Use `afterEach(cleanup)` (automatically handled)
5. **Avoid testing library internals** - Don't test implementation details
6. **Test error states** - Include tests for error handling and edge cases

## Continuous Integration

Tests run automatically on:
- Pre-commit (if husky is configured)
- Pull requests
- CI/CD pipeline

To run tests before committing:

```bash
npm run test:run && npm run lint
```
