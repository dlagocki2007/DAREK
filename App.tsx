
import React, { useState, useEffect } from 'react';
import { SECTIONS } from './constants';
import { Lesson, Section } from './types';
import StudyBoard from './components/StudyBoard';
import PracticeEngine from './components/PracticeEngine';
import { Trophy, Flame, User, Lock, Star, Loader2, Sparkles, Check, ChevronRight, Construction, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Animation variants
const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -20, scale: 0.98, filter: 'blur(10px)' },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
};

const LoadingScreen = ({ message }: { message: string }) => (
  <motion.div
    key="loader"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center"
  >
    <div className="relative">
      <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="relative z-10 w-24 h-24 rounded-full border-t-4 border-r-4 border-indigo-500 border-b-4 border-slate-800 border-l-4 border-slate-800"
      />
      <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-2xl animate-pulse">
        ∞
      </div>
    </div>
    <motion.p 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-8 text-indigo-300 font-medium tracking-widest uppercase text-sm"
    >
      {message}
    </motion.p>
  </motion.div>
);

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'study' | 'practice'>('dashboard');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  
  // State for Level Selection
  const [currentLevel, setCurrentLevel] = useState<'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('A1');
  
  // Flatten sections to get all lessons for easy finding
  const [sections, setSections] = useState<Section[]>(SECTIONS);
  
  const [userXP, setUserXP] = useState(0);
  const [streak, setStreak] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  // Helper to find lesson across sections
  const findLesson = (id: string) => {
    for (const sec of sections) {
      const found = sec.lessons.find(l => l.id === id);
      if (found) return found;
    }
    return null;
  };

  const activeLesson = activeLessonId ? findLesson(activeLessonId) : null;

  // Load state from local storage
  useEffect(() => {
    const savedXP = localStorage.getItem('infinity_xp');
    if (savedXP) setUserXP(parseInt(savedXP));
    
    // In a real app, we would load completed lesson IDs here and update 'sections' state
  }, []);

  const handleLessonSelect = (id: string) => {
    const lesson = findLesson(id);
    if (lesson && !lesson.isLocked) {
      setIsLoading(true);
      setLoadingMsg('Pobieranie lekcji...');
      
      // Simulate loading delay for better UX
      setTimeout(() => {
        setLoadingMsg('Przygotowywanie audio...');
        setTimeout(() => {
          setActiveLessonId(id);
          setView('study');
          setIsLoading(false);
        }, 600);
      }, 600);
    }
  };

  const handleStartPractice = () => {
    setIsLoading(true);
    setLoadingMsg('Generowanie ćwiczeń...');
    
    setTimeout(() => {
      setLoadingMsg('Łączenie z AI...');
      setTimeout(() => {
        setView('practice');
        setIsLoading(false);
      }, 800);
    }, 600);
  };

  const handlePracticeComplete = (score: number) => {
    const newXP = userXP + score;
    setUserXP(newXP);
    localStorage.setItem('infinity_xp', newXP.toString());

    // Unlock next lesson logic
    if (activeLessonId) {
       const newSections = [...sections];
       
       // Find coordinates
       let secIdx = -1;
       let lesIdx = -1;

       for (let s = 0; s < newSections.length; s++) {
         const lIndex = newSections[s].lessons.findIndex(l => l.id === activeLessonId);
         if (lIndex !== -1) {
           secIdx = s;
           lesIdx = lIndex;
           break;
         }
       }

       if (secIdx !== -1 && lesIdx !== -1) {
         // Mark current completed
         newSections[secIdx].lessons[lesIdx].isCompleted = true;
         newSections[secIdx].lessons[lesIdx].stars = Math.max(newSections[secIdx].lessons[lesIdx].stars, score > 50 ? 3 : 1);

         // Unlock next lesson in current section
         if (lesIdx + 1 < newSections[secIdx].lessons.length) {
            newSections[secIdx].lessons[lesIdx + 1].isLocked = false;
         } 
         // Or unlock first lesson of next section
         else if (secIdx + 1 < newSections.length) {
            newSections[secIdx + 1].lessons[0].isLocked = false;
         }
       }

       setSections(newSections);
    }

    setView('dashboard');
    setActiveLessonId(null);
  };

  // Logic to filter sections based on level
  // Only 'A1' has content currently. Others return empty arrays to trigger "Coming Soon" state.
  const displayedSections = currentLevel === 'A1' ? sections : [];

  // Color mapping for Tailwind
  const getColorClasses = (color: string, isLocked: boolean) => {
    if (isLocked) return {
      bg: 'bg-slate-800',
      border: 'border-slate-700',
      text: 'text-slate-500',
      shadow: 'shadow-none'
    };
    
    const map: {[key: string]: any} = {
      emerald: { bg: 'bg-emerald-500', border: 'border-emerald-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#047857]' },
      blue: { bg: 'bg-blue-500', border: 'border-blue-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#1d4ed8]' },
      rose: { bg: 'bg-rose-500', border: 'border-rose-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#be123c]' },
      purple: { bg: 'bg-purple-500', border: 'border-purple-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#7e22ce]' },
      amber: { bg: 'bg-amber-500', border: 'border-amber-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#b45309]' },
      teal: { bg: 'bg-teal-500', border: 'border-teal-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#0f766e]' },
      cyan: { bg: 'bg-cyan-500', border: 'border-cyan-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#0e7490]' },
      fuchsia: { bg: 'bg-fuchsia-500', border: 'border-fuchsia-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#a21caf]' },
      lime: { bg: 'bg-lime-500', border: 'border-lime-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#4d7c0f]' },
      violet: { bg: 'bg-violet-500', border: 'border-violet-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#6d28d9]' },
      orange: { bg: 'bg-orange-500', border: 'border-orange-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#c2410c]' },
      sky: { bg: 'bg-sky-500', border: 'border-sky-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#0369a1]' },
      indigo: { bg: 'bg-indigo-500', border: 'border-indigo-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#4338ca]' },
      pink: { bg: 'bg-pink-500', border: 'border-pink-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#be185d]' },
      green: { bg: 'bg-green-500', border: 'border-green-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#15803d]' },
      red: { bg: 'bg-red-500', border: 'border-red-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#b91c1c]' },
      yellow: { bg: 'bg-yellow-500', border: 'border-yellow-700', text: 'text-white', shadow: 'shadow-[0_4px_0_0_#a16207]' },
    };
    return map[color] || map['indigo'];
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden relative">
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <LoadingScreen message={loadingMsg} />
          ) : (
            <>
              {/* VIEW: PRACTICE ENGINE */}
              {view === 'practice' && activeLesson ? (
                <motion.div
                  key="practice"
                  initial={pageVariants.initial}
                  animate={pageVariants.animate}
                  exit={pageVariants.exit}
                  transition={pageVariants.transition}
                  className="w-full h-full"
                >
                  <PracticeEngine 
                    exercises={activeLesson.exercises} 
                    onComplete={handlePracticeComplete} 
                    onExit={() => setView('study')}
                    lessonTitle={activeLesson.title}
                  />
                </motion.div>
              ) : 
              
              /* VIEW: STUDY BOARD */
              view === 'study' && activeLesson ? (
                <motion.div
                  key="study"
                  initial={pageVariants.initial}
                  animate={pageVariants.animate}
                  exit={pageVariants.exit}
                  transition={pageVariants.transition}
                  className="w-full min-h-screen flex flex-col"
                >
                   <nav className="p-4 flex justify-between items-center text-white border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
                      <button onClick={() => setView('dashboard')} className="text-slate-400 hover:text-white font-bold transition-colors flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800">
                        ← WRÓĆ
                      </button>
                      <span className="font-bold text-slate-300 text-sm tracking-widest uppercase">Tryb Nauki</span>
                   </nav>
                  <StudyBoard lesson={activeLesson} onStartPractice={handleStartPractice} />
                </motion.div>
              ) : (

              /* VIEW: DASHBOARD */
                <motion.div
                  key="dashboard"
                  initial={pageVariants.initial}
                  animate={pageVariants.animate}
                  exit={pageVariants.exit}
                  transition={pageVariants.transition}
                  className="w-full min-h-screen flex flex-col"
                >
                  {/* Navbar */}
                  <nav className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-800/50">
                    <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-indigo-500/20 text-white">∞</div>
                          <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">INFINITY EN</span>
                        </div>
                        {/* Level Switcher */}
                        <div className="flex flex-wrap gap-2 mt-2">
                           {(['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((lvl) => (
                             <button
                               key={lvl}
                               onClick={() => setCurrentLevel(lvl)}
                               className={`px-3 py-0.5 rounded-full text-xs font-bold transition-all border ${
                                 currentLevel === lvl 
                                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)]' 
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                               }`}
                             >
                               {lvl}
                             </button>
                           ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-6 text-sm font-bold">
                        <div className="hidden sm:flex items-center gap-2 text-amber-400 bg-amber-400/10 px-4 py-2 rounded-xl border border-amber-400/20">
                          <Flame size={18} fill="currentColor" />
                          <span>{streak} DNI</span>
                        </div>
                        <div className="flex items-center gap-2 text-indigo-400 bg-indigo-400/10 px-4 py-2 rounded-xl border border-indigo-400/20">
                          <Trophy size={18} />
                          <span>{userXP} XP</span>
                        </div>
                      </div>
                    </div>
                  </nav>

                  {/* Sections List */}
                  <main className="max-w-2xl mx-auto px-4 py-10 flex-grow pb-32">
                    
                    {displayedSections.length > 0 ? (
                      displayedSections.map((section, sIdx) => {
                        const isLocked = section.lessons[0].isLocked;
                        const colors = getColorClasses(section.color, isLocked);

                        return (
                          <div key={section.id} className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Section Header */}
                            <div className={`rounded-2xl p-6 mb-8 flex items-center justify-between border-b-4 ${colors.bg} ${colors.border} ${colors.text} ${colors.shadow}`}>
                               <div>
                                 <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-1">{section.title}</h2>
                                 <p className={`text-sm sm:text-base font-medium opacity-90 ${isLocked ? 'text-slate-500' : 'text-white'}`}>{section.description}</p>
                               </div>
                               {isLocked && <Lock className="text-slate-600 opacity-50" size={32} />}
                            </div>

                            {/* Lessons Path */}
                            <div className="flex flex-col items-center gap-6">
                              {section.lessons.map((lesson, lIdx) => {
                                 // Calculate ZigZag
                                 const offset = lIdx % 2 === 0 ? 'translate-x-0' : (lIdx % 4 === 1 ? 'translate-x-12' : '-translate-x-12');
                                 
                                 return (
                                   <div key={lesson.id} className={`relative group ${offset}`}>
                                      <button
                                        onClick={() => handleLessonSelect(lesson.id)}
                                        disabled={lesson.isLocked}
                                        className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center transition-all duration-200 active:translate-y-1 ${
                                          lesson.isLocked 
                                            ? 'bg-[#1e293b] border-b-[6px] border-[#0f172a] text-slate-600 grayscale'
                                            : lesson.isCompleted 
                                              ? 'bg-gradient-to-b from-amber-400 to-orange-500 border-b-[6px] border-orange-700 text-white shadow-lg'
                                              : `${colors.bg.replace('500', '500')} border-b-[6px] ${colors.border} text-white shadow-lg`
                                        }`}
                                      >
                                        {lesson.isLocked ? (
                                          <Lock size={24} strokeWidth={2.5} />
                                        ) : lesson.isCompleted ? (
                                          <Check size={36} strokeWidth={4} />
                                        ) : (
                                          <Star size={32} fill="currentColor" strokeWidth={0} className="text-white/40" />
                                        )}

                                        {/* Stars Badge */}
                                        {lesson.isCompleted && (
                                          <div className="absolute -top-1 -right-1 bg-slate-900 border border-amber-500 text-amber-400 rounded-full w-8 h-8 flex items-center justify-center font-bold text-xs shadow-md z-20">
                                            {lesson.stars}★
                                          </div>
                                        )}
                                      </button>

                                      {/* Tooltip */}
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-40 text-center pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className={`text-xs font-bold py-2 px-3 rounded-xl shadow-xl ${
                                          lesson.isLocked ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-900'
                                        }`}>
                                          {lesson.title}
                                        </div>
                                      </div>
                                   </div>
                                 );
                              })}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4"
                      >
                        <div className="relative mb-8">
                           <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full"></div>
                           <div className="relative w-32 h-32 bg-slate-800 rounded-3xl border border-slate-700 flex items-center justify-center shadow-2xl rotate-3">
                              <Construction size={48} className="text-indigo-400" />
                              <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-slate-700 p-2 rounded-xl">
                                <Clock size={20} className="text-amber-400" />
                              </div>
                           </div>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-3">
                          Poziom {currentLevel} <span className="text-indigo-400">Wkrótce</span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-md leading-relaxed">
                          Nasi eksperci i sztuczna inteligencja wciąż pracują nad materiałami dla tego poziomu. 
                          <br/><br/>
                          <span className="text-white font-semibold">Sprawdź poziom A1</span>, który jest już w pełni dostępny!
                        </p>
                        <button 
                          onClick={() => setCurrentLevel('A1')}
                          className="mt-8 bg-indigo-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all hover:scale-105"
                        >
                          Przejdź do A1
                        </button>
                      </motion.div>
                    )}

                  </main>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;