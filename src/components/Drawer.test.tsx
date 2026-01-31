import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Drawer from './Drawer';

describe('Drawer Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Drawer',
    children: <div>Drawer content</div>,
  };

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<Drawer {...defaultProps} />);

      expect(screen.getByText('Test Drawer')).toBeInTheDocument();
      expect(screen.getByText('Drawer content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<Drawer {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Test Drawer')).not.toBeInTheDocument();
      expect(screen.queryByText('Drawer content')).not.toBeInTheDocument();
    });

    it('should render with footer when provided', () => {
      const footer = <button>Footer Button</button>;

      render(<Drawer {...defaultProps} footer={footer} />);

      expect(screen.getByText('Footer Button')).toBeInTheDocument();
    });

    it('should render without footer when not provided', () => {
      const { container } = render(<Drawer {...defaultProps} />);

      // No footer should be rendered
      expect(container.querySelector('.footer')).not.toBeInTheDocument();
    });

    it('should apply correct width class', () => {
      const { container, rerender } = render(<Drawer {...defaultProps} width="sm" />);

      let drawer = container.querySelector('[role="dialog"]');
      expect(drawer?.className).toContain('sm');

      rerender(<Drawer {...defaultProps} width="md" />);
      drawer = container.querySelector('[role="dialog"]');
      expect(drawer?.className).toContain('md');

      rerender(<Drawer {...defaultProps} width="lg" />);
      drawer = container.querySelector('[role="dialog"]');
      expect(drawer?.className).toContain('lg');
    });

    it('should default to medium width', () => {
      const { container } = render(<Drawer {...defaultProps} />);

      const drawer = container.querySelector('[role="dialog"]');
      expect(drawer?.className).toContain('md');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Drawer {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'drawer-title');
    });

    it('should have labeled title', () => {
      render(<Drawer {...defaultProps} />);

      const title = screen.getByText('Test Drawer');
      expect(title).toHaveAttribute('id', 'drawer-title');
    });

    it('should have close button with aria-label', () => {
      render(<Drawer {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close drawer/i });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<Drawer {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close drawer/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      const { container } = render(<Drawer {...defaultProps} onClose={onClose} />);

      const overlay = container.querySelector('.overlay');
      if (overlay) {
        await user.click(overlay);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should not call onClose when drawer content is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<Drawer {...defaultProps} onClose={onClose} />);

      const content = screen.getByText('Drawer content');
      await user.click(content);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<Drawer {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Body Scroll Lock', () => {
    it('should lock body scroll when opened', () => {
      render(<Drawer {...defaultProps} isOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should unlock body scroll when closed', () => {
      const { rerender } = render(<Drawer {...defaultProps} isOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Drawer {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).toBe('');
    });

    it('should unlock body scroll on unmount', () => {
      const { unmount } = render(<Drawer {...defaultProps} isOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Focus Management', () => {
    it('should focus first input when opened', async () => {
      const children = (
        <div>
          <input type="text" placeholder="First input" />
          <input type="text" placeholder="Second input" />
        </div>
      );

      render(<Drawer {...defaultProps}>{children}</Drawer>);

      // Wait for focus to be set
      await new Promise((resolve) => setTimeout(resolve, 10));

      const firstInput = screen.getByPlaceholderText('First input');
      expect(document.activeElement).toBe(firstInput);
    });

    it('should restore focus to previous element when closed', async () => {
      const button = document.createElement('button');
      button.textContent = 'Trigger';
      document.body.appendChild(button);
      button.focus();

      expect(document.activeElement).toBe(button);

      const { rerender } = render(<Drawer {...defaultProps} isOpen={true} />);

      // Wait for drawer to focus
      await new Promise((resolve) => setTimeout(resolve, 10));

      rerender(<Drawer {...defaultProps} isOpen={false} />);

      expect(document.activeElement).toBe(button);

      document.body.removeChild(button);
    });

    it('should trap focus within drawer', async () => {
      const user = userEvent.setup();
      const children = (
        <div>
          <button>First</button>
          <button>Second</button>
          <button>Third</button>
        </div>
      );

      render(<Drawer {...defaultProps}>{children}</Drawer>);

      const firstButton = screen.getByText('First');
      const thirdButton = screen.getByText('Third');
      const closeButton = screen.getByRole('button', { name: /close drawer/i });

      // Focus last button
      thirdButton.focus();
      expect(document.activeElement).toBe(thirdButton);

      // Tab forward should cycle to first focusable element
      await user.tab();
      expect(document.activeElement).toBe(closeButton);

      // Tab backward from first should go to last
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(document.activeElement).toBe(thirdButton);
    });
  });

  describe('Dynamic Content', () => {
    it('should update when title changes', () => {
      const { rerender } = render(<Drawer {...defaultProps} title="Original Title" />);

      expect(screen.getByText('Original Title')).toBeInTheDocument();

      rerender(<Drawer {...defaultProps} title="Updated Title" />);

      expect(screen.queryByText('Original Title')).not.toBeInTheDocument();
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
    });

    it('should update when children change', () => {
      const { rerender } = render(
        <Drawer {...defaultProps}>
          <div>Original content</div>
        </Drawer>
      );

      expect(screen.getByText('Original content')).toBeInTheDocument();

      rerender(
        <Drawer {...defaultProps}>
          <div>Updated content</div>
        </Drawer>
      );

      expect(screen.queryByText('Original content')).not.toBeInTheDocument();
      expect(screen.getByText('Updated content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle drawer without focusable elements', () => {
      const children = <div>Just text, no inputs or buttons</div>;

      render(<Drawer {...defaultProps}>{children}</Drawer>);

      // Should not crash
      expect(screen.getByText('Just text, no inputs or buttons')).toBeInTheDocument();
    });

    it('should handle rapid open/close toggles', () => {
      const { rerender } = render(<Drawer {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Test Drawer')).not.toBeInTheDocument();

      rerender(<Drawer {...defaultProps} isOpen={true} />);
      expect(screen.getByText('Test Drawer')).toBeInTheDocument();

      rerender(<Drawer {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Test Drawer')).not.toBeInTheDocument();

      rerender(<Drawer {...defaultProps} isOpen={true} />);
      expect(screen.getByText('Test Drawer')).toBeInTheDocument();
    });

    it('should handle onClose reference changes', async () => {
      const user = userEvent.setup();
      const firstOnClose = vi.fn();
      const secondOnClose = vi.fn();

      const { rerender } = render(<Drawer {...defaultProps} onClose={firstOnClose} />);

      await user.keyboard('{Escape}');
      expect(firstOnClose).toHaveBeenCalledTimes(1);
      expect(secondOnClose).not.toHaveBeenCalled();

      rerender(<Drawer {...defaultProps} onClose={secondOnClose} />);

      await user.keyboard('{Escape}');
      expect(firstOnClose).toHaveBeenCalledTimes(1);
      expect(secondOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
