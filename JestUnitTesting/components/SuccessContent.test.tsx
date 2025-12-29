import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SuccessContent from '@/components/scanner/successContent';
import '@testing-library/jest-dom';

// Mock window.history.back
const mockBack = jest.fn();
Object.defineProperty(window, 'history', {
  value: { back: mockBack },
});

describe('SuccessContent Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly for a Single Asset', () => {
    const mockItem = {
      asset_id: 'ASSET-001',
      name: 'Test Bottle',
      category: 'Beverage',
      condition: 'In-use',
      location_id: 'Warehouse'
    };

    render(
      <SuccessContent
        scannedCount={1}
        scanType="asset"
        item={mockItem}
      />
    );

    expect(screen.getByText('Submission Successful!')).toBeInTheDocument();
    expect(screen.getByText('Test Bottle')).toBeInTheDocument();
    expect(screen.getByText('ASSET-001')).toBeInTheDocument();
    expect(screen.getByText('Warehouse')).toBeInTheDocument();
  });

  it('renders correctly for a New Asset Registration', () => {
    const mockItem = { name: 'New Laptop' };

    render(
      <SuccessContent
        scannedCount={1}
        scanType="New Asset Registered"
        item={mockItem}
      />
    );

    expect(screen.getByText('Asset Registered!')).toBeInTheDocument();
    expect(screen.getByText(/New asset New Laptop has been created/i)).toBeInTheDocument();
  });

  it('calls history.back when "Scan More Items" is clicked', () => {
    render(<SuccessContent scannedCount={1} scanType="asset" item={{}} />);

    const backBtn = screen.getByText('Scan More Items');
    fireEvent.click(backBtn);

    expect(mockBack).toHaveBeenCalled();
  });
});