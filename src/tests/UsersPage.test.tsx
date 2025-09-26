import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mocks
vi.mock('lucide-react', () => ({
  Users: (props) => <div data-testid="icon-Users" {...props} />,
  UploadCloud: (props) => <div data-testid="icon-UploadCloud" {...props} />,
  Plus: (props) => <div data-testid="icon-Plus" {...props} />,
  Search: (props) => <div data-testid="icon-Search" {...props} />,
  X: (props) => <div data-testid="icon-X" {...props} />,
  Tag: (props) => <div data-testid="icon-Tag" {...props} />,
  GraduationCap: (props) => <div data-testid="icon-GraduationCap" {...props} />,
  Shield: (props) => <div data-testid="icon-Shield" {...props} />,
  Users2: (props) => <div data-testid="icon-Users2" {...props} />,
  UserSquare: (props) => <div data-testid="icon-UserSquare" {...props} />,
  AlertCircle: (props) => <div data-testid="icon-AlertCircle" {...props} />,
  BrainCircuit: (props) => <div data-testid="icon-BrainCircuit" {...props} />,
  ChevronsUpDown: (props) => <div data-testid="icon-ChevronsUpDown" {...props} />,
  ArrowUp: (props) => <div data-testid="icon-ArrowUp" {...props} />,
  ArrowDown: (props) => <div data-testid="icon-ArrowDown" {...props} />,
  MoreVertical: (props) => <div data-testid="icon-MoreVertical" {...props} />,
  Eye: (props) => <div data-testid="icon-Eye" {...props} />,
  KeyRound: (props) => <div data-testid="icon-KeyRound" {...props} />,
  Info: (props) => <div data-testid="icon-Info" {...props} />,
  Send: (props) => <div data-testid="icon-Send" {...props} />,
  RefreshCw: (props) => <div data-testid="icon-RefreshCw" {...props} />,
  UserX: (props) => <div data-testid="icon-UserX" {...props} />,
  Pencil: (props) => <div data-testid="icon-Pencil" {...props} />,
  ChevronLeft: (props) => <div data-testid="icon-ChevronLeft" {...props} />,
  ChevronRight: (props) => <div data-testid="icon-ChevronRight" {...props} />,
  User: (props) => <div data-testid="icon-User" {...props} />,
  CheckCircle: (props) => <div data-testid="icon-CheckCircle" {...props} />,
  PowerOff: (props) => <div data-testid="icon-PowerOff" {...props} />,
}));

vi.mock('../../data/users', async () => ({
  staff: (await import('../../data/users.mock')).staff,
}));
vi.mock('../../data/students', async () => ({
  students: (await import('../../data/users.mock')).students,
}));
vi.mock('../../data/parents', async () => ({
  parents: (await import('../../data/users.mock')).parents,
}));
vi.mock('../../utils/pdfGenerator', () => ({
    generateCarnet: vi.fn(),
}));
vi.mock('framer-motion', async () => {
    const React = await import('react');
    const actual = await vi.importActual('framer-motion');
    return {
        ...actual,
        AnimatePresence: ({ children }) => children,
        motion: {
            ...actual.motion,
            div: React.forwardRef(({ children, ...props }, ref) => <div {...props} ref={ref}>{children}</div>),
            ul: ({ children, ...props }) => <ul {...props}>{children}</ul>,
            li: ({ children, ...props }) => <li {...props}>{children}</li>,
            header: ({ children, ...props }) => <header {...props}>{children}</header>,
            button: ({ children, ...props }) => <button {...props}>{children}</button>,
        },
    };
});

// Import the component under test after mocks are defined
import UsersPage from '../../pages/UsersPage';

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <UsersPage />
    </BrowserRouter>
  );
};

describe('UsersPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should filter users by role when a role chip is clicked', async () => {
    renderComponent();
    await act(async () => vi.runAllTimers());
    await screen.findByText('alan turing');

    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Estudiantes/i }));
        vi.runAllTimers();
    });

    const rows = await screen.findAllByRole('row');
    expect(rows.length).toBe(4); // header + 3 students
    expect(screen.getByText('alan turing')).toBeInTheDocument();
    expect(screen.getByText('bernard lopez')).toBeInTheDocument();
    expect(screen.queryByText('ana gomez')).not.toBeInTheDocument();
  });

  it('should create a valid chip and filter results for a valid search term', async () => {
    renderComponent();
    await act(async () => vi.runAllTimers());
    await screen.findByText('alan turing');

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
    await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'ana gomez' } });
        fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
        vi.runAllTimers();
    });

    const rows = await screen.findAllByRole('row');
    expect(rows.length).toBe(2); // header + 1 user
    expect(screen.getByText('ana gomez')).toBeInTheDocument();
  });

  it('should create an invalid chip and not filter results for an invalid search term', async () => {
    renderComponent();
    await act(async () => vi.runAllTimers());
    await screen.findByText('alan turing');

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
    await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'platano' } });
        fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
        vi.runAllTimers();
    });

    await screen.findByText('Inválido: "platano"');
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(6); // header + 5 mock users
  });

  it('should sort users correctly by name', async () => {
    renderComponent();
    await act(async () => vi.runAllTimers());

    await waitFor(() => {
        const correctAscendingOrder = ['alan turing', 'ana gomez', 'bernard lopez', 'carlos diaz', 'zara perez'];
        const rows = screen.getAllByRole('row');
        const names = rows.slice(1).map(row => row.cells[1].querySelector('button').textContent.toLowerCase());
        expect(names).toEqual(correctAscendingOrder);
    });

    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Nombre/i }));
        vi.runAllTimers();
    });

    await waitFor(() => {
        const correctDescendingOrder = ['zara perez', 'carlos diaz', 'bernard lopez', 'ana gomez', 'alan turing'];
        const rows = screen.getAllByRole('row');
        const names = rows.slice(1).map(row => row.cells[1].querySelector('button').textContent.toLowerCase());
        expect(names).toEqual(correctDescendingOrder);
    });
  });
});