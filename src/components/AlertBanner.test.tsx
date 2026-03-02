import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AlertBanner, { type Alert, type AlertType } from './AlertBanner';

describe('AlertBanner Component', () => {
  const createAlert = (
    id: string,
    type: AlertType,
    message: string,
    dismissible?: boolean,
  ): Alert => ({
    id,
    type,
    message,
    dismissible,
  });

  describe('Rendering', () => {
    it('should render a single alert with correct content', () => {
      const alerts = [createAlert('1', 'info', 'This is an informational message')];

      render(<AlertBanner alerts={alerts} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('This is an informational message')).toBeInTheDocument();
    });

    it('should render multiple alerts', () => {
      const alerts = [
        createAlert('1', 'info', 'First message'),
        createAlert('2', 'warning', 'Second message'),
        createAlert('3', 'success', 'Third message'),
      ];

      render(<AlertBanner alerts={alerts} />);

      const alertElements = screen.getAllByRole('alert');
      expect(alertElements).toHaveLength(3);
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
      expect(screen.getByText('Third message')).toBeInTheDocument();
    });

    it('should not render when alerts array is empty', () => {
      const { container } = render(<AlertBanner alerts={[]} />);

      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should not render after all alerts are dismissed', async () => {
      const user = userEvent.setup();
      const alerts = [createAlert('1', 'info', 'Dismissible message')];

      const { container } = render(<AlertBanner alerts={alerts} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      await user.click(dismissButton);

      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Alert Types', () => {
    it('should render warning alert with correct icon and label', () => {
      const alerts = [createAlert('1', 'warning', 'Warning message')];

      render(<AlertBanner alerts={alerts} />);

      expect(screen.getByText('Warning message')).toBeInTheDocument();

      const icon = screen.getByLabelText('Warning');
      expect(icon).toBeInTheDocument();
      expect(icon.textContent).toBe('⚠');
    });

    it('should render info alert with correct icon and label', () => {
      const alerts = [createAlert('1', 'info', 'Info message')];

      render(<AlertBanner alerts={alerts} />);

      expect(screen.getByText('Info message')).toBeInTheDocument();

      const icon = screen.getByLabelText('Information');
      expect(icon).toBeInTheDocument();
      expect(icon.textContent).toBe('ℹ');
    });

    it('should render success alert with correct icon and label', () => {
      const alerts = [createAlert('1', 'success', 'Success message')];

      render(<AlertBanner alerts={alerts} />);

      expect(screen.getByText('Success message')).toBeInTheDocument();

      const icon = screen.getByLabelText('Success');
      expect(icon).toBeInTheDocument();
      expect(icon.textContent).toBe('✓');
    });

    it('should render error alert with correct icon and label', () => {
      const alerts = [createAlert('1', 'error', 'Error message')];

      render(<AlertBanner alerts={alerts} />);

      expect(screen.getByText('Error message')).toBeInTheDocument();

      const icon = screen.getByLabelText('Error');
      expect(icon).toBeInTheDocument();
      expect(icon.textContent).toBe('✕');
    });

    it('should apply different styles for each alert type', () => {
      const alerts = [
        createAlert('1', 'warning', 'Warning'),
        createAlert('2', 'info', 'Info'),
        createAlert('3', 'success', 'Success'),
        createAlert('4', 'error', 'Error'),
      ];

      render(<AlertBanner alerts={alerts} />);

      expect(screen.getByLabelText('Warning')).toBeInTheDocument();
      expect(screen.getByLabelText('Information')).toBeInTheDocument();
      expect(screen.getByLabelText('Success')).toBeInTheDocument();
      expect(screen.getByLabelText('Error')).toBeInTheDocument();
    });
  });

  describe('Dismissal Functionality', () => {
    it('should render dismiss button by default', () => {
      const alerts = [createAlert('1', 'info', 'Dismissible alert')];

      render(<AlertBanner alerts={alerts} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      expect(dismissButton).toBeInTheDocument();
      expect(dismissButton.textContent).toBe('×');
    });

    it('should not render dismiss button when dismissible is false', () => {
      const alerts = [createAlert('1', 'info', 'Non-dismissible alert', false)];

      render(<AlertBanner alerts={alerts} />);

      expect(screen.queryByRole('button', { name: /dismiss alert/i })).not.toBeInTheDocument();
    });

    it('should dismiss alert when close button is clicked', async () => {
      const user = userEvent.setup();
      const alerts = [
        createAlert('1', 'info', 'First alert'),
        createAlert('2', 'warning', 'Second alert'),
      ];

      render(<AlertBanner alerts={alerts} />);

      expect(screen.getByText('First alert')).toBeInTheDocument();
      expect(screen.getByText('Second alert')).toBeInTheDocument();

      const dismissButtons = screen.getAllByRole('button', { name: /dismiss alert/i });
      await user.click(dismissButtons[0]);

      expect(screen.queryByText('First alert')).not.toBeInTheDocument();
      expect(screen.getByText('Second alert')).toBeInTheDocument();
    });

    it('should call onDismiss callback when alert is dismissed', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const alerts = [createAlert('alert-123', 'info', 'Test alert')];

      render(<AlertBanner alerts={alerts} onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledWith('alert-123');
    });

    it('should not call onDismiss when callback is not provided', async () => {
      const user = userEvent.setup();
      const alerts = [createAlert('1', 'info', 'Test alert')];

      render(<AlertBanner alerts={alerts} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });

      await user.click(dismissButton);

      expect(screen.queryByText('Test alert')).not.toBeInTheDocument();
    });

    it('should handle multiple dismissals correctly', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const alerts = [
        createAlert('1', 'info', 'First'),
        createAlert('2', 'warning', 'Second'),
        createAlert('3', 'success', 'Third'),
      ];

      render(<AlertBanner alerts={alerts} onDismiss={onDismiss} />);

      const dismissButtons = screen.getAllByRole('button', { name: /dismiss alert/i });

      await user.click(dismissButtons[1]);
      expect(onDismiss).toHaveBeenCalledWith('2');
      expect(screen.queryByText('Second')).not.toBeInTheDocument();

      const remainingButtons = screen.getAllByRole('button', { name: /dismiss alert/i });
      await user.click(remainingButtons[0]);
      expect(onDismiss).toHaveBeenCalledWith('1');
      expect(screen.queryByText('First')).not.toBeInTheDocument();

      expect(onDismiss).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Third')).toBeInTheDocument();
    });
  });

  describe('Keyboard Interactions', () => {
    it('should dismiss alert when Enter key is pressed on dismiss button', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const alerts = [createAlert('1', 'info', 'Keyboard test')];

      render(<AlertBanner alerts={alerts} onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      dismissButton.focus();

      await user.keyboard('{Enter}');

      expect(onDismiss).toHaveBeenCalledWith('1');
      expect(screen.queryByText('Keyboard test')).not.toBeInTheDocument();
    });

    it('should dismiss alert when Space key is pressed on dismiss button', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const alerts = [createAlert('1', 'info', 'Keyboard test')];

      render(<AlertBanner alerts={alerts} onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      dismissButton.focus();

      await user.keyboard(' ');

      expect(onDismiss).toHaveBeenCalledWith('1');
      expect(screen.queryByText('Keyboard test')).not.toBeInTheDocument();
    });

    it('should not dismiss alert when other keys are pressed', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const alerts = [createAlert('1', 'info', 'Keyboard test')];

      render(<AlertBanner alerts={alerts} onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      dismissButton.focus();

      await user.keyboard('{Escape}');
      await user.keyboard('a');
      await user.keyboard('{Tab}');

      expect(onDismiss).not.toHaveBeenCalled();
      expect(screen.getByText('Keyboard test')).toBeInTheDocument();
    });

    it('should handle Enter key on correct alert when multiple alerts exist', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const alerts = [createAlert('1', 'info', 'First'), createAlert('2', 'warning', 'Second')];

      render(<AlertBanner alerts={alerts} onDismiss={onDismiss} />);

      const dismissButtons = screen.getAllByRole('button', { name: /dismiss alert/i });
      dismissButtons[1].focus();

      await user.keyboard('{Enter}');

      expect(onDismiss).toHaveBeenCalledWith('2');
      expect(screen.queryByText('Second')).not.toBeInTheDocument();
      expect(screen.getByText('First')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert" on alert elements', () => {
      const alerts = [createAlert('1', 'info', 'First'), createAlert('2', 'warning', 'Second')];

      render(<AlertBanner alerts={alerts} />);

      const alertElements = screen.getAllByRole('alert');
      expect(alertElements).toHaveLength(2);
    });

    it('should have aria-live="polite" on alert elements', () => {
      const alerts = [createAlert('1', 'info', 'Test alert')];

      render(<AlertBanner alerts={alerts} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-label on icon with alert type', () => {
      const alerts = [createAlert('1', 'warning', 'Test')];

      render(<AlertBanner alerts={alerts} />);

      const icon = screen.getByLabelText('Warning');
      expect(icon).toBeInTheDocument();
    });

    it('should have aria-label on dismiss button', () => {
      const alerts = [createAlert('1', 'info', 'Test')];

      render(<AlertBanner alerts={alerts} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss alert');
    });

    it('should have aria-hidden on close button symbol', () => {
      const alerts = [createAlert('1', 'info', 'Test')];

      const { container } = render(<AlertBanner alerts={alerts} />);

      const closeSymbol = container.querySelector('button span[aria-hidden="true"]');
      expect(closeSymbol).toBeInTheDocument();
      expect(closeSymbol?.textContent).toBe('×');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const alerts = [createAlert('1', 'info', 'First'), createAlert('2', 'warning', 'Second')];

      render(<AlertBanner alerts={alerts} />);

      const dismissButtons = screen.getAllByRole('button', { name: /dismiss alert/i });

      await user.tab();
      expect(document.activeElement).toBe(dismissButtons[0]);

      await user.tab();
      expect(document.activeElement).toBe(dismissButtons[1]);
    });

    it('should have proper type attribute on dismiss button', () => {
      const alerts = [createAlert('1', 'info', 'Test')];

      render(<AlertBanner alerts={alerts} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      expect(dismissButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Dynamic Content', () => {
    it('should update when new alerts are added', () => {
      const { rerender } = render(
        <AlertBanner alerts={[createAlert('1', 'info', 'First alert')]} />,
      );

      expect(screen.getByText('First alert')).toBeInTheDocument();
      expect(screen.getAllByRole('alert')).toHaveLength(1);

      rerender(
        <AlertBanner
          alerts={[
            createAlert('1', 'info', 'First alert'),
            createAlert('2', 'warning', 'Second alert'),
          ]}
        />,
      );

      expect(screen.getByText('First alert')).toBeInTheDocument();
      expect(screen.getByText('Second alert')).toBeInTheDocument();
      expect(screen.getAllByRole('alert')).toHaveLength(2);
    });

    it('should update when alerts are removed from props', () => {
      const { rerender } = render(
        <AlertBanner
          alerts={[
            createAlert('1', 'info', 'First alert'),
            createAlert('2', 'warning', 'Second alert'),
          ]}
        />,
      );

      expect(screen.getByText('First alert')).toBeInTheDocument();
      expect(screen.getByText('Second alert')).toBeInTheDocument();

      rerender(<AlertBanner alerts={[createAlert('1', 'info', 'First alert')]} />);

      expect(screen.getByText('First alert')).toBeInTheDocument();
      expect(screen.queryByText('Second alert')).not.toBeInTheDocument();
    });

    it('should not show previously dismissed alert if same ID returns in alerts prop', async () => {
      const user = userEvent.setup();
      const alerts = [createAlert('1', 'info', 'Test alert')];

      const { rerender, unmount } = render(<AlertBanner alerts={alerts} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      await user.click(dismissButton);

      expect(screen.queryByText('Test alert')).not.toBeInTheDocument();

      rerender(<AlertBanner alerts={[]} />);
      rerender(<AlertBanner alerts={alerts} />);

      expect(screen.queryByText('Test alert')).not.toBeInTheDocument();

      unmount();

      render(<AlertBanner alerts={alerts} />);

      expect(screen.getByText('Test alert')).toBeInTheDocument();
    });

    it('should maintain dismissed state when props update but alert remains', async () => {
      const user = userEvent.setup();
      const alerts = [createAlert('1', 'info', 'First'), createAlert('2', 'warning', 'Second')];

      const { rerender } = render(<AlertBanner alerts={alerts} />);

      const dismissButtons = screen.getAllByRole('button', { name: /dismiss alert/i });
      await user.click(dismissButtons[0]);

      expect(screen.queryByText('First')).not.toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();

      rerender(
        <AlertBanner
          alerts={[
            createAlert('1', 'info', 'First'),
            createAlert('2', 'warning', 'Second'),
            createAlert('3', 'success', 'Third'),
          ]}
        />,
      );

      expect(screen.queryByText('First')).not.toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle alerts with very long messages', () => {
      const longMessage = 'A'.repeat(500);
      const alerts = [createAlert('1', 'info', longMessage)];

      render(<AlertBanner alerts={alerts} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle alerts with special characters in messages', () => {
      const alerts = [
        createAlert('1', 'info', 'Message with <html> & "quotes" and \'apostrophes\''),
      ];

      render(<AlertBanner alerts={alerts} />);

      expect(
        screen.getByText('Message with <html> & "quotes" and \'apostrophes\''),
      ).toBeInTheDocument();
    });

    it('should handle alerts with duplicate IDs gracefully', () => {
      const alerts = [
        createAlert('1', 'info', 'First message'),
        createAlert('1', 'warning', 'Second message with same ID'),
      ];

      const { container } = render(<AlertBanner alerts={alerts} />);

      const alertElements = container.querySelectorAll('[role="alert"]');
      expect(alertElements).toHaveLength(2);
    });

    it('should handle rapid dismissals without errors', async () => {
      const user = userEvent.setup();
      const alerts = [
        createAlert('1', 'info', 'First'),
        createAlert('2', 'warning', 'Second'),
        createAlert('3', 'success', 'Third'),
      ];

      render(<AlertBanner alerts={alerts} />);

      const dismissButtons = screen.getAllByRole('button', { name: /dismiss alert/i });

      await user.click(dismissButtons[0]);
      await user.click(dismissButtons[1]);
      await user.click(dismissButtons[2]);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should handle onDismiss callback reference changes', async () => {
      const user = userEvent.setup();
      const firstCallback = vi.fn();
      const secondCallback = vi.fn();
      const alerts = [createAlert('1', 'info', 'Test')];

      const { rerender } = render(<AlertBanner alerts={alerts} onDismiss={firstCallback} />);

      rerender(<AlertBanner alerts={alerts} onDismiss={secondCallback} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      await user.click(dismissButton);

      expect(firstCallback).not.toHaveBeenCalled();
      expect(secondCallback).toHaveBeenCalledWith('1');
    });

    it('should handle empty message string', () => {
      const alerts = [createAlert('1', 'info', '')];

      render(<AlertBanner alerts={alerts} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('should handle dismissible explicitly set to true', () => {
      const alerts = [createAlert('1', 'info', 'Test', true)];

      render(<AlertBanner alerts={alerts} />);

      expect(screen.getByRole('button', { name: /dismiss alert/i })).toBeInTheDocument();
    });

    it('should handle unmounting with dismissed alerts', async () => {
      const user = userEvent.setup();
      const alerts = [createAlert('1', 'info', 'Test')];

      const { unmount } = render(<AlertBanner alerts={alerts} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss alert/i });
      await user.click(dismissButton);

      unmount();
    });
  });

  describe('Message Content Rendering', () => {
    it('should render message in paragraph element', () => {
      const alerts = [createAlert('1', 'info', 'Test message')];

      render(<AlertBanner alerts={alerts} />);

      const alert = screen.getByRole('alert');
      const paragraph = alert.querySelector('p');
      expect(paragraph?.tagName).toBe('P');
      expect(paragraph?.textContent).toBe('Test message');
    });

    it('should handle messages with line breaks', () => {
      const message = 'Line 1\nLine 2\nLine 3';
      const alerts = [createAlert('1', 'info', message)];

      render(<AlertBanner alerts={alerts} />);

      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('Line 1');
      expect(alert.textContent).toContain('Line 2');
      expect(alert.textContent).toContain('Line 3');
    });

    it('should handle numeric alert IDs', () => {
      const alerts = [createAlert('123', 'info', 'Numeric ID test')];

      render(<AlertBanner alerts={alerts} />);

      expect(screen.getByText('Numeric ID test')).toBeInTheDocument();
    });
  });
});
