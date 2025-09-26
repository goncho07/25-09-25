import { generateCarnet, generateFichaMatricula } from '../../../utils/pdfGenerator';
import { vi } from 'vitest';

const mockDoc = {
  setFontSize: vi.fn(),
  text: vi.fn(),
  setFillColor: vi.fn(),
  roundedRect: vi.fn(),
  rect: vi.fn(),
  addImage: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
  line: vi.fn(),
  setTextColor: vi.fn(),
  autoTable: vi.fn(),
};

vi.mock('jspdf', () => {
  return {
    default: vi.fn(() => {
      // Reset mocks for each new document instance
      for (let key in mockDoc) {
        (mockDoc[key as keyof typeof mockDoc] as any).mockClear();
      }
      // Mock the autotable's previous property
      (mockDoc as any).autoTable.previous = { finalY: 100 };
      return mockDoc;
    }),
  };
});

describe('PDF Generation', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCarnet', () => {
    it('should generate a PDF with student cards', () => {
      const students = [
        {
          id: '1',
          fullName: 'John Doe',
          avatarUrl: 'path/to/avatar.jpg',
          documentNumber: '12345678',
          grade: '5',
          section: 'A',
        },
      ];

      generateCarnet(students);

      expect(mockDoc.save).toHaveBeenCalledWith('Carnets_Escolares.pdf');
      expect(mockDoc.text).toHaveBeenCalledWith(
        'IEE 6049 Ricardo Palma',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockDoc.text).toHaveBeenCalledWith(
        'CARNET ESCOLAR 2025',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockDoc.addImage).toHaveBeenCalledWith(
        'path/to/avatar.jpg',
        'JPEG',
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('generateFichaMatricula', () => {
    it('should generate a student enrollment form', () => {
      const student = {
        id: '1',
        fullName: 'Jane Doe',
        documentNumber: '87654321',
        studentCode: 'S001',
        birthDate: '2010-01-01',
        gender: 'Female',
        grade: '5',
        section: 'B',
        condition: 'Regular',
        enrollmentStatus: 'Active',
      };

      generateFichaMatricula(student);

      expect(mockDoc.save).toHaveBeenCalledWith('Ficha_Matricula_87654321.pdf');
      expect(mockDoc.text).toHaveBeenCalledWith(
        'Ficha Única de Matrícula - SIAGIE',
        14,
        22
      );
      expect(mockDoc.autoTable).toHaveBeenCalled();
    });
  });
});