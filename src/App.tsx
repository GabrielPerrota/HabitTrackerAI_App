import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  Zap, 
  ChevronRight,
  ChevronLeft,
  RefreshCcw,
  BrainCircuit,
  Droplets,
  Timer,
  BookOpen,
  Dumbbell,
  Utensils,
  Sun,
  Dices,
  Plus,
  X,
  Search,
  Filter,
  Copy,
  Check,
  Settings,
  Trash2,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateHabitReport } from './services/geminiService';
import { habits as habitLibrary, Habit } from './data/habits';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const INITIAL_HABITS = [
  { id: 'acordar_cedo', label: 'Acordar Cedo', icon: Sun, emoji: '🌅', color: 'text-amber-500' },
  { id: 'correr', label: 'Correr', icon: Dumbbell, emoji: '🏃', color: 'text-blue-500' },
  { id: 'leitura', label: 'Leitura', icon: BookOpen, emoji: '📚', color: 'text-indigo-500' },
  { id: 'agua', label: 'Água (2L+)', icon: Droplets, emoji: '💧', color: 'text-cyan-500' },
  { id: 'suplementacao', label: 'Suplementação', icon: Zap, emoji: '💊', color: 'text-purple-500' },
  { id: 'dieta', label: 'Dieta', icon: Utensils, emoji: '🥗', color: 'text-emerald-500' },
];

type HabitData = Record<string, boolean>;
type WeekData = Record<string, HabitData>;
type AllWeeksData = Record<string, WeekData>;

const initialWeekData: WeekData = DAYS.reduce((acc, day) => {
  acc[day] = INITIAL_HABITS.reduce((hAcc, habit) => {
    hAcc[habit.id] = false;
    return hAcc;
  }, {} as HabitData);
  return acc;
}, {} as WeekData);

const WEEKS = [
  { id: '2026-03-1', label: 'Semana 1', range: '01 Março' },
  { id: '2026-03-2', label: 'Semana 2', range: '02 - 08 Março' },
  { id: '2026-03-3', label: 'Semana 3', range: '09 - 15 Março' },
  { id: '2026-03-4', label: 'Semana 4', range: '16 - 22 Março' },
  { id: '2026-03-5', label: 'Semana 5', range: '23 - 29 Março' },
];

const initialAllData: AllWeeksData = WEEKS.reduce((acc, week) => {
  acc[week.id] = JSON.parse(JSON.stringify(initialWeekData));
  // Pre-fill previous weeks with sample data for demonstration
  if (week.id !== '2026-03-5') {
    DAYS.forEach(day => {
      INITIAL_HABITS.forEach(habit => {
        acc[week.id][day][habit.id] = Math.random() > 0.4;
      });
    });
  }
  return acc;
}, {} as AllWeeksData);

