import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrinter } from './usePrinter';

// Mock navigator.usb
const mockTransferOut = vi.fn().mockResolvedValue({ status: 'ok' });
const mockDevice = {
  open: vi.fn().mockResolvedValue(undefined),
  selectConfiguration: vi.fn().mockResolvedValue(undefined),
  claimInterface: vi.fn().mockResolvedValue(undefined),
  transferOut: mockTransferOut,
  close: vi.fn().mockResolvedValue(undefined),
  configuration: {
    interfaces: [
      { interfaceNumber: 0, alternate: { endpoints: [{ endpointNumber: 1, direction: 'out' }] } },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'usb', {
    value: {
      requestDevice: vi.fn().mockResolvedValue(mockDevice),
      getDevices: vi.fn().mockResolvedValue([]),
    },
    configurable: true,
  });
});

describe('usePrinter', () => {
  it('starts disconnected', () => {
    const { result } = renderHook(() => usePrinter());
    expect(result.current.isConnected).toBe(false);
  });

  it('connects to a USB device', async () => {
    const { result } = renderHook(() => usePrinter());
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.isConnected).toBe(true);
  });

  it('sends bytes to the printer', async () => {
    const { result } = renderHook(() => usePrinter());
    await act(async () => {
      await result.current.connect();
    });
    const data = new Uint8Array([0x1b, 0x69]);
    await act(async () => {
      await result.current.printBytes(data);
    });
    expect(mockTransferOut).toHaveBeenCalledWith(1, data);
  });

  it('disconnects from the printer', async () => {
    const { result } = renderHook(() => usePrinter());
    await act(async () => {
      await result.current.connect();
    });
    await act(async () => {
      await result.current.disconnect();
    });
    expect(result.current.isConnected).toBe(false);
    expect(mockDevice.close).toHaveBeenCalled();
  });
});
