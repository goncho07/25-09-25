import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Users, UploadCloud, Plus, Search, X, Tag as TagIcon, GraduationCap, Shield, Users2, BrainCircuit
} from 'lucide-react';
import { staff as initialStaff } from '../data/users';
import { students as initialStudents } from '../data/students';
import { parents as initialParents } from '../data/parents';
import { Staff, Student, ParentTutor, UserStatus, ActivityLog, GenericUser, SortConfig, ConfirmationModalState, UserRole } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { activityLogs as initialActivityLogs } from '../data/activityLogs';
import { useNotificationStore } from '../store/notificationStore';
import { generateCarnet } from '../utils/pdfGenerator';
import { motion, AnimatePresence } from 'framer-motion';

import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import UserKpiCards from '../components/users/UserKpiCards';
import UserTable from '../components/users/UserTable';
import BulkActionBar from '../components/users/BulkActionBar';
import UserDetailDrawer from '../components/users/UserDetailDrawer';
import UserImportModal from '../components/users/UserImportModal';
import ConfirmationModal from '../components/users/ConfirmationModal';

// --- HELPER TYPES & FUNCTIONS ---
type Chip = {
  id: string;
  type: 'text' | 'gradeSection' | 'dni' | 'role' | 'tag';
  value: string;
  label: string;
};

type Suggestion = {
  type: Chip['type'];
  value: string;
  label: string;
  category: string;
};

const isStudent = (user: GenericUser): user is Student => 'studentCode' in user;
const isStaff = (user: GenericUser): user is Staff => 'area' in user;
const isParent = (user: GenericUser): user is ParentTutor => 'relation' in user;

const getRole = (user: GenericUser): UserRole | 'N/A' => {
    if (isStudent(user)) return 'Estudiante';
    if (isParent(user)) return 'Apoderado';
    if (isStaff(user)) return user.category;
    return 'N/A';
}

// --- DATA TRANSFORMATION ---
const useUsers = () => {
    return useMemo(() => {
        return [...initialStaff, ...initialStudents, ...initialParents];
    }, []);
};

