import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GitHubAuth } from '../GitHubAuth';
import { useStore } from '@/store';

// Mock the store - must define mock inside factory to avoid hoisting issues
vi.mock('@/store', () => {
 const mockUseStore = vi.fn();
 mockUseStore.getState = vi.fn();
 return {
 useStore: mockUseStore,
 };
});

describe('GitHubAuth', () => {
  const mockSetCredentials = vi.fn();
  const mockSetPAT = vi.fn();
  const mockClearPAT = vi.fn();

 beforeEach(() => {
 vi.clearAllMocks();
 (useStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ pat: null });
 (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
 credentials: null,
 setCredentials: mockSetCredentials,
 setPAT: mockSetPAT,
 clearPAT: mockClearPAT,
 });
 });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render token input field', () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_...');
    expect(input).toBeInTheDocument();
  });

  it('should show (optional) label', () => {
    render(<GitHubAuth />);

    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it('should render password type input', () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_...');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('should show placeholder text', () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_...');
    expect(input).toBeInTheDocument();
  });

  it('should toggle info panel when info button is clicked', async () => {
    render(<GitHubAuth />);

    const toggleButton = screen.getByLabelText('Toggle token information');

    // Info should be hidden initially
    expect(screen.queryByText(/Required for private repos/i)).not.toBeInTheDocument();

    // Click to show info
    await userEvent.click(toggleButton);
    expect(screen.getByText(/Required for private repos/i)).toBeInTheDocument();

    // Click to hide info
    await userEvent.click(toggleButton);
    expect(screen.queryByText(/Required for private repos/i)).not.toBeInTheDocument();
  });

  it('should display token creation link in info panel', async () => {
    render(<GitHubAuth />);

    const toggleButton = screen.getByLabelText('Toggle token information');
    await userEvent.click(toggleButton);

    const link = screen.getByText('Get token');
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/settings/tokens/new?description=repo2txt-extension&scopes=repo'
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should update store when token is entered', async () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_...');
    const token = 'ghp_testtoken123';

    await userEvent.type(input, token);

    await waitFor(() => {
      expect(mockSetCredentials).toHaveBeenCalledWith({ token });
    });
  });

 it('should load saved token from store on mount', () => {
 const savedToken = 'ghp_savedtoken456';
 (useStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({ pat: savedToken });

 render(<GitHubAuth />);

 const input = screen.getByPlaceholderText('ghp_...') as HTMLInputElement;
 expect(input.value).toBe(savedToken);
 expect(mockSetCredentials).toHaveBeenCalledWith({ token: savedToken });
 });

  it('should show clear button when token is entered', async () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_...');

    // Clear button should not be visible initially
    expect(screen.queryByTitle('Clear token')).not.toBeInTheDocument();

    await userEvent.type(input, 'ghp_testtoken123');

    // Clear button should appear
    await waitFor(() => {
      expect(screen.getByTitle('Clear token')).toBeInTheDocument();
    });
  });

  it('should clear token when clear button is clicked', async () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_...') as HTMLInputElement;
    const token = 'ghp_testtoken123';

    await userEvent.type(input, token);

    await waitFor(() => {
      expect(input.value).toBe(token);
    });

    const clearButton = screen.getByTitle('Clear token');
    await userEvent.click(clearButton);

    expect(input.value).toBe('');
    expect(mockSetCredentials).toHaveBeenCalledWith({ token: undefined });
  });

  it('should show success message when token is saved', async () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_...');

    // Success message should not be visible initially
    expect(screen.queryByText(/Token saved/i)).not.toBeInTheDocument();

    await userEvent.type(input, 'ghp_testtoken123');

    // Success message should appear
    await waitFor(() => {
      expect(screen.getByText(/Token saved/i)).toBeInTheDocument();
    });
  });

  it('should update credentials in store when token is cleared', async () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_...');
    await userEvent.type(input, 'ghp_testtoken123');

    mockSetCredentials.mockClear();

    await userEvent.clear(input);

    await waitFor(() => {
      expect(mockSetCredentials).toHaveBeenCalledWith({ token: undefined });
    });
  });

  it('should have proper accessibility attributes', () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_...');
    expect(input).toHaveAttribute('id', 'github-token');
  });

  it('should display info panel content when toggled', async () => {
    render(<GitHubAuth />);

    const toggleButton = screen.getByLabelText('Toggle token information');
    await userEvent.click(toggleButton);

    expect(screen.getByText(/Required for private repos/i)).toBeInTheDocument();
  });

  it('should not show success message when token is empty', () => {
    render(<GitHubAuth />);

    expect(screen.queryByText(/Token saved/i)).not.toBeInTheDocument();
  });

  it('should handle rapid token changes', async () => {
    render(<GitHubAuth />);

    const input = screen.getByPlaceholderText('ghp_...');

    await userEvent.type(input, 'ghp_token1');
    await userEvent.clear(input);
    await userEvent.type(input, 'ghp_token2');

    await waitFor(() => {
      expect(mockSetCredentials).toHaveBeenLastCalledWith({ token: 'ghp_token2' });
    });
  });
});
