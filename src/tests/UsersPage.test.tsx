import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
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
vi.mock('../../hooks/useDebounce', () => ({
  useDebounce: (value) => value,
}));
vi.mock('framer-motion', async () => {
    const React = await import('react');
    const actual = await vi.importActual('framer-motion');
    const motionMock = new Proxy(actual.motion, {
        get: (target, prop) => {
            if (typeof prop !== 'string') return target[prop];
            return React.forwardRef(({ children, ...props }, ref) => {
                const { animate, initial, exit, variants, transition, whileHover, whileTap, whileFocus, whileInView, layout, layoutId, ...rest } = props;
                const Component = prop as React.ElementType;
                return <Component ref={ref} {...rest}>{children}</Component>;
            });
        }
    });
    return { ...actual, motion: motionMock, AnimatePresence: ({ children }) => <>{children}</> };
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
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('should filter users by role when a role chip is clicked', async () => {
    renderComponent();
    await screen.findByText('alan turing');

    fireEvent.click(screen.getByRole('button', { name: /Estudiantes/i }));

    await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows.length).toBe(4); // header + 3 students
        expect(screen.getByText('alan turing')).toBeInTheDocument();
        expect(screen.getByText('bernard lopez')).toBeInTheDocument();
        expect(screen.queryByText('ana gomez')).not.toBeInTheDocument();
    });
  });

  it('should create a valid chip and filter results for a valid search term', async () => {
    renderComponent();
    await screen.findByText('alan turing');

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
    fireEvent.change(searchInput, { target: { value: 'ana gomez' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows.length).toBe(2); // header + 1 user
        const table = screen.getByRole('table');
        expect(within(table).getByText('ana gomez')).toBeInTheDocument();
    });
  });

  it('should create an invalid chip and not filter results for an invalid search term', async () => {
    renderComponent();
    await screen.findByText('alan turing');

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
    fireEvent.change(searchInput, { target: { value: 'platano' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await screen.findByText('Inválido: "platano"');

    await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows.length).toBe(6); // header + 5 mock users
    });
  });

  it('should sort users correctly by name', async () => {
    renderComponent();

    await waitFor(() => {
        const correctAscendingOrder = ['alan turing', 'ana gomez', 'bernard lopez', 'carlos diaz', 'zara perez'];
        const rows = screen.getAllByRole('row');
        const names = rows.slice(1).map(row => row.cells[1].querySelector('button').textContent.toLowerCase());
        expect(names).toEqual(correctAscendingOrder);
    });

    fireEvent.click(screen.getByRole('button', { name: /Nombre/i }));

    await waitFor(() => {
        const correctDescendingOrder = ['zara perez', 'carlos diaz', 'bernard lopez', 'ana gomez', 'alan turing'];
        const rows = screen.getAllByRole('row');
        const names = rows.slice(1).map(row => row.cells[1].querySelector('button').textContent.toLowerCase());
        expect(names).toEqual(correctDescendingOrder);
    });
  });

  it('should restore user list when an invalid chip is removed', async () => {
    renderComponent();
    await screen.findByText('alan turing');

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
    fireEvent.change(searchInput, { target: { value: 'platano' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    const invalidChip = await screen.findByText('Inválido: "platano"');
    expect(invalidChip).toBeInTheDocument();

    const closeButton = screen.getByTestId('icon-X').closest('button');
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(6);
      expect(screen.queryByText('Inválido: "platano"')).not.toBeInTheDocument();
    });
  });
});