import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DatePickerPopover from './DatePickerPopover.jsx';

vi.mock('../../shared/analytics.js', () => ({
  trackDateSelection: vi.fn(),
}));

describe('DatePickerPopover', () => {
  const availableDates = ['2025-11-01', '2025-11-15', '2025-11-25'];
  const mockOnDateChange = vi.fn();

  it('should render calendar icon button', () => {
    render(
      <DatePickerPopover
        selectedDate="2025-11-25"
        availableDates={availableDates}
        onDateChange={mockOnDateChange}
      />
    );

    const button = screen.getByRole('button', { name: /select date from calendar/i });
    expect(button).toBeInTheDocument();
  });

  it('should open popover when button is clicked', () => {
    render(
      <DatePickerPopover
        selectedDate="2025-11-25"
        availableDates={availableDates}
        onDateChange={mockOnDateChange}
      />
    );

    const button = screen.getByRole('button', { name: /select date from calendar/i });
    fireEvent.click(button);

    expect(screen.getByText('Select a date')).toBeInTheDocument();
    expect(screen.getByText('Highlighted dates have available data')).toBeInTheDocument();
  });
});
