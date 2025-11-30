
import React, { useState, useEffect } from 'react';
import { Vocabulary, SRSRating } from '../types';
import { Volume2, RotateCw, CheckCircle, BrainCircuit } from 'lucide-react';
import { processCardReview, initializeLessonCards, getDueCards } from '../services/srsService';

interface FlashcardSRSProps {
  vocabulary: Vocabulary[];
  onExit: () => void;
}

const FlashcardSRS: React.FC<FlashcardSRSProps> = ({ vocabulary, onExit }) => {
  const [queue, setQueue] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // 1. Ensure all words exist in DB
    initializeLessonCards(vocabulary);
    // 2. Get only words due for review
    const due = getDueCards(vocabulary);
    setQueue(due);
  }, [vocabulary]);

  const currentCard = queue[currentIndex];

  const playAudio = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  };

  const handleRate = (rating: SRSRating) => {
    if (!currentCard) return;

    // Save progress
    processCardReview(currentCard.en, rating);

    if (currentIndex < queue.length - 1) {
      setIsFlipped(false);
      // Small delay to allow state update before showing next card front
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    } else {
      setIsFinished(true);
    }
  };

  if (queue.length === 0 && !isFinished) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-3xl shadow-xl min-h-[300px] sm:min-h-[400px] animate-in fade-in zoom-in duration-500">
        <CheckCircle size={64} className="text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Wszystko powtórzone!</h2>
        <p className="text-slate-500 mt-2 mb-6">Nie masz na dzisiaj żadnych słówek z tej lekcji do powtórki.</p>
        <button onClick={onExit} className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-indigo-500 transition-colors">Wróć do lekcji</button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-3xl shadow-xl min-h-[300px] sm:min-h-[400px] animate-in fade-in zoom-in duration-500">
        <BrainCircuit size={64} className="text-indigo-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Sesja zakończona</h2>
        <p className="text-slate-500 mt-2 mb-6">Algorytm SRS wyznaczył kolejne powtórki.</p>
        <button onClick={onExit} className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-indigo-500 transition-colors">Wróć do lekcji</button>
      </div>
    );
  }

  if (!currentCard) return <div className="p-12 text-center text-white">Ładowanie...</div>;

  return (
    <div className="max-w-md mx-auto [perspective:1000px] w-full">
      {/* Progress */}
      <div className="flex justify-between text-xs text-slate-400 font-bold mb-4 uppercase tracking-wider px-2">
        <span>Fiszka SRS</span>
        <span>{currentIndex + 1} / {queue.length}</span>
      </div>

      {/* Card Container */}
      <div 
        className="relative w-full h-[320px] sm:h-[400px] cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div 
          className={`relative w-full h-full duration-700 transition-all ease-[cubic-bezier(0.175,0.885,0.32,1.275)] shadow-xl ${isFlipped ? 'shadow-2xl' : ''}`}
          style={{ 
            transformStyle: 'preserve-3d', 
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
          }}
        >
          
          {/* FRONT */}
          <div 
            className="absolute w-full h-full bg-white rounded-3xl flex flex-col items-center justify-center p-6 sm:p-8 border border-slate-100 overflow-hidden backface-hidden"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
             {/* Decorative Background Element */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 opacity-50"></div>
             <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-50 rounded-tr-full -z-0 opacity-50"></div>

             <span className="absolute top-6 left-6 text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full z-10">EN</span>
             
             <div className="z-10 flex flex-col items-center w-full">
               <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 text-center mb-6 sm:mb-8 drop-shadow-sm break-words max-w-full px-2">{currentCard.en}</h2>
               <button 
                 onClick={(e) => playAudio(currentCard.en, e)}
                 className="p-4 sm:p-5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-indigo-500/40 hover:scale-110 transition-all duration-300"
               >
                 <Volume2 size={28} className="sm:w-8 sm:h-8" />
               </button>
             </div>
             
             <div className="absolute bottom-6 sm:bottom-8 flex items-center gap-2 text-slate-400 text-sm font-medium animate-pulse">
                <RotateCw size={16} />
                <span>Kliknij, aby odwrócić</span>
             </div>
          </div>

          {/* BACK */}
          <div 
            className="absolute w-full h-full bg-slate-900 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-6 sm:p-8 text-white backface-hidden border border-slate-700"
            style={{ 
              transform: 'rotateY(180deg)', 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
             <span className="absolute top-6 left-6 text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">PL</span>
             
             <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2 sm:mb-3 tracking-tight break-words max-w-full">{currentCard.pl}</h2>
                <p className="text-indigo-400 font-mono text-base sm:text-lg mb-4 sm:mb-8">{currentCard.phonetic}</p>
                
                <div className="w-full bg-slate-800/80 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-slate-700/50">
                  <p className="text-slate-200 italic text-center text-base sm:text-lg mb-2">"{currentCard.example_en}"</p>
                  <p className="text-slate-500 text-center text-xs sm:text-sm">{currentCard.example_pl}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={`mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 transition-all duration-500 transform ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <button onClick={() => handleRate('again')} className="group flex flex-col items-center gap-1 p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 hover:bg-rose-100 hover:scale-105 transition-all shadow-sm">
          <span className="text-sm sm:text-base font-bold">Again</span>
          <span className="text-[10px] uppercase font-bold opacity-60 group-hover:opacity-100">Powtórz</span>
        </button>
        <button onClick={() => handleRate('hard')} className="group flex flex-col items-center gap-1 p-3 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100 hover:bg-orange-100 hover:scale-105 transition-all shadow-sm">
          <span className="text-sm sm:text-base font-bold">Hard</span>
          <span className="text-[10px] uppercase font-bold opacity-60 group-hover:opacity-100">Trudne</span>
        </button>
        <button onClick={() => handleRate('good')} className="group flex flex-col items-center gap-1 p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 hover:bg-blue-100 hover:scale-105 transition-all shadow-sm">
          <span className="text-sm sm:text-base font-bold">Good</span>
          <span className="text-[10px] uppercase font-bold opacity-60 group-hover:opacity-100">Dobre</span>
        </button>
        <button onClick={() => handleRate('easy')} className="group flex flex-col items-center gap-1 p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 hover:bg-emerald-100 hover:scale-105 transition-all shadow-sm">
          <span className="text-sm sm:text-base font-bold">Easy</span>
          <span className="text-[10px] uppercase font-bold opacity-60 group-hover:opacity-100">Łatwe</span>
        </button>
      </div>
    </div>
  );
};

export default FlashcardSRS;