// --- NEW COMPONENT: ChipSearchBar ---
const ChipSearchBar: React.FC<{
    chips: Chip[];
    setChips: React.Dispatch<React.SetStateAction<Chip[]>>;
    allUsers: GenericUser[];
}> = ({ chips, setChips, allUsers }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);

    const addChip = (chip: Omit<Chip, 'id'>) => {
        if (!chips.some(c => c.type === chip.type && c.value === chip.value)) {
            setChips(prev => [...prev, { ...chip, id: `${chip.type}-${chip.value}-${Date.now()}` }]);
        }
        setInputValue('');
        setSuggestions([]);
        setActiveIndex(-1);
    };

    const removeChip = (id: string) => {
        setChips(prev => prev.filter(c => c.id !== id));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            if (inputValue.trim() === '') return;
            e.preventDefault();
            
            if (activeIndex > -1 && suggestions[activeIndex]) {
                const sug = suggestions[activeIndex];
                addChip({ type: sug.type, value: sug.value, label: sug.label });
            } else {
                // Heuristic parsing
                const trimmedValue = inputValue.trim();
                if (/^\d{1,2}[a-zA-Z]$/i.test(trimmedValue)) {
                    addChip({ type: 'gradeSection', value: trimmedValue.toUpperCase(), label: `Grado: ${trimmedValue.toUpperCase()}` });
                } else if (/^\d{8}$/.test(trimmedValue)) {
                    addChip({ type: 'dni', value: trimmedValue, label: `DNI: ${trimmedValue}` });
                } else {
                    addChip({ type: 'text', value: trimmedValue, label: trimmedValue });
                }
            }
        } else if (e.key === 'Backspace' && inputValue === '' && chips.length > 0) {
            removeChip(chips[chips.length - 1].id);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        }
    };
    
    useEffect(() => {
        if (inputValue.length < 3) {
            setSuggestions([]);
            return;
        }

        const lowerInput = inputValue.toLowerCase();
        const newSuggestions: Suggestion[] = [];

        // Grade/Section suggestions
        if (/^\d{1,2}[a-zA-Z]?$/.test(lowerInput)) {
            const grades = ['1A', '1B', '2A', '3C', '4B', '5F'];
            grades.forEach(g => {
                if(g.toLowerCase().startsWith(lowerInput) && newSuggestions.length < 5) {
                    newSuggestions.push({ type: 'gradeSection', value: g, label: g, category: 'Grado-Sección' });
                }
            });
        }

        // User name suggestions
        allUsers.forEach(user => {
            const name = isStudent(user) ? user.fullName : user.name;
            if (name.toLowerCase().includes(lowerInput) && newSuggestions.length < 5) {
                newSuggestions.push({ type: 'text', value: name, label: name, category: 'Nombre' });
            }
        });

        // DNI suggestions
        if(/^\d+$/.test(lowerInput)) {
             allUsers.forEach(user => {
                const dni = isStudent(user) ? user.documentNumber : user.dni;
                if(dni.startsWith(lowerInput) && newSuggestions.length < 5) {
                     newSuggestions.push({ type: 'dni', value: dni, label: dni, category: 'DNI' });
                }
            });
        }
        
        setSuggestions(newSuggestions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputValue]);
    
    const highlightMatch = (text: string, query: string) => {
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return <span>{parts.map((part, i) => part.toLowerCase() === query.toLowerCase() ? <strong key={i}>{part}</strong> : part)}</span>;
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-700/80">
            <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="text-slate-400" size={20} />
                </div>
                <div className="flex items-center gap-2 pl-12 pr-4 py-2 w-full border border-slate-300 dark:border-slate-600 rounded-full bg-white dark:bg-slate-700 focus-within:ring-2 focus-within:ring-indigo-500 transition">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {chips.map(chip => (
                          <motion.div key={chip.id} layout initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-sm font-semibold pl-2.5 pr-1 py-0.5 rounded-full">
                              {chip.label}
                              <button onClick={() => removeChip(chip.id)} className="p-0.5 bg-indigo-200 dark:bg-indigo-500/40 rounded-full hover:bg-indigo-300 dark:hover:bg-indigo-500/60"><X size={12} /></button>
                          </motion.div>
                      ))}
                      <input
                          ref={inputRef}
                          type="text"
                          value={inputValue}
                          onChange={e => setInputValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onFocus={() => setIsFocused(true)}
                          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                          placeholder={chips.length === 0 ? "Ej: 5F, 'Quispe', DNI 7123..." : ""}
                          className="flex-grow bg-transparent focus:outline-none min-w-[150px] dark:text-slate-100"
                      />
                    </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-4">Escribe y confirma con Enter/Tab; agrega varios criterios para refinar tu búsqueda.</p>

                <AnimatePresence>
                {isFocused && suggestions.length > 0 && (
                    <motion.ul 
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 z-30 overflow-hidden"
                    >
                       {suggestions.map((sug, i) => (
                           <li key={`${sug.type}-${sug.value}`}>
                               <button 
                                  onClick={() => addChip({type: sug.type, value: sug.value, label: sug.label})}
                                  className={`w-full text-left p-3 flex items-center justify-between transition-colors ${i === activeIndex ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                >
                                   <div className="flex items-center gap-3">
                                        <div className="text-indigo-500"><BrainCircuit size={16}/></div>
                                        <span className="text-sm text-slate-700 dark:text-slate-200">{highlightMatch(sug.label, inputValue)}</span>
                                   </div>
                                   <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{sug.category}</span>
                               </button>
                           </li>
                       ))}
                    </motion.ul>
                )}
                </AnimatePresence>
            </div>
            {chips.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Filtros Activos:</h4>
                    <Button variant="tertiary" onClick={() => setChips([])}>Limpiar todo</Button>
                </div>
            )}
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
const UsersPage: React.FC = () => {
    const allUsers = useUsers();
    const [users, setUsers] = useState<GenericUser[]>(allUsers);
    const [searchParams, setSearchParams] = useSearchParams();

    const addNotification = useNotificationStore(state => state.addNotification);
    const triggerElementRef = useRef<HTMLButtonElement | null>(null);

    // State
    const [chips, setChips] = useState<Chip[]>([]);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'Todos');
    const [drawerState, setDrawerState] = useState<{ open: boolean; user: GenericUser | null; initialTab?: string }>({ open: false, user: null });
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'fullName', direction: 'asc' });
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(initialActivityLogs);
    const [confirmationModal, setConfirmationModal] = useState<ConfirmationModalState>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    
    const debouncedChips = useDebounce(chips, 300);
    
    const addActivityLog = useCallback((action: ActivityLog['action'], details: string, targetUser?: string, ipAddress?: string) => {
        const newLog: ActivityLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: 'Director(a)',
            userAvatar: 'https://picsum.photos/seed/director/48/48',
            action,
            details,
            targetUser,
            ipAddress,
        };
        setActivityLogs(prev => [newLog, ...prev]);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (activeTab !== 'Todos') {
            params.set('tab', activeTab);
        } else {
            params.delete('tab');
        }

        if (debouncedChips.length > 0) {
            params.set('filters', JSON.stringify(debouncedChips.map(c => `${c.type}:${c.value}`)));
        } else {
            params.delete('filters');
        }
        setSearchParams(params);
        
        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, [debouncedChips, activeTab, setSearchParams, searchParams]);

    const tabFilteredUsers = useMemo(() => {
        if (activeTab === 'Todos') return users;
        if (activeTab === 'Personal') return users.filter(u => isStaff(u));
        if (activeTab === 'Estudiantes') return users.filter(u => isStudent(u));
        if (activeTab === 'Apoderados') return users.filter(u => isParent(u));
        return users;
    }, [users, activeTab]);

    const filteredUsers = useMemo(() => {
        let results = [...tabFilteredUsers];
        if (debouncedChips.length > 0) {
            results = results.filter(user => {
                return debouncedChips.every(chip => {
                    const value = chip.value.toLowerCase();
                    switch (chip.type) {
                        case 'text':
                            const name = isStudent(user) ? user.fullName : user.name;
                            const email = isParent(user) ? user.email : `${isStudent(user) ? user.studentCode : user.dni}@colegio.edu.pe`;
                            return name.toLowerCase().includes(value) || email.toLowerCase().includes(value);
                        
                        case 'gradeSection':
                            if (!isStudent(user)) return false;
                            const gradeMatch = value.match(/^(\d)/);
                            const sectionMatch = value.match(/([a-zA-Z])$/);
                            if (!gradeMatch || !sectionMatch) return false;
                            const gradeMap: { [key: string]: string } = { '1': 'Primer', '2': 'Segundo', '3': 'Tercero', '4': 'Cuarto', '5': 'Quinto', '6': 'Sexto' };
                            const targetGrade = gradeMap[gradeMatch[1]];
                            const targetSection = sectionMatch[1].toUpperCase();
                            return user.grade === targetGrade && user.section === targetSection;

                        case 'dni':
                            const id = isStudent(user) ? user.documentNumber : user.dni;
                            return id.includes(chip.value);
                        
                        case 'role':
                             return getRole(user).toLowerCase() === value;
                        
                        case 'tag':
                             return user.tags.some(tag => tag.toLowerCase().includes(value));

                        default:
                            return true;
                    }
                });
            });
        }
        
        if (sortConfig) {
            const getSortableValue = (user: GenericUser, key: string): string | number => {
                switch (key) {
                    case 'fullName': // Corresponds to the 'Nombre' column
                        return isStudent(user) ? user.fullName.toLowerCase() : user.name.toLowerCase();
                    case 'role':
                        return getRole(user);
                    case 'sede': // Corresponds to the 'Nivel/Área' column
                        if (isStudent(user)) return `${user.grade} "${user.section}"`;
                        if (isStaff(user)) return user.area;
                        return 'N/A';
                    default:
                        // Fallback for direct properties like 'status'
                        const value = (user as any)[key];
                        return typeof value === 'string' ? value.toLowerCase() : value;
                }
            };

            results.sort((a, b) => {
                const valA = getSortableValue(a, sortConfig.key);
                const valB = getSortableValue(b, sortConfig.key);

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return results;
    }, [tabFilteredUsers, debouncedChips, sortConfig]);

    const paginatedUsers = useMemo(() => {
        return filteredUsers.slice((currentPage - 1) * 50, currentPage * 50);
    }, [filteredUsers, currentPage]);
    
    const totalPages = Math.ceil(filteredUsers.length / 50);
    
    useEffect(() => { setCurrentPage(1); }, [activeTab, debouncedChips]);

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        setChips([]);
    };
    
    // FIX: Added name and role to the type to reflect data from the form, resolving type errors.
    const handleSaveUser = (userToSave: Partial<GenericUser> & { userType: UserRole | 'Personal', name?: string, role?: string }) => {
        const id = isStudent(userToSave as GenericUser) ? (userToSave as Student).documentNumber : (userToSave as Staff | ParentTutor).dni;
        // FIX: Safely access fullName or name from the partial user object.
        const name = (userToSave as Partial<Student>).fullName || userToSave.name;
        
        const isNewUser = !id || !users.some(u => (isStudent(u) ? u.documentNumber : u.dni) === id);

        if (isNewUser) {
            let newUser: GenericUser;
            const newId = (Math.floor(Math.random() * 90000000) + 10000000).toString();
            const baseData = {
                avatarUrl: `https://ui-avatars.com/api/?name=${(userToSave.name || 'Nuevo Usuario').replace(/\s/g, '+')}&background=random`,
                lastLogin: null,
                status: 'Pendiente' as UserStatus,
                tags: userToSave.tags || [],
            };

            switch(userToSave.userType) {
                case 'Estudiante':
                    newUser = {
                        ...baseData,
                        ...userToSave,
                        documentNumber: newId,
                        studentCode: `0000${newId}`,
                        fullName: userToSave.name || 'Nuevo Estudiante',
                        paternalLastName: '',
                        maternalLastName: '',
                        names: userToSave.name || 'Nuevo Estudiante',
                        tutorIds: [],
                        enrollmentStatus: 'Matriculado',
                        averageGrade: 0, attendancePercentage: 100, tardinessCount: 0, behaviorIncidents: 0, academicRisk: false,
                    } as Student;
                    break;
                case 'Docente':
                case 'Administrativo':
                case 'Apoyo':
                case 'Director':
                case 'Personal': // Fallback for general 'Personal'
                    newUser = {
                        ...baseData,
                        ...userToSave,
                        dni: newId,
                        name: userToSave.name || 'Nuevo Personal',
                        category: userToSave.role as Staff['category'] || 'Docente',
                    } as Staff;
                    break;
                case 'Apoderado':
                     newUser = {
                        ...baseData,
                        ...userToSave,
                        dni: newId,
                        name: userToSave.name || 'Nuevo Apoderado',
                        verified: false,
                        relation: 'Apoderado',
                    } as ParentTutor;
                    break;
                default:
                    console.error("Unknown user type:", userToSave.userType);
                    return;
            }

            setUsers(prevUsers => [newUser, ...prevUsers]);
            // FIX: Used a type guard to safely access name/fullName on the new user object, preventing type errors.
            const newUserName = isStudent(newUser) ? newUser.fullName : newUser.name;
            addActivityLog('Creación', `Se creó el perfil para ${newUserName} (${userToSave.userType}).`, newUserName);
            addNotification(`Usuario "${newUserName}" creado exitosamente. Se ha enviado una invitación.`, { label: 'Ver Usuario', path: `/usuarios?q=${newId}` });
        } else {
            setUsers(prevUsers => prevUsers.map(u => ((isStudent(u) ? u.documentNumber : u.dni) === id ? { ...u, ...userToSave } : u)));
            addActivityLog('Actualización', `Se actualizaron los datos del perfil.`, name);
            addNotification(`Usuario "${name}" actualizado exitosamente.`);
        }
        setDrawerState({ open: false, user: null });
    };

    const handleUserAction = (action: string, user: GenericUser, event?: React.MouseEvent<HTMLButtonElement>) => {
        if (event) triggerElementRef.current = event.currentTarget;
        
        const name = isStudent(user) ? user.fullName : user.name;
        const email = isParent(user) ? user.email : `${(isStudent(user) ? user.studentCode : user.dni)}@colegio.edu.pe`;
        
        const performStatusChange = (newStatus: UserStatus, reason?: string) => {
            const id = isStudent(user) ? user.documentNumber : user.dni;
            setUsers(users.map(u => (isStudent(u) ? u.documentNumber : u.dni) === id ? { ...u, status: newStatus } : u));
            addActivityLog('Cambio de Estado', `Estado cambiado a "${newStatus}". ${reason ? 'Motivo: ' + reason : ''}`, name);
            addNotification(`El estado de ${name} ha sido actualizado a "${newStatus}".`);
            setConfirmationModal(prev => ({...prev, isOpen: false}));
        };

        switch(action) {
            case 'view-details': setDrawerState({ open: true, user, initialTab: 'resumen' }); break;
            case 'edit-profile': setDrawerState({ open: true, user, initialTab: 'editar' }); break;
            case 'reset-password': 
                setConfirmationModal({ isOpen: true, title: 'Restablecer Contraseña', message: `Se enviará un enlace seguro para restablecer la contraseña a ${email}. ¿Desea continuar?`, onConfirm: () => {
                    addActivityLog('Reseteo de Contraseña', `Se envió un enlace de recuperación a ${email}`, name);
                    addNotification(`Enlace de recuperación enviado a ${name}`);
                    setConfirmationModal(prev => ({...prev, isOpen: false}));
                }, confirmText: 'Sí, Enviar Enlace' });
                break;
            case 'suspend':
                setConfirmationModal({ isOpen: true, title: `Suspender Usuario`, message: `¿Desea suspender la cuenta de ${name}? No podrá acceder al sistema.`, withReason: true, onConfirm: (reason) => performStatusChange('Suspendido', reason), confirmText: 'Sí, Suspender', confirmClass: 'bg-amber-600' });
                break;
            case 'resend-invitation':
                addActivityLog('Invitación Enviada', `Se reenvió la invitación a ${email}`, name);
                addNotification(`Invitación reenviada a ${name}`);
                break;
            case 'generate-carnet':
                if (isStudent(user)) generateCarnet([user]);
                break;
        }
    };
    
    const handleBulkAction = (action: string) => {
        const selectedCount = selectedUsers.size;
        
        const performBulkChange = (newStatus: UserStatus) => {
            setUsers(prevUsers => prevUsers.map(u => selectedUsers.has(isStudent(u) ? u.documentNumber : u.dni) ? { ...u, status: newStatus } : u));
            addActivityLog('Cambio de Estado', `Se cambió el estado a "${newStatus}" para ${selectedCount} usuarios.`);
            addNotification(`${selectedCount} usuarios actualizados a "${newStatus}".`);
            setSelectedUsers(new Set());
            setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        };
        
        const performBulkResend = () => {
            addActivityLog('Invitación Enviada', `Se reenviaron invitaciones a ${selectedCount} usuarios.`);
            addNotification(`Invitaciones reenviadas a ${selectedCount} usuarios.`);
            setSelectedUsers(new Set());
            setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        };
    
        switch(action) {
            case 'activate':
                setConfirmationModal({ isOpen: true, title: 'Activar Usuarios', message: `¿Está seguro de que desea activar ${selectedCount} usuarios seleccionados?`, onConfirm: () => performBulkChange('Activo'), confirmText: 'Sí, Activar' });
                break;
            case 'suspend':
                setConfirmationModal({ isOpen: true, title: 'Suspender Usuarios', message: `¿Está seguro de que desea suspender ${selectedCount} usuarios seleccionados?`, onConfirm: () => performBulkChange('Suspendido'), confirmText: 'Sí, Suspender', confirmClass: 'bg-amber-600' });
                break;
            case 'resend-invitation':
                 setConfirmationModal({ isOpen: true, title: 'Reenviar Invitaciones', message: `¿Está seguro de que desea reenviar la invitación a ${selectedCount} usuarios seleccionados?`, onConfirm: performBulkResend, confirmText: 'Sí, Reenviar' });
                break;
            case 'generate-carnets':
                const studentsToPrint = users.filter(u => isStudent(u) && selectedUsers.has(u.documentNumber)) as Student[];
                generateCarnet(studentsToPrint);
                addActivityLog('Generar Carnet', `Se generaron carnets para ${studentsToPrint.length} estudiantes.`);
                addNotification(`${studentsToPrint.length} carnets generados exitosamente.`);
                setSelectedUsers(new Set());
                break;
            case 'export-selected':
                 addActivityLog('Exportación', `Se exportaron los datos de ${selectedCount} usuarios seleccionados.`);
                 addNotification(`${selectedCount} usuarios exportados a CSV.`);
                 setSelectedUsers(new Set());
                break;
        }
    };

    const handleCreateUser = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (event) triggerElementRef.current = event.currentTarget;
        setDrawerState({ open: true, user: null });
    };

    const actions = (
        <div className="flex flex-col sm:flex-row items-center gap-2">
            <Button variant="secondary" icon={UploadCloud} onClick={() => setIsImportModalOpen(true)}>Importar CSV</Button>
            <Button variant="primary" icon={Plus} onClick={handleCreateUser}>Crear Usuario</Button>
        </div>
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Gestión de Usuarios"
                subtitle="Administre perfiles, roles y permisos de todos los miembros de la comunidad educativa."
                icon={Users}
                actions={actions}
            />
            
            <motion.div 
                // FIX: Removed incorrect spread attribute syntax for framer-motion props.
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <ChipSearchBar chips={chips} setChips={setChips} allUsers={allUsers}/>
            </motion.div>

            <motion.div 
                // FIX: Removed incorrect spread attribute syntax for framer-motion props.
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{delay: 0.1}}
            >
                <UserTable 
                    isLoading={isLoading}
                    users={paginatedUsers}
                    selectedUsers={selectedUsers}
                    setSelectedUsers={setSelectedUsers}
                    sortConfig={sortConfig}
                    setSortConfig={setSortConfig as (config: SortConfig) => void}
                    onAction={handleUserAction}
                    onClearFilters={() => setChips([])}
                    onCreateUser={handleCreateUser}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </motion.div>
            
            <BulkActionBar count={selectedUsers.size} onClear={() => setSelectedUsers(new Set())} onAction={handleBulkAction} />

            <UserDetailDrawer 
                isOpen={drawerState.open} 
                user={drawerState.user}
                allUsers={allUsers}
                allLogs={activityLogs}
                onClose={() => setDrawerState({ open: false, user: null })}
                onSave={handleSaveUser}
                triggerElementRef={triggerElementRef}
                initialTab={drawerState.initialTab}
            />

            <UserImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={(newUsers) => {
                const combinedUsers = [...users, ...newUsers]; // Simple merge, might need de-duplication
                setUsers(combinedUsers);
                addNotification(`${newUsers.length} usuarios importados exitosamente.`);
            }}/>
            
            <ConfirmationModal 
                {...confirmationModal}
                onClose={() => setConfirmationModal(prev => ({...prev, isOpen: false}))}
            />
        </div>
    );
};

export default UsersPage;