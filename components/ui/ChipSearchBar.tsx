import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, BrainCircuit } from 'lucide-react';
import { GenericUser, Student } from '../../types';
import Button from './Button';

// Helper types and functions that were coupled with this component
export type Chip = {
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

// --- ChipSearchBar Component ---
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
        <div>
            <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="text-slate-400" size={20} />
                </div>
                <div className="flex items-center gap-2 pl-10 pr-4 py-2 w-full border border-slate-300 dark:border-slate-600 rounded-full bg-white dark:bg-slate-700 focus-within:ring-2 focus-within:ring-indigo-500 transition">
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
                          placeholder={chips.length === 0 ? "Buscar por nombre, DNI, grado, sección..." : ""}
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

export default ChipSearchBar;