export default function App() {
  const [habits, setHabits] = useState(INITIAL_HABITS);
  const [allData, setAllData] = useState<AllWeeksData>(initialAllData);
  const [selectedWeekId, setSelectedWeekId] = useState('2026-03-5');
  const currentWeekId = '2026-03-5';
  
  const data = useMemo(() => allData[selectedWeekId] || initialWeekData, [allData, selectedWeekId]);
  const isReadOnly = selectedWeekId !== currentWeekId;

  const [reports, setReports] = useState<Record<string, string | null>>({});
  const report = useMemo(() => reports[selectedWeekId] || null, [reports, selectedWeekId]);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracker' | 'report'>('tracker');
  const [isEditMode, setIsEditMode] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('✨');
  
  // Library State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('Todos');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  const addHabit = (name?: string, emoji?: string) => {
    const finalName = name || newHabitName;
    const finalEmoji = emoji || newHabitEmoji || '✨';
    
    if (!finalName.trim()) return;
    
    const id = finalName.toLowerCase().trim().replace(/\s+/g, '_') + '_' + Date.now();
    const newHabit = { 
      id, 
      label: finalName.trim(), 
      emoji: finalEmoji, 
      icon: Dices, 
      color: 'text-zinc-500' 
    };
    
    setHabits(prev => [...prev, newHabit]);
    setAllData(prev => {
      const newData = { ...prev };
      Object.keys(newData).forEach(weekId => {
        DAYS.forEach(day => {
          newData[weekId][day] = { ...newData[weekId][day], [id]: false };
        });
      });
      return newData;
    });
    
    setNewHabitName('');
    setNewHabitEmoji('✨');
    setIsLibraryModalOpen(false);
    setActiveTab('tracker');
  };

  const deleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    setAllData(prev => {
      const newData = { ...prev };
      Object.keys(newData).forEach(weekId => {
        DAYS.forEach(day => {
          const { [id]: _, ...rest } = newData[weekId][day];
          newData[weekId][day] = rest;
        });
      });
      return newData;
    });
  };

  const toggleHabit = (day: string, habitId: string) => {
    if (isReadOnly) return;
    setAllData(prev => ({
      ...prev,
      [selectedWeekId]: {
        ...prev[selectedWeekId],
        [day]: {
          ...prev[selectedWeekId][day],
          [habitId]: !prev[selectedWeekId][day][habitId]
        }
      }
    }));
  };

  const stats = useMemo(() => {
    const totalPossible = DAYS.length * habits.length;
    let completed = 0;
    
    const dayStats = DAYS.map(day => {
      const dayCompleted = Object.values(data[day]).filter(Boolean).length;
      completed += dayCompleted;
      return {
        name: day,
        completed: dayCompleted,
        percentage: habits.length > 0 ? (dayCompleted / habits.length) * 100 : 0
      };
    });

    const habitStats = habits.map(habit => {
      const habitCompleted = DAYS.filter(day => data[day][habit.id]).length;
      return {
        name: habit.label,
        completed: habitCompleted,
        percentage: (habitCompleted / DAYS.length) * 100
      };
    });

    return {
      totalPercentage: totalPossible > 0 ? (completed / totalPossible) * 100 : 0,
      dayStats,
      habitStats,
      completedCount: completed,
      totalPossible
    };
  }, [data, habits]);

  const handleGenerateReport = async () => {
    if (report) {
      setActiveTab('report');
      return;
    }
    setLoading(true);
    setActiveTab('report');
    try {
      const reportData = {
        week: WEEKS.find(w => w.id === selectedWeekId)?.label || selectedWeekId,
        habits: habits.map(h => ({ id: h.id, label: h.label, emoji: h.emoji })),
        data: data
      };
      const result = await generateHabitReport(reportData);
      const finalReport = result || "Não foi possível gerar o relatório. Tente novamente.";
      setReports(prev => ({
        ...prev,
        [selectedWeekId]: finalReport
      }));
    } catch (error) {
      console.error(error);
      setReports(prev => ({
        ...prev,
        [selectedWeekId]: "Erro ao conectar com a IA. Verifique sua conexão."
      }));
    } finally {
      setLoading(false);
    }
  };

  const resetData = () => {
    if (confirm('Tem certeza que deseja limpar todos os dados da semana?')) {
      setAllData(prev => ({
        ...prev,
        [selectedWeekId]: JSON.parse(JSON.stringify(initialWeekData))
      }));
      setReports(prev => ({
        ...prev,
        [selectedWeekId]: null
      }));
      setActiveTab('tracker');
    }
  };

  const fillRandomly = () => {
    if (isReadOnly) return;
    const newData: WeekData = DAYS.reduce((acc, day) => {
      acc[day] = habits.reduce((hAcc, habit) => {
        hAcc[habit.id] = Math.random() > 0.4; // 60% chance of being true
        return hAcc;
      }, {} as HabitData);
      return acc;
    }, {} as WeekData);
    setAllData(prev => ({
      ...prev,
      [selectedWeekId]: newData
    }));
    setReports(prev => ({
      ...prev,
      [selectedWeekId]: null
    }));
  };

  const filteredLibrary = useMemo(() => {
    return habitLibrary.filter(h => {
      const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterCategory === 'Todos' || h.category === filterCategory;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, filterCategory]);

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-zinc-900 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-zinc-200">
              <BrainCircuit size={20} className="text-white sm:hidden" />
              <BrainCircuit size={24} className="text-white hidden sm:block" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-zinc-900 leading-tight">HabitTracker AI</h1>
              <p className="hidden sm:block text-[10px] sm:text-xs text-zinc-500 font-medium uppercase tracking-wider">Comportamento & Rotina</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <button 
              onClick={fillRandomly}
              disabled={isReadOnly}
              className={cn(
                "p-2 transition-colors",
                isReadOnly ? "text-zinc-200 cursor-not-allowed" : "text-zinc-500 hover:text-zinc-600"
              )}
              title={isReadOnly ? "Não editável" : "Teste (Aleatório)"}
            >
              <Dices size={20} className="w-5 h-5" />
            </button>
            <button 
              onClick={handleGenerateReport}
              disabled={loading}
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold transition-all disabled:opacity-50 text-xs sm:text-sm",
                report 
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-100" 
                  : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-md shadow-zinc-200"
              )}
            >
              {loading ? (
                <RefreshCcw className="animate-spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              <span>
                {loading ? "Processando..." : report ? "Análise IA" : "Gerar"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-32">
        {/* Navigation Tabs (Desktop only) */}
        <div className="hidden sm:flex gap-1 bg-zinc-200/50 p-1 rounded-xl mb-8 w-fit overflow-x-auto">
          <button 
            onClick={() => setActiveTab('tracker')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
              activeTab === 'tracker' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Tracker Diário
          </button>
          <button 
            onClick={() => setActiveTab('report')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
              activeTab === 'report' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Insights AI
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'tracker' ? (
            <motion.div 
              key="tracker"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="glass-card p-4 sm:p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <span className="text-xs sm:text-sm font-medium text-zinc-500">Desempenho Geral</span>
                    <TrendingUp size={18} className="text-emerald-500 sm:w-5 sm:h-5" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-bold text-zinc-900">{stats.totalPercentage.toFixed(0)}%</span>
                    <span className="text-zinc-400 text-xs sm:text-sm">da meta</span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2 rounded-full mt-3 sm:mt-4 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.totalPercentage}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>

                <div className="glass-card p-4 sm:p-6 col-span-1 sm:col-span-2">
                  <span className="text-xs sm:text-sm font-medium text-zinc-500 block mb-3 sm:mb-4">Progresso Diário</span>
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.dayStats}>
                        <XAxis dataKey="name" hide />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-xs shadow-xl border border-zinc-800">
                                  {payload[0].payload.name}: {Number(payload[0].value).toFixed(0)}%
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="percentage" radius={[4, 4, 4, 4]}>
                          {stats.dayStats.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.percentage > 70 ? '#10b981' : entry.percentage > 40 ? '#f59e0b' : '#ef4444'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Week Navigation */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white p-3 sm:p-4 rounded-3xl border border-zinc-100 shadow-sm gap-3 sm:gap-0">
                <div className="flex items-center gap-3 px-1">
                  <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 leading-tight">
                      {WEEKS.find(w => w.id === selectedWeekId)?.label}
                      <span className="ml-2 font-medium text-zinc-400">
                        {WEEKS.find(w => w.id === selectedWeekId)?.range}
                      </span>
                    </h3>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mt-0.5">
                      {isReadOnly ? "Visualização" : "Semana Atual"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-1 bg-zinc-50 sm:bg-transparent p-1 sm:p-0 rounded-2xl">
                  <button
                    onClick={() => {
                      const currentIndex = WEEKS.findIndex(w => w.id === selectedWeekId);
                      if (currentIndex > 0) {
                        setSelectedWeekId(WEEKS[currentIndex - 1].id);
                      }
                    }}
                    disabled={WEEKS.findIndex(w => w.id === selectedWeekId) === 0}
                    className="flex-1 sm:flex-none flex items-center justify-center p-2 rounded-xl hover:bg-white active:bg-white disabled:opacity-30 transition-all text-zinc-600 shadow-sm sm:shadow-none bg-white sm:bg-transparent"
                  >
                    <ChevronLeft size={20} />
                    <span className="sm:hidden text-xs font-bold ml-1">Anterior</span>
                  </button>
                  <button
                    onClick={() => {
                      const currentIndex = WEEKS.findIndex(w => w.id === selectedWeekId);
                      if (currentIndex < WEEKS.length - 1) {
                        setSelectedWeekId(WEEKS[currentIndex + 1].id);
                      }
                    }}
                    disabled={WEEKS.findIndex(w => w.id === selectedWeekId) === WEEKS.length - 1}
                    className="flex-1 sm:flex-none flex items-center justify-center p-2 rounded-xl hover:bg-white active:bg-white disabled:opacity-30 transition-all text-zinc-600 shadow-sm sm:shadow-none bg-white sm:bg-transparent"
                  >
                    <span className="sm:hidden text-xs font-bold mr-1">Próxima</span>
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Habit Grid - Swapped Axes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Tabela de Hábitos</h3>
                  {!isReadOnly && (
                    <button 
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                        isEditMode 
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                          : "bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200"
                      )}
                    >
                      {isEditMode ? <Check size={16} /> : <Settings size={16} />}
                      {isEditMode ? "Concluir Edição" : "Editar Hábitos"}
                    </button>
                  )}
                </div>
                
                <div className="hidden sm:block glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <Reorder.Group 
                          as="tr"
                          axis="x" 
                          values={habits} 
                          onReorder={setHabits} 
                          className="border-b border-zinc-100"
                        >
                          <th className="p-4 bg-zinc-50/50 font-medium text-zinc-500 text-xs uppercase tracking-wider w-32">Dia</th>
                          {habits.map((habit) => (
                            <Reorder.Item 
                              key={habit.id} 
                              value={habit} 
                              as="th" 
                              className={cn(
                                "p-4 bg-zinc-50/50 font-medium text-zinc-900 text-center min-w-[80px] relative",
                                isEditMode && "cursor-grab active:cursor-grabbing"
                              )}
                              title={habit.label}
                              dragListener={isEditMode}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-xl">{habit.emoji}</span>
                                {isEditMode && (
                                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-sm border border-zinc-100">
                                    <button 
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteHabit(habit.id);
                                      }}
                                      className="p-1 text-zinc-400 hover:text-rose-600"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </Reorder.Item>
                          ))}
                          {isEditMode && (
                            <th className="p-4 bg-zinc-50/50 text-center min-w-[80px]">
                              <button 
                                onClick={() => setIsLibraryModalOpen(true)}
                                className="w-10 h-10 rounded-xl border-2 border-dashed border-zinc-200 flex items-center justify-center text-zinc-400 hover:border-zinc-300 hover:text-zinc-500 transition-all mx-auto group"
                                title="Adicionar Novo Hábito da Biblioteca"
                              >
                                <Plus size={20} className="group-hover:scale-110 transition-transform" />
                              </button>
                            </th>
                          )}
                        </Reorder.Group>
                      </thead>
                    <tbody>
                      {DAYS.map(day => (
                        <tr key={day} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/30 transition-colors">
                          <td className="p-4">
                            <span className="text-sm font-medium text-zinc-700">{day}</span>
                          </td>
                          {habits.map(habit => (
                            <motion.td 
                              layout
                              key={habit.id} 
                              className="p-4 text-center"
                            >
                              <button 
                                onClick={() => toggleHabit(day, habit.id)}
                                disabled={isReadOnly}
                                className={cn(
                                  "habit-checkbox mx-auto",
                                  data[day][habit.id] && "checked",
                                  isReadOnly && "cursor-default opacity-80"
                                )}
                              >
                                {data[day][habit.id] && <CheckCircle2 size={16} />}
                              </button>
                            </motion.td>
                          ))}
                          {isEditMode && <td className="p-4 bg-zinc-50/10"></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile View: Habit Cards */}
                <div className="sm:hidden space-y-3">
                {habits.map(habit => (
                  <div key={habit.id} className="glass-card p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-sm">
                          {habit.emoji}
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 text-xs sm:text-sm">{habit.label}</h4>
                          <p className="text-[9px] sm:text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Progresso Semanal</p>
                        </div>
                      </div>
                      {isEditMode && (
                        <button 
                          onClick={() => deleteHabit(habit.id)} 
                          className="p-1.5 sm:p-2 text-zinc-300 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {DAYS.map(day => (
                        <div key={day} className="flex flex-col items-center gap-1.5">
                          <span className="text-[8px] sm:text-[9px] text-zinc-400 font-bold uppercase">{day.slice(0, 1)}</span>
                          <button 
                            onClick={() => toggleHabit(day, habit.id)}
                            disabled={isReadOnly}
                            className={cn(
                              "w-full aspect-square rounded-lg border-2 flex items-center justify-center transition-all",
                              data[day][habit.id] 
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-100" 
                                : "bg-zinc-50 border-zinc-200/60 text-transparent",
                              isReadOnly && "cursor-default opacity-80"
                            )}
                          >
                            <CheckCircle2 size={12} className={cn("sm:w-3.5 sm:h-3.5", data[day][habit.id] ? "opacity-100" : "opacity-0")} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {!isReadOnly && (
                  <button 
                    onClick={() => setIsLibraryModalOpen(true)}
                    className="w-full p-3 sm:p-4 rounded-2xl border-2 border-dashed border-zinc-200 flex items-center justify-center gap-2 text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50 transition-all"
                  >
                    <Plus size={18} className="sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm font-bold">Adicionar Hábito</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
          ) : (
            <motion.div 
              key="report"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {loading ? (
                <div className="glass-card p-20 flex flex-col items-center justify-center text-center">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="mb-6 text-emerald-500"
                  >
                    <BrainCircuit size={48} />
                  </motion.div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">Analisando seus padrões...</h3>
                  <p className="text-zinc-500 max-w-sm">
                    Nossa IA está processando seus dados para identificar gatilhos comportamentais e sugerir melhorias.
                  </p>
                </div>
              ) : report ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-4 sm:p-8 md:p-10 markdown-body overflow-hidden">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {report}
                      </ReactMarkdown>
                    </div>
                  </div>
                  
                  <div className="space-y-4 sm:space-y-6">
                    <div className="glass-card p-5 sm:p-6">
                      <h3 className="text-xs sm:text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <BarChart3 size={16} className="text-emerald-500" />
                        Adesão por Hábito
                      </h3>
                      <div className="space-y-4">
                        {stats.habitStats.map(habit => (
                          <div key={habit.name}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-zinc-600">{habit.name}</span>
                              <span className="text-zinc-400">{habit.percentage.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-zinc-900 rounded-full" 
                                style={{ width: `${habit.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-emerald-600 rounded-2xl p-5 sm:p-6 text-white shadow-xl shadow-emerald-100">
                      <Zap size={20} className="mb-3 sm:mb-4 sm:w-6 sm:h-6" />
                      <h3 className="text-base sm:text-lg font-bold mb-2">Pronto para a próxima semana?</h3>
                      <p className="text-emerald-100 text-xs sm:text-sm mb-5 sm:mb-6 leading-relaxed">
                        A consistência é construída um dia de cada vez. Use as sugestões da IA para ajustar sua rotina.
                      </p>
                      <button 
                        onClick={() => setActiveTab('tracker')}
                        className="w-full bg-white text-emerald-600 py-2.5 sm:py-3 rounded-xl font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        Voltar ao Tracker
                        <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-12 sm:p-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400 mb-6">
                    <Sparkles size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">Nenhum relatório gerado</h3>
                  <p className="text-zinc-500 max-w-sm mb-8">
                    Gere um relatório de IA para esta semana para ver uma análise detalhada do seu desempenho e sugestões personalizadas.
                  </p>
                  <button 
                    onClick={handleGenerateReport}
                    className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2"
                  >
                    <Sparkles size={20} />
                    Gerar Relatório Agora
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>      </main>

      {/* Bottom Padding for Mobile */}
      <div className="h-20" />

      {/* Bottom Navigation for Mobile */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-6 py-3 z-50 flex items-center justify-between shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => setActiveTab('tracker')}
          className={cn(
            "flex flex-col items-center gap-1.5 transition-all outline-none",
            activeTab === 'tracker' ? "text-emerald-600 scale-110" : "text-zinc-400"
          )}
        >
          <div className={cn(
            "p-2 rounded-xl transition-all",
            activeTab === 'tracker' ? "bg-emerald-50" : ""
          )}>
            <Calendar size={22} className={activeTab === 'tracker' ? "fill-emerald-100" : ""} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Tracker</span>
        </button>

        <button 
          onClick={() => setIsLibraryModalOpen(true)}
          className="flex flex-col items-center gap-1.5 -mt-10"
        >
          <div className="w-14 h-14 bg-zinc-900 rounded-full flex items-center justify-center text-white shadow-xl shadow-zinc-200 border-4 border-white active:scale-90 transition-transform">
            <Plus size={28} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight text-zinc-500 mt-1">Hábito</span>
        </button>

        <button 
          onClick={() => setActiveTab('report')}
          className={cn(
            "flex flex-col items-center gap-1.5 transition-all outline-none",
            activeTab === 'report' ? "text-emerald-600 scale-110" : "text-zinc-400"
          )}
        >
          <div className={cn(
            "p-2 rounded-xl transition-all",
            activeTab === 'report' ? "bg-emerald-50" : ""
          )}>
            <Sparkles size={22} className={activeTab === 'report' ? "fill-emerald-100" : ""} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight">Insights</span>
        </button>
      </nav>

      {/* Habit Library Modal */}
      <AnimatePresence>
        {isLibraryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLibraryModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 sm:p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900">Adicionar Hábito</h2>
                  <p className="text-xs sm:text-sm text-zinc-500">Escolha da biblioteca ou crie um personalizado</p>
                </div>
                <button 
                  onClick={() => setIsLibraryModalOpen(false)}
                  className="p-2 hover:bg-zinc-200 rounded-xl transition-colors text-zinc-400"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
                {/* Custom Habit Form */}
                <section>
                  <h3 className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 sm:mb-4">Hábito Personalizado</h3>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <input 
                      autoFocus
                      className="flex-1 p-2 sm:p-3 bg-zinc-100 border-transparent focus:bg-white focus:border-emerald-500 border-2 rounded-xl focus:outline-none transition-all text-xs sm:text-sm"
                      placeholder="Ex: Ler 10 páginas..."
                      value={newHabitName}
                      onChange={e => setNewHabitName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addHabit()}
                    />
                    <div className="flex gap-2 sm:gap-3">
                      <input 
                        className="w-12 sm:w-16 p-2 sm:p-3 bg-zinc-100 border-transparent focus:bg-white focus:border-emerald-500 border-2 rounded-xl text-center focus:outline-none transition-all text-xs sm:text-sm"
                        placeholder="Emoji"
                        value={newHabitEmoji}
                        onChange={e => setNewHabitEmoji(e.target.value)}
                      />
                      <button 
                        onClick={() => addHabit()}
                        className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
                      >
                        <Plus size={18} className="sm:w-5 sm:h-5" />
                        Criar
                      </button>
                    </div>
                  </div>
                </section>

                <div className="h-px bg-zinc-100" />

                {/* Library Search & Grid */}
                <section className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between sticky top-0 bg-white py-2 z-10">
                    <h3 className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">Biblioteca (250+)</h3>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 sm:w-4 sm:h-4" size={14} />
                        <input 
                          type="text"
                          placeholder="Pesquisar..."
                          className="w-full pl-9 pr-4 py-1.5 sm:py-2 bg-zinc-100 border-transparent focus:bg-white focus:border-emerald-500 border-2 rounded-xl focus:outline-none transition-all text-xs sm:text-sm"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <select 
                        className="bg-zinc-100 border-transparent focus:bg-white focus:border-emerald-500 border-2 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none transition-all"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                      >
                        <option value="Todos">Todas as Categorias</option>
                        <option value="Saúde & Corpo">Saúde & Corpo</option>
                        <option value="Mente & Bem-estar">Mente & Bem-estar</option>
                        <option value="Produtividade & Trabalho">Produtividade & Trabalho</option>
                        <option value="Estudos & Aprendizado">Estudos & Aprendizado</option>
                        <option value="Finanças">Finanças</option>
                        <option value="Casa & Organização">Casa & Organização</option>
                        <option value="Social & Lazer">Social & Lazer</option>
                        <option value="Autocuidado & Rotina">Autocuidado & Rotina</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredLibrary.map((habit) => (
                      <button 
                        key={habit.id}
                        onClick={() => addHabit(habit.name, habit.emoji)}
                        className="flex items-center justify-between p-3 rounded-2xl border-2 border-zinc-50 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{habit.emoji}</span>
                          <div>
                            <h4 className="text-sm font-bold text-zinc-900 line-clamp-1">{habit.name}</h4>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">{habit.category}</span>
                          </div>
                        </div>
                        <Plus size={16} className="text-zinc-300 group-hover:text-emerald-600 transition-colors" />
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
