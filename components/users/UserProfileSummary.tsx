import React, { useMemo } from 'react';
import { GenericUser, Student, Staff, ParentTutor, UserRole } from '../../types';
import { TrendingUp, BarChart, Clock, AlertTriangle, Percent, Phone, Mail, User, Shield, Users, Pencil } from 'lucide-react';
import Button from '../ui/Button';
import FamilyGroupView from './FamilyGroupView';

const isStudent = (user: any): user is Student => user && 'studentCode' in user;
const isStaff = (user: any): user is Staff => user && 'area' in user;
const isParent = (user: any): user is ParentTutor => user && 'relation' in user;

const KpiItem: React.FC<{ icon: React.ElementType, value: string, label: string, color: string }> = ({ icon: Icon, value, label, color }) => (
    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <div className={`p-3 rounded-full ${color}`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        </div>
    </div>
);

interface UserProfileSummaryProps {
    user: GenericUser | null;
    isEditing: boolean;
    formData: any;
    onFormDataChange: React.Dispatch<React.SetStateAction<any>>;
    onEditToggle: () => void;
    allUsers: GenericUser[];
}

const UserProfileSummary: React.FC<UserProfileSummaryProps> = ({ user, isEditing, formData, onFormDataChange, onEditToggle, allUsers }) => {
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onFormDataChange(prev => ({ ...prev, [name]: value }));
    };

    const renderStudentSummary = (student: Student) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KpiItem icon={TrendingUp} value={student.averageGrade.toFixed(1)} label="Promedio Bimestral" color="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300" />
            <KpiItem icon={BarChart} value={`${student.attendancePercentage}%`} label="Asistencia" color="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300" />
            <KpiItem icon={Clock} value={`${student.tardinessCount}`} label="Tardanzas" color="bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300" />
            <KpiItem icon={AlertTriangle} value={`${student.behaviorIncidents}`} label="Incidencias" color="bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300" />
        </div>
    );

    const renderStaffSummary = (staff: Staff) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <KpiItem icon={Percent} value={`${staff.notesProgress || 0}%`} label="Avance Carga de Notas" color="bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300" />
             <KpiItem icon={BarChart} value={`${staff.attendancePercentage || 0}%`} label="Asistencia Periodo" color="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300" />
        </div>
    );

    const renderParentSummary = (parent: ParentTutor) => (
        <div className="text-center p-8 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-slate-500 dark:text-slate-400">Resumen para apoderados próximamente.</p>
        </div>
    );
    
    const renderContactInfo = () => {
        if (isEditing) {
            return (
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-1">Nombre Completo</label><input name="name" type="text" value={formData.name || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"/></div>
                    <div><label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-1">Email</label><input name="email" type="email" value={formData.email || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"/></div>
                    {isParent(formData) && <div><label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-1">Teléfono</label><input name="phone" type="text" value={formData.phone || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"/></div>}
                </div>
            );
        }

        const contactInfo = user ? [
            { icon: User, label: 'DNI / Código', value: isStudent(user) ? user.documentNumber : user.dni },
            { icon: Mail, label: 'Email', value: isParent(user) ? user.email : `${isStudent(user) ? user.studentCode : user.dni}@colegio.edu.pe` },
            ...(isParent(user) ? [{ icon: Phone, label: 'Teléfono', value: user.phone }] : []),
        ] : [];

        return (
            <div className="space-y-3">
                 {contactInfo.map(info => (
                     <div key={info.label} className="flex items-center text-sm">
                        <info.icon size={16} className="text-slate-400 mr-3" />
                        <span className="font-semibold text-slate-500 dark:text-slate-400 w-28">{info.label}:</span>
                        <span className="text-slate-700 dark:text-slate-200">{info.value}</span>
                     </div>
                 ))}
             </div>
        );
    };

    return (
        <div className="space-y-6">
            {user && isStudent(user) && user.academicRisk && (
                <div className="p-4 bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 rounded-lg flex items-center gap-3">
                    <AlertTriangle size={20} />
                    <p className="font-semibold text-sm">Este estudiante se encuentra en riesgo académico debido a su promedio o inasistencias.</p>
                </div>
            )}
            
            {user && (
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Indicadores Clave</h3>
                    {isStudent(user) && renderStudentSummary(user)}
                    {isStaff(user) && renderStaffSummary(user)}
                    {isParent(user) && renderParentSummary(user)}
                </div>
            )}
            
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Información de Contacto</h3>
                    {user && (
                        <Button variant="tertiary" onClick={onEditToggle} icon={Pencil}>
                            {isEditing ? 'Cancelar' : 'Editar'}
                        </Button>
                    )}
                 </div>
                 {renderContactInfo()}
            </div>

            {user && isStudent(user) && (
                <FamilyGroupView student={user} allUsers={allUsers} />
            )}
        </div>
    );
};

export default UserProfileSummary;