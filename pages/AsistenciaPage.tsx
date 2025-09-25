import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Users, User, Search, QrCode, Download, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import KpiCard from '../components/ui/KpiCard';
import { students } from '../data/students';
import { staff } from '../data/users';

type AttendanceTab = 'dashboard' | 'estudiantes' | 'personal';

const AsistenciaPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AttendanceTab>('dashboard');
  
  const attendanceData = useMemo(() => {
    const today = new Date().toLocaleDateString('es-PE');
    return [...students, ...staff].map(user => {
        const isStudent = 'studentCode' in user;
        const name = isStudent ? user.fullName : user.name;
        const statusOptions = ['Presente', 'Tarde', 'Ausente'];
        const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
        return {
            id: isStudent ? user.documentNumber : user.dni,
            name: name,
            type: isStudent ? 'Estudiante' : 'Personal',
            status: status,
            entryTime: status === 'Presente' ? '07:45 AM' : (status === 'Tarde' ? '08:15 AM' : null),
        };
    });
  }, []);

  const kpis = {
    studentAttendance: '92%',
    staffAttendance: '98%',
    latecomers: 15,
    absences: 8,
  };
  
  const getStatusChipClass = (status: string) => {
    switch (status) {
      case 'Presente': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300';
      case 'Tarde': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
      case 'Ausente': return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const renderContent = () => {
    switch(activeTab) {
        case 'dashboard':
            return (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard title="Asistencia Estudiantil (Hoy)" value={kpis.studentAttendance} icon={TrendingUp} />
                    <KpiCard title="Asistencia Personal (Hoy)" value={kpis.staffAttendance} icon={TrendingUp} />
                    <KpiCard title="Tardanzas (Hoy)" value={kpis.latecomers} icon={AlertTriangle} />
                    <KpiCard title="Ausencias (Hoy)" value={kpis.absences} icon={AlertTriangle} />
                 </motion.div>
            );
        case 'estudiantes':
        case 'personal':
            const dataToShow = attendanceData.filter(d => activeTab === 'estudiantes' ? d.type === 'Estudiante' : d.type === 'Personal');
            return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 dark:bg-slate-900/50">
                             <tr className="border-b-2 border-slate-100 dark:border-slate-700">
                               <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Nombre</th>
                               <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Estado</th>
                               <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Hora de Ingreso</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {dataToShow.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4 font-medium text-slate-800 dark:text-slate-100 capitalize">{item.name.toLowerCase()}</td>
                                        <td className="p-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusChipClass(item.status)}`}>{item.status}</span></td>
                                        <td className="p-4 text-slate-500 dark:text-slate-400">{item.entryTime || 'N/A'}</td>
                                    </tr>
                                ))}
                           </tbody>
                        </table>
                    </div>
                </motion.div>
            );
    }
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Asistencia"
        subtitle="Monitoree la asistencia en tiempo real, gestione justificaciones y genere reportes."
        icon={ClipboardCheck}
        actions={
            <div className="flex gap-2">
                <Button variant="secondary" icon={Download}>Reporte del Día</Button>
                <Button variant="primary" icon={QrCode} onClick={() => navigate('/asistencia/scan')}>Escanear QR</Button>
            </div>
        }
      />
      
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
            <nav className="flex flex-wrap gap-2">
                <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>Dashboard</button>
                <button onClick={() => setActiveTab('estudiantes')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full ${activeTab === 'estudiantes' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>Estudiantes</button>
                <button onClick={() => setActiveTab('personal')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full ${activeTab === 'personal' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>Personal</button>
            </nav>
            <div className="relative">
                <Search className="absolute left-3 text-slate-400 top-1/2 -translate-y-1/2" size={18}/>
                <input type="text" placeholder="Buscar..." className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 md:w-64"/>
            </div>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default AsistenciaPage;
