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
import ChipSearchBar, { Chip } from '../components/ui/ChipSearchBar';
import RoleTabs from '../components/users/RoleTabs';

// --- HELPER TYPES & FUNCTIONS ---
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
    const [activeStatusFilter, setActiveStatusFilter] = useState<UserStatus | 'Todos'>('Todos');
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

    const filteredUsers = useMemo(() => {
        let results = [...users];

        // 1. Apply Status Filter (from KPIs)
        if (activeStatusFilter !== 'Todos') {
            if (activeStatusFilter === 'Inactivo') {
                results = results.filter(u => u.status === 'Inactivo' || u.status === 'Egresado');
            } else {
                results = results.filter(u => u.status === activeStatusFilter);
            }
        }

        // 2. Apply Tab Filter (Roles)
        if (activeTab !== 'Todos') {
            if (activeTab === 'Personal') results = results.filter(u => isStaff(u));
            else if (activeTab === 'Estudiantes') results = results.filter(u => isStudent(u));
            else if (activeTab === 'Apoderados') results = results.filter(u => isParent(u));
        }

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
    }, [users, activeStatusFilter, activeTab, debouncedChips, sortConfig]);

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
        // Main container with flex-col to structure the page vertically
        <div className="flex flex-col h-full">
            <PageHeader
                title="Gestión de Usuarios"
                subtitle="Administre perfiles, roles y permisos de todos los miembros de la comunidad educativa."
                icon={Users}
                actions={actions}
            />
            
            {/* KPIs Section */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <UserKpiCards users={allUsers} activeStatus={activeStatusFilter} onStatusChange={setActiveStatusFilter} />
            </motion.div>

            {/* Main content area */}
            <div className="flex flex-col flex-grow mt-4 bg-white dark:bg-slate-900/50 p-4 rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-800">
                {/* Search and Filters */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
                    <ChipSearchBar chips={chips} setChips={setChips} allUsers={allUsers}/>
                </motion.div>

                {/* Role Tabs */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                    <div className="mt-4">
                        <RoleTabs allUsers={allUsers} activeTab={activeTab} onTabChange={handleTabChange} />
                    </div>
                </motion.div>

                {/* Table */}
                <motion.div
                    className="flex-grow"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
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
            </div>
            
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