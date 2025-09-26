import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Direct, explicit mock for all lucide-react icons used in the component tree
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
  // Icons added for UserKpiCards
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
    const actual = await vi.importActual('framer-motion');
    return {
        ...actual,
        AnimatePresence: ({ children }) => children,
        motion: {
            ...actual.motion,
            div: ({ children, ...props }) => <div {...props}>{children}</div>,
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

describe('UsersPage Sorting', () => {
  it('should sort users correctly by name after the fix', async () => {
    renderComponent();

    // With the fix, the initial sort (ascending by name) should be correct.
    const correctAscendingOrder = [
        'alan turing',
        'ana gomez',
        'bernard lopez',
        'carlos diaz',
        'zara perez',
    ];

    await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const names = rows.slice(1).map(row => row.cells[1].querySelector('button').textContent.toLowerCase());
        expect(names).toEqual(correctAscendingOrder);
    });

    const nameHeader = screen.getByRole('button', { name: /Nombre/i });

    // Click to sort descending by name
    fireEvent.click(nameHeader);

    const correctDescendingOrder = [
        'zara perez',
        'carlos diaz',
        'bernard lopez',
        'ana gomez',
        'alan turing',
    ];

    await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const names = rows.slice(1).map(row => row.cells[1].querySelector('button').textContent.toLowerCase());
        expect(names).toEqual(correctDescendingOrder);
    });
  });
});