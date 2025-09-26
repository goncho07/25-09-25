import { renderHook, act } from '@testing-library/react';
import { useOfflineStatus } from '../../../hooks/useOfflineStatus';
import { vi } from 'vitest';

describe('useOfflineStatus', () => {
  it('should return true when online', () => {
    const { result } = renderHook(() => useOfflineStatus());
    expect(result.current).toBe(true);
  });

  it('should return false when offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = renderHook(() => useOfflineStatus());
    expect(result.current).toBe(false);
    vi.restoreAllMocks();
  });

  it('should update status when window fires online event', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = renderHook(() => useOfflineStatus());
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(true);
    vi.restoreAllMocks();
  });

  it('should update status when window fires offline event', () => {
    const { result } = renderHook(() => useOfflineStatus());
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOfflineStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});