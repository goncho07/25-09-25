import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, BrainCircuit, AlertCircle } from 'lucide-react';
import { GenericUser, Student, UserRole, UserStatus } from '../../types';
import Button from './Button';

export type Chip = {
  id: string;
  type: 'text' | 'gradeSection' | 'dni' | 'role' | 'status';
  value: string;
  label: string;
  isValid: boolean;
};

type Suggestion = {
  type: Chip['type'];
  value: string;
  label: string;
  category: string;
};

const isStudent = (user: GenericUser): user is Student => 'studentCode' in user;

const VALID_ROLES: UserRole[] = ['Director', 'Administrativo', 'Docente', 'Apoyo', 'Estudiante', 'Apoderado'];
const VALID_STATUSES: UserStatus[] = ['Activo', 'Inactivo', 'Suspendido', 'Egresado', 'Pendiente'];

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
        const newChips = chips.filter(c => c.id !== id);
        setChips(newChips);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            if (inputValue.trim() === '') return;
            e.preventDefault();

            if (activeIndex > -1 && suggestions[activeIndex]) {
                const sug = suggestions[activeIndex];
                addChip({ type: sug.type, value: sug.value, label: sug.label, isValid: true });
            } else {
                const trimmedValue = inputValue.trim();
                const lowerTrimmedValue = trimmedValue.toLowerCase();

                // Check against valid catalogs
                const matchedRole = VALID_ROLES.find(r => r.toLowerCase() === lowerTrimmedValue);
                if (matchedRole) {
                    addChip({ type: 'role', value: matchedRole, label: `Rol: ${matchedRole}`, isValid: true });
                    return;
                }

                const matchedStatus = VALID_STATUSES.find(s => s.toLowerCase() === lowerTrimmedValue);
                if (matchedStatus) {
                    addChip({ type: 'status', value: matchedStatus, label: `Estado: ${matchedStatus}`, isValid: true });
                    return;
                }

                if (/^\d{8}$/.test(trimmedValue) && allUsers.some(u => (isStudent(u) ? u.documentNumber : u.dni) === trimmedValue)) {
                     addChip({ type: 'dni', value: trimmedValue, label: `DNI: ${trimmedValue}`, isValid: true });
                     return;
                }

                // If no valid criteria match, add as text search or invalid chip
                if(allUsers.some(u => (isStudent(u) ? u.fullName : u.name).toLowerCase().includes(lowerTrimmedValue))) {
                    addChip({ type: 'text', value: trimmedValue, label: trimmedValue, isValid: true });
                } else {
                    addChip({ type: 'text', value: trimmedValue, label: `Inválido: "${trimmedValue}"`, isValid: false });
                }
            }
        } else if (e.key === 'Backspace' && inputValue === '' && chips.length > 0) {
            removeChip(chips[chips.length - 1].id);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % (suggestions.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + (suggestions.length || 0)) % (suggestions.length || 1));
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setInputValue('');
            setSuggestions([]);
            setActiveIndex(-1);
            inputRef.current?.blur();
        }
    };

    useEffect(() => {
        if (inputValue.length < 2) {
            setSuggestions([]);
            return;
        }

        const lowerInput = inputValue.toLowerCase();
        const newSuggestions: Suggestion[] = [];

        // Role suggestions
        VALID_ROLES.forEach(role => {
            if(role.toLowerCase().includes(lowerInput)) newSuggestions.push({type: 'role', value: role, label: role, category: 'Rol'});
        });

        // Status suggestions
        VALID_STATUSES.forEach(status => {
            if(status.toLowerCase().includes(lowerInput)) newSuggestions.push({type: 'status', value: status, label: status, category: 'Estado'});
        });

        // User name suggestions
        allUsers.forEach(user => {
            const name = isStudent(user) ? user.fullName : user.name;
            if (name.toLowerCase().includes(lowerInput) && newSuggestions.length < 10) {
                if(!newSuggestions.some(s => s.value === name)) {
                    newSuggestions.push({ type: 'text', value: name, label: name, category: 'Nombre' });
                }
            }
        });

        setSuggestions([...newSuggestions].slice(0, 7));
    }, [inputValue, allUsers]);

    const highlightMatch = (text: string, query: string) => {
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return <span>{parts.map((part, i) => part.toLowerCase() === query.toLowerCase() ? <strong key={i}>{part}</strong> : part)}</span>;
    };

    return (
        <div>
            <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="text-slate-400" size={20} />
                </div>
                <div className="flex items-center gap-2 pl-10 pr-4 py-2 w-full border border-slate-300 dark:border-slate-600 rounded-full bg-white dark:bg-slate-700 focus-within:ring-2 focus-within:ring-indigo-500 transition">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {chips.map(chip => (
                          <motion.div
                            key={chip.id}
                            layout
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            className={`flex items-center gap-1.5 text-sm font-semibold pl-2.5 pr-1 py-0.5 rounded-full
                                ${chip.isValid
                                    ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                                    : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-300 dark:ring-rose-500/40'
                                }
                            `}
                            title={!chip.isValid ? "Criterio no válido. No se aplicará como filtro." : ""}
                          >
                              {!chip.isValid && <AlertCircle size={14} className="mr-1"/>}
                              {chip.label}
                              <button
                                onClick={() => removeChip(chip.id)}
                                className={`p-0.5 rounded-full
                                    ${chip.isValid
                                        ? 'bg-indigo-200 dark:bg-indigo-500/40 hover:bg-indigo-300 dark:hover:bg-indigo-500/60'
                                        : 'bg-rose-200 dark:bg-rose-500/40 hover:bg-rose-300 dark:hover:bg-rose-500/60'
                                    }
                                `}
                              ><X size={12} /></button>
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
                          placeholder={chips.length === 0 ? "Buscar por nombre, DNI, rol, estado..." : ""}
                          className="flex-grow bg-transparent focus:outline-none min-w-[150px] dark:text-slate-100"
                      />
                    </div>
                </div>

                <AnimatePresence>
                {isFocused && suggestions.length > 0 && (
                    <motion.ul
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 z-30 overflow-hidden"
                    >
                       {suggestions.map((sug, i) => (
                           <li key={`${sug.type}-${sug.value}`}>
                               <button
                                  onClick={() => addChip({type: sug.type, value: sug.value, label: sug.label, isValid: true})}
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

export default ChipSearchBar;