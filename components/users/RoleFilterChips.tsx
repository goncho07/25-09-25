import React, { useMemo } from 'react';
import { GenericUser, Staff, Student, ParentTutor } from '../../types';
import { Shield, GraduationCap, Users2, UserSquare } from 'lucide-react';

const isStaff = (user: GenericUser): user is Staff => 'area' in user;
const isStudent = (user: GenericUser): user is Student => 'studentCode' in user;
const isParent = (user: GenericUser): user is ParentTutor => 'relation' in user;

type RoleFilterId = 'Todos' | 'Personal' | 'Estudiantes' | 'Apoderados';

interface RoleFilterChipsProps {
  allUsers: GenericUser[];
  activeRole: RoleFilterId;
  onRoleChange: (role: RoleFilterId) => void;
}

const RoleFilterChips: React.FC<RoleFilterChipsProps> = ({ allUsers, activeRole, onRoleChange }) => {
  const counts = useMemo(() => ({
    Todos: allUsers.length,
    Personal: allUsers.filter(isStaff).length,
    Estudiantes: allUsers.filter(isStudent).length,
    Apoderados: allUsers.filter(isParent).length,
  }), [allUsers]);

  const roles: { id: RoleFilterId; label: string; icon: React.ElementType }[] = [
    { id: 'Personal', label: 'Personal Directivo', icon: Shield },
    { id: 'Estudiantes', label: 'Estudiantes', icon: GraduationCap },
    { id: 'Apoderados', label: 'Apoderados', icon: Users2 },
    { id: 'Todos', label: 'Todos', icon: UserSquare },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {roles.map(role => (
        <button
          key={role.id}
          onClick={() => onRoleChange(role.id)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all
            ${
              activeRole === role.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }
            focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
          `}
        >
          <role.icon size={16} />
          <span>{role.label}</span>
          <span className={`
            ml-1 text-xs py-0.5 px-1.5 rounded-full
            ${
              activeRole === role.id
                ? 'bg-indigo-400 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }
          `}>
            {counts[role.id]}
          </span>
        </button>
      ))}
    </div>
  );
};

export default RoleFilterChips;