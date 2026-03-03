import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider, useConfirm } from './ConfirmContext';

// Test component that exposes confirm/prompt functions
function TestConsumer({ onResult }: { onResult: (value: unknown) => void }) {
  const { confirm, prompt } = useConfirm();

  return (
    <div>
      <button
        onClick={async () => {
          const result = await confirm({
            title: 'Delete Item',
            message: 'Are you sure?',
            confirmLabel: 'Delete',
            variant: 'danger',
          });
          onResult(result);
        }}
      >
        Trigger Confirm
      </button>
      <button
        onClick={async () => {
          const result = await confirm({
            title: 'Activate Item',
            message: 'Activate this?',
            confirmLabel: 'Activate',
          });
          onResult(result);
        }}
      >
        Trigger Default Confirm
      </button>
      <button
        onClick={async () => {
          const result = await prompt({
            title: 'Cancel Membership',
            message: 'Cancel this membership?',
            confirmLabel: 'Cancel Membership',
            variant: 'danger',
            promptLabel: 'Cancellation notes (optional)',
          });
          onResult(result);
        }}
      >
        Trigger Prompt
      </button>
    </div>
  );
}

function renderWithProvider(onResult: (value: unknown) => void = vi.fn()) {
  return {
    onResult,
    ...render(
      <ConfirmProvider>
        <TestConsumer onResult={onResult} />
      </ConfirmProvider>,
    ),
  };
}

