import { useState, useCallback, useEffect, useRef } from 'react';

interface PrinterState {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  printBytes: (data: Uint8Array) => Promise<void>;
  error: string | null;
}

/**
 * WebUSB hook for thermal printer communication.
 * Manages USB device lifecycle and exposes raw byte printing.
 *
 * On mount, attempts to reconnect to a previously paired device.
 * The browser remembers granted USB permissions across sessions.
 */
export function usePrinter(): PrinterState {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deviceRef = useRef<USBDevice | null>(null);
  const endpointRef = useRef<number>(1);

  const openDevice = useCallback(async (device: USBDevice) => {
    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    // Find the first OUT endpoint on the first interface
    const iface = device.configuration!.interfaces[0];
    await device.claimInterface(iface.interfaceNumber);
    const outEndpoint = iface.alternate.endpoints.find((ep) => ep.direction === 'out');
    if (!outEndpoint) {
      throw new Error('No OUT endpoint found on printer');
    }
    endpointRef.current = outEndpoint.endpointNumber;
    deviceRef.current = device;
    setIsConnected(true);
    setError(null);
  }, []);

  const connect = useCallback(async () => {
    try {
      if (!navigator.usb) {
        throw new Error('WebUSB is not supported in this browser');
      }
      const device = await navigator.usb.requestDevice({
        filters: [], // Show all USB devices
      });
      await openDevice(device);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Don't treat user cancellation as an error
      if (!msg.includes('No device selected')) {
        setError(msg);
      }
    }
  }, [openDevice]);

  const disconnect = useCallback(async () => {
    if (deviceRef.current) {
      try {
        await deviceRef.current.close();
      } catch {
        // Ignore close errors
      }
      deviceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const printBytes = useCallback(async (data: Uint8Array) => {
    if (!deviceRef.current) {
      throw new Error('Printer not connected');
    }
    try {
      await deviceRef.current.transferOut(endpointRef.current, data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setIsConnected(false);
      deviceRef.current = null;
      throw e;
    }
  }, []);

  // Auto-reconnect to previously paired device on mount
  useEffect(() => {
    if (!navigator.usb) return;
    navigator.usb.getDevices().then(async (devices) => {
      if (devices.length > 0) {
        try {
          await openDevice(devices[0]);
        } catch {
          // Silently fail — user can manually reconnect
        }
      }
    });
  }, [openDevice]);

  return { isConnected, connect, disconnect, printBytes, error };
}
