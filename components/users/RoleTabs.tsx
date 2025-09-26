import React, { useMemo } from 'react';
import { GenericUser, Staff, Student, ParentTutor } from '../../types';

// Type guards to identify user roles
const isStaff = (user: GenericUser): user is Staff => 'area' in user;
const isStudent = (user: GenericUser): user is Student => 'studentCode' in user;
const isParent = (user: GenericUser): user is ParentTutor => 'relation' in user;

type RoleTabId = 'Todos' | 'Personal' | 'Estudiantes' | 'Apoderados';

interface RoleTabsProps {
  // Use the full list of users before any role filtering to get accurate counts
  allUsers: GenericUser[];
  activeTab: RoleTabId;
  onTabChange: (tab: RoleTabId) => void;
}

const RoleTabs: React.FC<RoleTabsProps> = ({ allUsers, activeTab, onTabChange }) => {
  const counts = useMemo(() => {
    return {
      Todos: allUsers.length,
      Personal: allUsers.filter(isStaff).length,
      Estudiantes: allUsers.filter(isStudent).length,
      Apoderados: allUsers.filter(isParent).length,
    };
  }, [allUsers]);

  const tabs: { id: RoleTabId; label: string }[] = [
    { id: 'Todos', label: 'Todos' },
    { id: 'Personal', label: 'Personal' },
    { id: 'Estudiantes', label: 'Estudiantes' },
    { id: 'Apoderados', label: 'Apoderados' },
  ];

  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm transition-colors
              ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-500'
              }
              focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-t-md
            `}
          >
            {tab.label}
            <span className={`
              ml-2 text-xs py-0.5 px-2 rounded-full
              ${
                activeTab === tab.id
                  ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              }
            `}>
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default RoleTabs;