import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WelcomeContent from '@/components/scanner/welcomeContent';
import '@testing-library/jest-dom';

describe('WelcomeContent Component', () => {
  it('renders the welcome title and description', () => {
    render(<WelcomeContent onNavigate={jest.fn()} />);

    expect(screen.getByText(/Welcome to Asset Tracking/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose a scanning option/i)).toBeInTheDocument();
  });

  it('renders all 4 scanning options', () => {
    render(<WelcomeContent onNavigate={jest.fn()} />);

    expect(screen.getByText('Asset Scan')).toBeInTheDocument();
    expect(screen.getByText('Staff ID Scan')).toBeInTheDocument();
    expect(screen.getByText('Location Scan')).toBeInTheDocument();
    expect(screen.getByText('Department Scan')).toBeInTheDocument();
  });

  it('calls onNavigate with correct type when buttons are clicked', () => {
    const mockNavigate = jest.fn();
    render(<WelcomeContent onNavigate={mockNavigate} />);

    // 1. Click Asset Scan
    // We look for the heading inside the button to ensure we click the right area
    fireEvent.click(screen.getByText('Asset Scan'));
    expect(mockNavigate).toHaveBeenCalledWith('asset');

    // 2. Click Location Scan
    fireEvent.click(screen.getByText('Location Scan'));
    expect(mockNavigate).toHaveBeenCalledWith('location');
  });
});