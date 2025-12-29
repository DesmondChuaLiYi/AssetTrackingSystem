import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ScannerContext from '@/components/scanner/scannerContext';
import '@testing-library/jest-dom';

// --- 1. MOCK HTML5-QRCODE ---
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockClear = jest.fn();

// We create a variable to hold the success callback so we can trigger it manually
let triggerScanSuccess: (text: string, result: any) => void;

jest.mock('html5-qrcode', () => {
  return {
    Html5Qrcode: jest.fn().mockImplementation(() => {
      return {
        // When start is called, we capture the 'successCallback' (the 3rd argument)
        start: mockStart.mockImplementation((deviceId, config, successCb) => {
          triggerScanSuccess = successCb; // Save it for later
          return Promise.resolve();
        }),
        stop: mockStop.mockResolvedValue(undefined),
        clear: mockClear,
        isScanning: true
      };
    })
  };
});
// Place this near the top of your test file, before 'describe'
window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);

describe('ScannerContext Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1: Initial State
  it('shows the placeholder initially', () => {
    render(
      <ScannerContext
        title="Asset Scanner"
        description="Scan stuff"
        icon={() => <svg />}
        onItemScanned={jest.fn()}
        onBack={jest.fn()}
        parentScan={null}
      />
    );

    // FIX: Look for "Scan Asset" instead of "Click to Scan"
    // We use a Regex (/Scan Asset/i) to ignore case and extra whitespace
    expect(screen.getByText(/Scan Asset/i)).toBeInTheDocument();
    expect(screen.getByText('Position the code within the frame')).toBeInTheDocument();
  });

  // TEST 2: Starting the Scanner
  it('initializes scanner when clicked', async () => {
    render(
      <ScannerContext
        title="Asset Scanner"
        description="Scan stuff"
        icon={() => <svg />}
        onItemScanned={jest.fn()}
        onBack={jest.fn()}
        parentScan={null}
      />
    );

    // FIX: Click "Scan Asset"
    fireEvent.click(screen.getByText(/Scan Asset/i));

    // Expect the library to be called
    expect(mockStart).toHaveBeenCalled();
    // Expect the "Stop Scanning" button to appear
    expect(screen.getByText('Stop Scanning')).toBeInTheDocument();
  });

  // TEST 3: Completing a Scan
  it('calls onItemScanned when a code is detected', async () => {
    const mockOnItemScanned = jest.fn();

    render(
      <ScannerContext
        title="Asset Scanner"
        description="Scan stuff"
        icon={() => <svg />}
        onItemScanned={mockOnItemScanned}
        onBack={jest.fn()}
        parentScan={null}
      />
    );

    // 1. Start Scanner (FIX: Click "Scan Asset")
    fireEvent.click(screen.getByText(/Scan Asset/i));

    // 2. Simulate a successful scan by calling the captured callback
    await act(async () => {
      if (triggerScanSuccess) {
        triggerScanSuccess("SCANNED-CODE-123", {});
      }
    });

    // 3. Check if our prop function was called with the code
    expect(mockOnItemScanned).toHaveBeenCalled();
    const calledArg = mockOnItemScanned.mock.calls[0][0];
    expect(calledArg.code).toBe("SCANNED-CODE-123");
  });

  // TEST 4: Parent Scan Logic (The Tagging UI)
  it('updates UI when parentScan is provided', () => {
    const parentInfo = { type: 'location', id: 'L001', name: 'Warehouse' };

    render(
      <ScannerContext
        title="Asset Scanner"
        description="Scan stuff"
        icon={() => <svg />}
        onItemScanned={jest.fn()}
        onBack={jest.fn()}
        parentScan={parentInfo}
      />
    );

    // Check for the dynamic text
    expect(screen.getByText('Now Scan an Asset')).toBeInTheDocument();
    expect(screen.getByText('Warehouse')).toBeInTheDocument();

    // Check for the Cancel button
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});