describe('ConfirmContext', () => {
  describe('Rendering', () => {
    it('should not render dialog initially', () => {
      renderWithProvider();

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('should render dialog when confirm is triggered', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText('Trigger Confirm'));

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText('Delete Item')).toBeInTheDocument();
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render prompt dialog with textarea', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText('Trigger Prompt'));

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Cancel Membership' })).toBeInTheDocument();
      expect(screen.getByText('Cancel this membership?')).toBeInTheDocument();
      expect(screen.getByText('Cancellation notes (optional)')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel Membership' })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="alertdialog" and aria-modal', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText('Trigger Confirm'));

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to title', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText('Trigger Confirm'));

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');

      const title = screen.getByText('Delete Item');
      expect(title).toHaveAttribute('id', 'confirm-dialog-title');
    });

    it('should have aria-describedby pointing to message', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText('Trigger Confirm'));

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'confirm-dialog-message');

      const message = screen.getByText('Are you sure?');
      expect(message).toHaveAttribute('id', 'confirm-dialog-message');
    });
  });

  describe('Confirm Resolution', () => {
    it('should resolve true when confirm button is clicked', async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      renderWithProvider(onResult);

      await user.click(screen.getByText('Trigger Confirm'));
      await user.click(screen.getByText('Delete'));

      expect(onResult).toHaveBeenCalledWith(true);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('should resolve false when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      renderWithProvider(onResult);

      await user.click(screen.getByText('Trigger Confirm'));
      await user.click(screen.getByText('Cancel'));

      expect(onResult).toHaveBeenCalledWith(false);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  describe('Prompt Resolution', () => {
    it('should resolve with text when confirm is clicked', async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      renderWithProvider(onResult);

      await user.click(screen.getByText('Trigger Prompt'));
      await user.type(screen.getByRole('textbox'), 'Customer requested');
      await user.click(screen.getByRole('button', { name: 'Cancel Membership' }));

      expect(onResult).toHaveBeenCalledWith('Customer requested');
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('should resolve with empty string when confirm is clicked with no input', async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      renderWithProvider(onResult);

      await user.click(screen.getByText('Trigger Prompt'));
      await user.click(screen.getByRole('button', { name: 'Cancel Membership' }));

      expect(onResult).toHaveBeenCalledWith('');
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('should resolve null when cancel is clicked on prompt', async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      renderWithProvider(onResult);

      await user.click(screen.getByText('Trigger Prompt'));
      await user.click(screen.getByText('Cancel'));

      expect(onResult).toHaveBeenCalledWith(null);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Interactions', () => {
    it('should dismiss on Escape key', async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      renderWithProvider(onResult);

      await user.click(screen.getByText('Trigger Confirm'));
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(onResult).toHaveBeenCalledWith(false);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('should dismiss prompt with null on Escape key', async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      renderWithProvider(onResult);

      await user.click(screen.getByText('Trigger Prompt'));
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(onResult).toHaveBeenCalledWith(null);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  describe('Overlay Click', () => {
    it('should dismiss when overlay is clicked', async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      renderWithProvider(onResult);

      await user.click(screen.getByText('Trigger Confirm'));

      const overlay = screen.getByTestId('confirm-overlay');
      await user.click(overlay);

      expect(onResult).toHaveBeenCalledWith(false);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('should not dismiss when dialog content is clicked', async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      renderWithProvider(onResult);

      await user.click(screen.getByText('Trigger Confirm'));

      await user.click(screen.getByText('Are you sure?'));

      expect(onResult).not.toHaveBeenCalled();
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  describe('Body Scroll Lock', () => {
    it('should lock body scroll when dialog is open', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText('Trigger Confirm'));

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should unlock body scroll when dialog closes', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText('Trigger Confirm'));
      expect(document.body.style.overflow).toBe('hidden');

      await user.click(screen.getByText('Cancel'));
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Focus Management', () => {
    it('should focus cancel button for confirm dialogs', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText('Trigger Confirm'));

      // Wait for focus to be set
      await new Promise((resolve) => setTimeout(resolve, 10));

      const cancelButton = screen.getByText('Cancel');
      expect(document.activeElement).toBe(cancelButton);
    });

    it('should focus textarea for prompt dialogs', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText('Trigger Prompt'));

      // Wait for focus to be set
      await new Promise((resolve) => setTimeout(resolve, 10));

      const textarea = screen.getByRole('textbox');
      expect(document.activeElement).toBe(textarea);
    });

    it('should restore focus to previous element when closed', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      const triggerButton = screen.getByText('Trigger Confirm');
      await user.click(triggerButton);

      // Wait for focus to be set
      await new Promise((resolve) => setTimeout(resolve, 10));

      await user.click(screen.getByText('Cancel'));

      expect(document.activeElement).toBe(triggerButton);
    });

    it('should trap focus within dialog', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText('Trigger Confirm'));

      // Wait for focus
      await new Promise((resolve) => setTimeout(resolve, 10));

      const cancelButton = screen.getByText('Cancel');
      const confirmButton = screen.getByText('Delete');

      // Cancel is focused; Tab should go to confirm
      expect(document.activeElement).toBe(cancelButton);
      await user.tab();
      expect(document.activeElement).toBe(confirmButton);

      // Tab from last should wrap to first
      await user.tab();
      expect(document.activeElement).toBe(cancelButton);

      // Shift+Tab from first should wrap to last
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(document.activeElement).toBe(confirmButton);
    });
  });

  describe('Variants', () => {
    it('should use default variant for non-danger confirms', async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText('Trigger Default Confirm'));

      const confirmButton = screen.getByText('Activate');
      // Default variant should not have danger class
      expect(confirmButton.className).not.toContain('danger');
    });
  });

  describe('useConfirm Hook', () => {
    it('should throw when used outside provider', () => {
      function BadComponent() {
        useConfirm();
        return null;
      }

      expect(() => render(<BadComponent />)).toThrow(
        'useConfirm must be used within a ConfirmProvider',
      );
    });
  });

  describe('Sequential Dialogs', () => {
    it('should handle multiple sequential confirms', async () => {
      const user = userEvent.setup();
      const onResult = vi.fn();
      renderWithProvider(onResult);

      // First dialog - confirm
      await user.click(screen.getByText('Trigger Confirm'));
      await user.click(screen.getByText('Delete'));
      expect(onResult).toHaveBeenCalledWith(true);

      // Second dialog - cancel
      await user.click(screen.getByText('Trigger Confirm'));
      await user.click(screen.getByText('Cancel'));
      expect(onResult).toHaveBeenCalledWith(false);

      expect(onResult).toHaveBeenCalledTimes(2);
    });
  });
});
