
import React, { useState, useEffect } from 'react';
import { Exercise, ExerciseType } from '../types';
import { Check, X, Volume2, Mic, AlertCircle, RefreshCw, Keyboard, MicOff, ArrowRight } from 'lucide-react';
import { generateConversationResponse } from '../services/geminiService';

interface PracticeEngineProps {
  exercises: Exercise[];
  onComplete: (score: number) => void;
  onExit: () => void;
  lessonTitle: string;
}

// Helper to shuffle array
const shuffle = (array: any[]) => {
  return [...array].sort(() => Math.random() - 0.5);
};

const PracticeEngine: React.FC<PracticeEngineProps> = ({ exercises, onComplete, onExit, lessonTitle }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // General State
  const [textInput, setTextInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  
  // Audio/Mic State
  const [isRecording, setIsRecording] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false); 
  const [micError, setMicError] = useState<string | null>(null);

  // AI State
  const [aiChatHistory, setAiChatHistory] = useState<{ role: 'user' | 'model', parts: { text: string }[], isError?: boolean }[]>([]);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiCorrection, setAiCorrection] = useState<string | null>(null);

  // Reorder Words State
  const [wordBank, setWordBank] = useState<string[]>([]);
  const [constructedSentence, setConstructedSentence] = useState<string[]>([]);

  // Match Pairs State
  const [matchPairsLeft, setMatchPairsLeft] = useState<string[]>([]);
  const [matchPairsRight, setMatchPairsRight] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]); // Stores solved 'keys' (left side)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null); // Currently selected item text

  const currentExercise = exercises[currentIndex];
  const progress = ((currentIndex) / exercises.length) * 100;

  useEffect(() => {
    // Reset state on new exercise
    setShowManualInput(false);
    setMicError(null);
    setTextInput('');
    setSelectedOption(null);
    setIsChecked(false);
    setIsCorrect(false);
    setFeedback('');
    
    // Initialize specific exercise states
    if (currentExercise.type === ExerciseType.REORDER_WORDS) {
      setWordBank(shuffle(currentExercise.options || []));
      setConstructedSentence([]);
    }

    if (currentExercise.type === ExerciseType.MATCH_PAIRS) {
      const correctMap = currentExercise.correctAnswer as { [key: string]: string };
      const left = Object.keys(correctMap);
      const right = Object.values(correctMap);
      setMatchPairsLeft(shuffle(left));
      setMatchPairsRight(shuffle(right));
      setMatchedPairs([]);
      setSelectedMatchId(null);
    }

  }, [currentIndex, currentExercise]);

  const playAudio = (text: string) => {
    if (text.startsWith("⚠️")) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  };

  const handleMatchPairClick = (text: string, side: 'left' | 'right') => {
    if (isChecked) return; // Locked after check

    // If clicking something already solved, ignore
    const correctMap = currentExercise.correctAnswer as { [key: string]: string };
    // Check if 'text' is a solved key or a solved value
    const isSolved = matchedPairs.some(key => key === text || correctMap[key] === text);
    if (isSolved) return;

    if (!selectedMatchId) {
      // First selection
      setSelectedMatchId(text);
    } else {
      // Second selection - try to match
      const firstText = selectedMatchId;
      const secondText = text;
      
      let isMatch = false;
      let matchedKey = '';

      // Check if one is key and other is value
      if (correctMap[firstText] === secondText) {
        isMatch = true;
        matchedKey = firstText;
      } else if (correctMap[secondText] === firstText) {
        isMatch = true;
        matchedKey = secondText;
      }

      if (isMatch) {
        setMatchedPairs(prev => [...prev, matchedKey]);
        playAudio(matchedKey); // Optional: read the English word
        setSelectedMatchId(null);
      } else {
        // No match - allow re-select immediately or just deselect
        // User UX: maybe flash red? For now just switch selection or deselect
        if (firstText === secondText) {
          setSelectedMatchId(null); // Deselect if clicked same
        } else {
          setSelectedMatchId(text); // Switch selection to new item
        }
      }
    }
  };

  // Check if all pairs are matched
  useEffect(() => {
    if (currentExercise.type === ExerciseType.MATCH_PAIRS) {
      const totalPairs = Object.keys(currentExercise.correctAnswer).length;
      if (matchedPairs.length === totalPairs && !isChecked) {
        // Auto-complete or let user click check?
        // Let's let user click check to feel satisfaction, or auto-check
        // For consistency with other exercises, we wait for Check button, 
        // OR we can enable the check button.
      }
    }
  }, [matchedPairs, currentExercise, isChecked]);


  const handleCheck = async () => {
    if (currentExercise.type === ExerciseType.AI_CONVERSATION) return;

    let correct = false;
    const cleanInput = textInput.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
    
    switch (currentExercise.type) {
      case ExerciseType.MULTIPLE_CHOICE:
      case ExerciseType.LISTENING_CHOOSE:
      case ExerciseType.TRUE_FALSE:
        correct = selectedOption === currentExercise.correctAnswer;
        break;
      
      case ExerciseType.TRANSLATE_PL_EN:
      case ExerciseType.TRANSLATE_EN_PL:
      case ExerciseType.FILL_BLANK:
        if (Array.isArray(currentExercise.correctAnswer)) {
            correct = currentExercise.correctAnswer.some(ans => ans.toLowerCase().trim() === cleanInput);
        } else {
            correct = (currentExercise.correctAnswer as string).toLowerCase().trim() === cleanInput;
        }
        break;

      case ExerciseType.REORDER_WORDS:
        const sentence = constructedSentence.join(' ');
        const targetSentence = currentExercise.correctAnswer as string;
        // Simple comparison ignoring punctuation nuances usually, but strict here
        correct = sentence.trim() === targetSentence.trim() || 
                  sentence.replace(/[.,?!]/g, '') === targetSentence.replace(/[.,?!]/g, '');
        break;
      
      case ExerciseType.PRONUNCIATION:
        const target = (currentExercise.correctAnswer as string).toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
        if (cleanInput.includes(target) || target.includes(cleanInput)) {
            correct = true;
        } else if (cleanInput.length > 0) {
            correct = cleanInput.length > 3 && Math.abs(cleanInput.length - target.length) < 5; 
        }
        break;

      case ExerciseType.MATCH_PAIRS:
         // Correct if all pairs found
         const totalPairs = Object.keys(currentExercise.correctAnswer).length;
         correct = matchedPairs.length === totalPairs;
         break;

      default:
        correct = true;
    }

    setIsCorrect(correct);
    setIsChecked(true);
    
    if (correct) {
      setScore(s => s + 10);
      playAudio("Correct!");
      setFeedback("Świetnie! Dobra robota.");
    } else {
      playAudio("Incorrect.");
      let correctAns = currentExercise.correctAnswer;
      if (currentExercise.type === ExerciseType.MATCH_PAIRS) {
         setFeedback("Musisz połączyć wszystkie pary.");
      } else {
         if (Array.isArray(correctAns)) correctAns = correctAns[0];
         if (typeof correctAns === 'object') correctAns = "Zestaw par"; // Should not happen for others
         setFeedback(`Błąd. Prawidłowa odpowiedź: ${correctAns}`);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete(score);
    }
  };

  const handleAiSend = async () => {
    if (!textInput.trim()) return;
    
    setAiProcessing(true);
    const newHistoryEntry = { role: 'user' as const, parts: [{ text: textInput }] };
    
    const currentHistory = [...aiChatHistory, newHistoryEntry];
    setAiChatHistory(currentHistory);
    setTextInput(''); 

    const historyForApi = currentHistory.map(h => ({ role: h.role, parts: h.parts }));

    const response = await generateConversationResponse(historyForApi, newHistoryEntry.parts[0].text, lessonTitle);
    
    setAiChatHistory(prev => [
      ...prev, 
      { 
        role: 'model' as const, 
        parts: [{ text: response.text }],
        isError: response.isError 
      }
    ]);

    setAiCorrection(response.correction || null);
    
    if (!response.isError) {
      playAudio(response.text);
    }
    
    setAiProcessing(false);
  };

  const toggleRecording = () => {
    setMicError(null);
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError("Twoja przeglądarka nie obsługuje tej funkcji.");
      setShowManualInput(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsRecording(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript;
        setTextInput(prev => prev ? prev + " " + speechResult : speechResult); // Append or set
        setIsRecording(false);
        setMicError(null);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicError("🚫 Dostęp do mikrofonu zablokowany.");
          setShowManualInput(true);
        } else if (event.error === 'no-speech') {
          setMicError("🔇 Nie słychać. Spróbuj głośniej.");
        } else {
          setMicError(`⚠️ Błąd mikrofonu: ${event.error}`);
          setShowManualInput(true);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };
    } catch (e) {
      setMicError("Błąd inicjalizacji mikrofonu.");
      setShowManualInput(true);
      setIsRecording(false);
    }
  };

  const renderContent = () => {
    switch (currentExercise.type) {
      case ExerciseType.MULTIPLE_CHOICE:
      case ExerciseType.LISTENING_CHOOSE:
      case ExerciseType.TRUE_FALSE:
        return (
          <div className="space-y-4">
            {currentExercise.type === ExerciseType.LISTENING_CHOOSE && (
               <button onClick={() => playAudio(currentExercise.audioText || "")} className="w-full py-6 sm:py-8 bg-indigo-100 rounded-2xl mb-4 flex justify-center items-center text-indigo-600 hover:bg-indigo-200 transition">
                  <Volume2 size={48} />
               </button>
            )}
            <div className={`grid gap-3 ${currentExercise.type === ExerciseType.TRUE_FALSE ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {currentExercise.options?.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => !isChecked && setSelectedOption(opt)}
                  disabled={isChecked}
                  className={`p-3 sm:p-4 rounded-xl border-2 font-medium text-base sm:text-lg transition-all text-slate-800 ${
                    selectedOption === opt
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );

      case ExerciseType.TRANSLATE_PL_EN:
      case ExerciseType.TRANSLATE_EN_PL:
      case ExerciseType.FILL_BLANK:
        return (
          <div className="space-y-4">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={isChecked}
              placeholder={currentExercise.type === ExerciseType.TRANSLATE_EN_PL ? "Wpisz tłumaczenie po polsku..." : "Wpisz odpowiedź po angielsku..."}
              className="w-full p-4 text-lg sm:text-xl border-2 border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-none min-h-[120px] text-slate-900 placeholder:text-slate-400 bg-white"
            />
          </div>
        );

      case ExerciseType.REORDER_WORDS:
        return (
          <div className="space-y-6">
            {/* Sentence Construction Area */}
            <div className="min-h-[60px] p-4 bg-slate-100 rounded-xl border-b-4 border-slate-200 flex flex-wrap gap-2 items-center">
               {constructedSentence.length === 0 && <span className="text-slate-400 text-sm italic">Kliknij słowa poniżej, aby ułożyć zdanie...</span>}
               {constructedSentence.map((word, idx) => (
                 <button 
                  key={`${word}-${idx}`} 
                  disabled={isChecked}
                  onClick={() => {
                    setConstructedSentence(prev => prev.filter((_, i) => i !== idx));
                    setWordBank(prev => [...prev, word]);
                  }}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm text-slate-900 font-bold hover:bg-red-50 hover:border-red-200 transition-colors"
                 >
                   {word}
                 </button>
               ))}
            </div>

            {/* Word Bank */}
            <div className="flex flex-wrap gap-2 justify-center">
               {wordBank.map((word, idx) => (
                 <button 
                  key={`${word}-${idx}`}
                  disabled={isChecked}
                  onClick={() => {
                    setWordBank(prev => prev.filter((_, i) => i !== idx));
                    setConstructedSentence(prev => [...prev, word]);
                  }} 
                  className="px-4 py-2 bg-slate-50 border border-slate-300 border-b-4 rounded-xl text-slate-800 font-bold shadow-sm active:border-b-0 active:translate-y-1 transition-all hover:bg-indigo-50"
                 >
                   {word}
                 </button>
               ))}
            </div>
            
            <div className="flex justify-end">
               <button 
                onClick={() => {
                  setWordBank([...wordBank, ...constructedSentence]);
                  setConstructedSentence([]);
                }}
                disabled={constructedSentence.length === 0 || isChecked}
                className="text-xs text-slate-400 font-bold uppercase tracking-wider hover:text-slate-600"
               >
                 Wyczyść wszystko
               </button>
            </div>
          </div>
        );

      case ExerciseType.PRONUNCIATION:
        return (
          <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 py-4 sm:py-6">
             <button onClick={() => playAudio(currentExercise.audioText || "")} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-200 transition shadow-inner">
                <Volume2 size={28} className="sm:w-8 sm:h-8" />
             </button>
             
             <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Naciśnij mikrofon i powiedz:</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 px-2 break-words">"{currentExercise.audioText}"</p>
             </div>

             {micError && (
                 <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-100 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                     <AlertCircle size={16} />
                     {micError}
                 </div>
             )}

             {!showManualInput ? (
                <div className="relative">
                    <button 
                      onClick={toggleRecording}
                      disabled={isChecked}
                      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isRecording 
                          ? 'bg-red-500 text-white animate-pulse shadow-red-300 shadow-xl scale-110' 
                          : 'bg-indigo-600 text-white shadow-indigo-300 shadow-xl hover:scale-105'
                      }`}
                    >
                      {isRecording ? <MicOff size={32} className="sm:w-10 sm:h-10" /> : <Mic size={32} className="sm:w-10 sm:h-10" />}
                    </button>
                </div>
             ) : (
                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-2">
                    <label className="block text-xs text-slate-400 font-bold uppercase tracking-wide mb-2 text-center">Wpisz to co mówisz</label>
                    <input 
                      type="text" 
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Tutaj wpisz tekst..."
                      className="w-full p-3 border-2 border-indigo-200 bg-indigo-50 rounded-xl text-center text-lg text-indigo-900 focus:border-indigo-500 focus:outline-none"
                    />
                </div>
             )}

             {textInput && !showManualInput && (
               <div className="bg-green-50 px-6 py-3 rounded-xl border border-green-200 shadow-sm">
                 <p className="text-green-600 text-xs uppercase font-bold mb-1">Rozpoznano:</p>
                 <p className="text-lg text-slate-800 font-medium break-words">"{textInput}"</p>
               </div>
             )}

             <button 
                onClick={() => setShowManualInput(!showManualInput)}
                className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors text-sm py-2 px-4 rounded-lg hover:bg-indigo-50"
             >
                <Keyboard size={16} />
                {showManualInput ? "Wróć do mikrofonu" : "Mikrofon nie działa? Wpisz ręcznie"}
             </button>
          </div>
        );

      case ExerciseType.MATCH_PAIRS:
        return (
           <div className="grid grid-cols-2 gap-4 sm:gap-6 py-2">
              <div className="space-y-3">
                 {matchPairsLeft.map(text => {
                   const correctMap = currentExercise.correctAnswer as { [key: string]: string };
                   const isSolved = matchedPairs.includes(text);
                   const isSelected = selectedMatchId === text;
                   
                   return (
                     <button
                       key={text}
                       disabled={isSolved || isChecked}
                       onClick={() => handleMatchPairClick(text, 'left')}
                       className={`w-full p-4 rounded-xl font-bold text-sm sm:text-base shadow-sm transition-all border-b-4 ${
                         isSolved 
                           ? 'bg-green-100 text-green-700 border-green-200 opacity-50 cursor-default'
                           : isSelected
                             ? 'bg-indigo-100 text-indigo-800 border-indigo-300 translate-y-1 border-b-0 mb-[4px]'
                             : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 active:translate-y-1 active:border-b-0 active:mb-[4px]'
                       }`}
                     >
                       {text}
                     </button>
                   )
                 })}
              </div>
              <div className="space-y-3">
                 {matchPairsRight.map(text => {
                   const correctMap = currentExercise.correctAnswer as { [key: string]: string };
                   // Find Key for this Value
                   const myKey = Object.keys(correctMap).find(key => correctMap[key] === text);
                   const isSolved = myKey ? matchedPairs.includes(myKey) : false;
                   const isSelected = selectedMatchId === text;
                   
                   return (
                     <button
                       key={text}
                       disabled={isSolved || isChecked}
                       onClick={() => handleMatchPairClick(text, 'right')}
                       className={`w-full p-4 rounded-xl font-bold text-sm sm:text-base shadow-sm transition-all border-b-4 ${
                        isSolved 
                          ? 'bg-green-100 text-green-700 border-green-200 opacity-50 cursor-default'
                          : isSelected
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-300 translate-y-1 border-b-0 mb-[4px]'
                            : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 active:translate-y-1 active:border-b-0 active:mb-[4px]'
                      }`}
                     >
                       {text}
                     </button>
                   )
                 })}
              </div>
           </div>
        );
      
      case ExerciseType.AI_CONVERSATION:
        return (
          <div className="flex flex-col h-full max-h-[500px]">
            <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl p-4 space-y-3 mb-4 border border-slate-200 min-h-[200px]">
              {aiChatHistory.length === 0 && (
                <div className="text-center text-slate-400 mt-10">
                  <p>Powiedz "Hello" aby zacząć!</p>
                </div>
              )}
              {aiChatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : msg.isError 
                        ? 'bg-red-50 text-red-600 border border-red-200 rounded-bl-none shadow-sm flex items-start gap-2'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                  }`}>
                    {msg.isError && <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                    <span>{msg.parts[0].text}</span>
                  </div>
                </div>
              ))}
              {aiCorrection && !aiProcessing && (
                <div className="flex justify-center animate-in fade-in slide-in-from-bottom-2">
                    <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm font-medium">
                        💡 Korekta: {aiCorrection}
                    </span>
                </div>
              )}
               {aiProcessing && <div className="text-slate-400 text-sm text-center animate-pulse">AI pisze...</div>}
            </div>

            {micError && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg border border-red-100 text-xs font-medium mb-2 animate-in fade-in">
                  <AlertCircle size={14} />
                  {micError}
              </div>
            )}
            
            <div className="flex gap-2 items-center">
              <button
                onClick={toggleRecording}
                disabled={aiProcessing}
                className={`p-3 rounded-xl transition-all duration-300 flex-shrink-0 shadow-sm ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse shadow-red-200' 
                    : 'bg-white border border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                }`}
                title="Mów do mikrofonu"
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <input 
                type="text" 
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
                placeholder={isRecording ? "Słucham..." : "Napisz lub powiedz coś..."}
                disabled={aiProcessing}
                className="flex-1 border border-slate-300 rounded-xl px-4 py-2 focus:outline-indigo-500 disabled:bg-slate-100 text-slate-900"
              />
              <button 
                onClick={handleAiSend}
                disabled={aiProcessing || !textInput.trim()}
                className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-sm"
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        );

      default:
        return <div>Unsupported type</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <button onClick={onExit} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
          <div className="flex-1 mx-4 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-bold text-slate-400 text-sm">{score} XP</span>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 md:p-8 flex-1 overflow-y-auto min-h-0 flex flex-col">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4 sm:mb-6 leading-tight">{currentExercise.question}</h2>
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 sm:p-6 border-t shrink-0 ${isChecked ? (isCorrect ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200') : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1">
               {isChecked && (
                 <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                     {isCorrect ? <Check size={24} /> : <X size={24} />}
                   </div>
                   <div>
                     <p className={`font-bold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                       {isCorrect ? 'Doskonale!' : 'Ups...'}
                     </p>
                     <p className="text-sm text-slate-600 line-clamp-2">{feedback}</p>
                   </div>
                 </div>
               )}
               {currentExercise.type === ExerciseType.AI_CONVERSATION && (
                   <div className="text-slate-500 text-sm">Gdy skończysz rozmowę, kliknij Dalej.</div>
               )}
            </div>
            
            {!isChecked && currentExercise.type !== ExerciseType.AI_CONVERSATION ? (
              <button 
                onClick={handleCheck}
                disabled={
                  (currentExercise.type !== ExerciseType.MATCH_PAIRS && currentExercise.type !== ExerciseType.PRONUNCIATION && currentExercise.type !== ExerciseType.REORDER_WORDS && !selectedOption && !textInput)
                }
                className="bg-indigo-600 text-white font-bold py-3 px-6 sm:px-8 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-500 disabled:opacity-50 disabled:shadow-none transition-all transform hover:scale-105 whitespace-nowrap"
              >
                SPRAWDŹ
              </button>
            ) : (
              <button 
                onClick={handleNext}
                className={`font-bold py-3 px-6 sm:px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 whitespace-nowrap ${
                  isCorrect || currentExercise.type === ExerciseType.AI_CONVERSATION
                    ? 'bg-green-600 text-white shadow-green-200 hover:bg-green-500' 
                    : 'bg-red-600 text-white shadow-red-200 hover:bg-red-500'
                }`}
              >
                DALEJ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeEngine;
