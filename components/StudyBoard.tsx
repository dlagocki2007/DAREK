
import React, { useState } from 'react';
import { Lesson } from '../types';
import { Volume2, BookOpen, MessageCircle, Star, BrainCircuit } from 'lucide-react';
import FlashcardSRS from './FlashcardSRS';

interface StudyBoardProps {
  lesson: Lesson;
  onStartPractice: () => void;
}

const StudyBoard: React.FC<StudyBoardProps> = ({ lesson, onStartPractice }) => {
  const [activeTab, setActiveTab] = useState<'vocab' | 'grammar' | 'dialog'>('vocab');
  const [srsMode, setSrsMode] = useState(false);

  const playAudio = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-32 sm:pb-24 animate-in fade-in duration-500 w-full">
      <header className="mb-6 sm:mb-8 text-center">
        <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm font-semibold mb-2">
          {lesson.level} - LEKCJA {lesson.id.replace('l', '')}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{lesson.title}</h1>
        <p className="text-slate-400 text-sm sm:text-base">{lesson.description}</p>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
        {[
          { id: 'vocab', label: 'Słownictwo', icon: <BookOpen size={18} /> },
          { id: 'grammar', label: 'Gramatyka', icon: <Star size={18} /> },
          { id: 'dialog', label: 'Dialogi', icon: <MessageCircle size={18} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setSrsMode(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold transition-all text-sm sm:text-base ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-xl min-h-[300px] sm:min-h-[400px] text-slate-800 relative">
        
        {activeTab === 'vocab' && (
          <>
            {!srsMode ? (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <h2 className="text-2xl font-bold text-slate-800">Lista słów</h2>
                  <button 
                    onClick={() => setSrsMode(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:scale-105 transition-transform"
                  >
                    <BrainCircuit size={20} />
                    Fiszki (SRS)
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {lesson.vocabulary.map((word, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:shadow-lg transition-all duration-300 group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{word.en}</h3>
                          <p className="text-indigo-500 font-mono text-sm font-medium">{word.phonetic}</p>
                        </div>
                        <button 
                          onClick={() => playAudio(word.en)} 
                          className="p-3 bg-white text-indigo-600 rounded-full shadow-sm border border-indigo-100 hover:bg-indigo-600 hover:text-white hover:shadow-md hover:scale-110 transition-all duration-300"
                          aria-label="Odsłuchaj"
                        >
                          <Volume2 size={22} />
                        </button>
                      </div>
                      <p className="text-slate-600 border-b border-slate-200 pb-2 mb-2 font-medium">{word.pl}</p>
                      <div className="text-sm">
                        <p className="text-slate-800 italic">"{word.example_en}"</p>
                        <p className="text-slate-500 text-xs">{word.example_pl}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <FlashcardSRS vocabulary={lesson.vocabulary} onExit={() => setSrsMode(false)} />
            )}
          </>
        )}

        {activeTab === 'grammar' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-indigo-700 border-b pb-2">{lesson.grammar.topic}</h2>
            <p className="text-base sm:text-lg text-slate-700 leading-relaxed bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              {lesson.grammar.explanation}
            </p>
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900">Zasady i Przykłady:</h3>
              {lesson.grammar.rules.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full font-bold flex-shrink-0 text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-indigo-900 mb-1 text-sm sm:text-base">{rule.rule}</p>
                    <p className="text-slate-600 italic text-xs sm:text-sm">Example: {rule.example}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'dialog' && (
          <div className="space-y-8">
            {lesson.dialogs.length === 0 && <p className="text-center text-slate-400">Brak dialogów w tej lekcji.</p>}
            {lesson.dialogs.map((dialog, dIdx) => (
              <div key={dIdx} className="space-y-4 bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Dialog {dIdx + 1}</div>
                {dialog.map((line, lIdx) => (
                  <div key={lIdx} className={`flex gap-3 sm:gap-4 ${line.speaker === 'A' ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full font-bold text-white flex-shrink-0 shadow-md text-sm sm:text-base ${line.speaker === 'A' ? 'bg-indigo-500' : 'bg-pink-500'}`}>
                      {line.speaker}
                    </div>
                    <div className={`flex-1 p-3 sm:p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow ${line.speaker === 'A' ? 'bg-white rounded-tl-none border border-slate-200' : 'bg-indigo-50 rounded-tr-none border border-indigo-100'}`}>
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-semibold text-slate-800 text-base sm:text-lg leading-snug">{line.text}</p>
                        <button 
                          onClick={() => playAudio(line.text)} 
                          className="p-1.5 sm:p-2 bg-white/50 text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white hover:scale-110 transition-all duration-300 shadow-sm flex-shrink-0 border border-indigo-100"
                          aria-label="Odsłuchaj"
                        >
                          <Volume2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">{line.translation}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Bottom Action */}
      {!srsMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 p-4 z-20">
          <div className="max-w-4xl mx-auto flex justify-center">
            <button
              onClick={onStartPractice}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg py-4 px-12 rounded-full shadow-lg shadow-indigo-500/40 transform transition hover:scale-105 active:scale-95"
            >
              ROZPOCZNIJ PRAKTYKĘ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyBoard;
