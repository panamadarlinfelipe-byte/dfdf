
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EMOJIS, GAME_DURATION_S, OPTIONS_COUNT } from './constants';
import { useSounds } from './hooks/useSounds';
import { SoundOnIcon, SoundOffIcon } from './components/Icons';

// --- TIPOS ---
type GameState = 'idle' | 'playing' | 'over';
interface Round {
  target: string;
  options: string[];
}
type Feedback = { index: number; type: 'correct' | 'incorrect' } | null;

// --- FUNCIONES AUXILIARES ---

// Baraja un array de forma aleatoria (algoritmo Fisher-Yates)
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Genera una nueva ronda del juego
const generateRound = (): Round => {
  const shuffledEmojis = shuffleArray(EMOJIS);
  const roundEmojis = shuffledEmojis.slice(0, OPTIONS_COUNT);
  const target = roundEmojis[Math.floor(Math.random() * OPTIONS_COUNT)];
  const options = shuffleArray(roundEmojis);
  return { target, options };
};

// --- COMPONENTES DE UI (definidos fuera para evitar re-creación) ---

interface GameHeaderProps {
  score: number;
  timeLeft: number;
  highScore: number;
}
const GameHeader: React.FC<GameHeaderProps> = React.memo(({ score, timeLeft, highScore }) => (
  <header className="w-full grid grid-cols-3 gap-2 md:gap-4 text-center text-slate-700 p-2 md:p-4 rounded-t-2xl bg-white/50">
    <div>
      <div className="text-sm md:text-xl font-semibold text-slate-500">PUNTAJE</div>
      <div aria-live="polite" className="text-2xl md:text-4xl font-bold">{score}</div>
    </div>
    <div>
      <div className="text-sm md:text-xl font-semibold text-slate-500">TIEMPO</div>
      <div aria-live="polite" className="text-2xl md:text-4xl font-bold text-yellow-600">{timeLeft}</div>
    </div>
    <div>
      <div className="text-sm md:text-xl font-semibold text-slate-500">MEJOR</div>
      <div className="text-2xl md:text-4xl font-bold">{highScore}</div>
    </div>
  </header>
));

interface TargetEmojiProps {
  emoji: string;
}
const TargetEmoji: React.FC<TargetEmojiProps> = React.memo(({ emoji }) => (
    <div className="flex flex-col items-center justify-center my-4 md:my-8">
        <p className="text-lg md:text-2xl font-semibold text-slate-600 mb-2">Encuentra este emoji:</p>
        <div className="text-6xl md:text-8xl p-4 bg-white/60 rounded-full shadow-lg">
            {emoji}
        </div>
    </div>
));

interface EmojiButtonProps {
    emoji: string;
    onClick: () => void;
    feedbackType: 'correct' | 'incorrect' | null;
}
const EmojiButton: React.FC<EmojiButtonProps> = ({ emoji, onClick, feedbackType }) => {
    const baseClasses = "w-20 h-20 md:w-24 md:h-24 text-5xl md:text-6xl flex items-center justify-center rounded-2xl shadow-lg transition-all duration-200 transform focus:outline-none focus:ring-4 focus:ring-blue-400";
    
    const feedbackClasses = useMemo(() => {
        if (feedbackType === 'correct') return 'bg-green-400 scale-110 animate-pulse';
        if (feedbackType === 'incorrect') return 'bg-red-400 animate-shake';
        return 'bg-white hover:bg-yellow-100 active:scale-95';
    }, [feedbackType]);
    
    return (
        <button
            onClick={onClick}
            aria-label={`Emoji: ${emoji}`}
            className={`${baseClasses} ${feedbackClasses}`}
        >
            {emoji}
        </button>
    );
};

interface EmojiGridProps {
  options: string[];
  onEmojiClick: (emoji: string, index: number) => void;
  feedback: Feedback;
}
const EmojiGrid: React.FC<EmojiGridProps> = React.memo(({ options, onEmojiClick, feedback }) => (
    <div className="grid grid-cols-4 gap-3 md:gap-4 p-4">
        {options.map((emoji, index) => (
            <EmojiButton
                key={`${emoji}-${index}`}
                emoji={emoji}
                onClick={() => onEmojiClick(emoji, index)}
                feedbackType={feedback && feedback.index === index ? feedback.type : null}
            />
        ))}
    </div>
));

interface GameOverlayProps {
    gameState: GameState;
    score: number;
    onStart: () => void;
}
const GameOverlay: React.FC<GameOverlayProps> = ({ gameState, score, onStart }) => {
    if (gameState === 'playing') return null;

    return (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10 text-white text-center p-8 rounded-2xl">
            {gameState === 'idle' && (
                <>
                    <h2 className="text-5xl md:text-7xl font-bold drop-shadow-lg mb-2">Toca el Emoji</h2>
                    <p className="text-xl md:text-2xl mb-8">Encuentra los emojis correctos en {GAME_DURATION_S} segundos.</p>
                    <button onClick={onStart} className="px-10 py-5 bg-green-500 hover:bg-green-600 rounded-full text-3xl font-bold shadow-xl transition-transform transform hover:scale-105">
                        ¡Jugar!
                    </button>
                </>
            )}
            {gameState === 'over' && (
                <>
                    <h2 className="text-5xl font-bold drop-shadow-lg mb-2">¡Tiempo!</h2>
                    <p className="text-2xl mb-4">Tu puntaje final es:</p>
                    <p className="text-8xl font-bold mb-8">{score}</p>
                    <button onClick={onStart} className="px-8 py-4 bg-blue-500 hover:bg-blue-600 rounded-full text-2xl font-bold shadow-xl transition-transform transform hover:scale-105">
                        Jugar de Nuevo
                    </button>
                </>
            )}
        </div>
    );
};

// --- COMPONENTE PRINCIPAL DE LA APP ---
export default function App() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('emojiGameHighScore') || '0'));
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_S);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [currentRound, setCurrentRound] = useState<Round>(generateRound());
  const [feedback, setFeedback] = useState<Feedback>(null);

  const { isMuted, toggleMute, playCorrectSound, playIncorrectSound, playGameOverSound, initializeAudio } = useSounds();

  // Efecto para manejar el temporizador del juego
  useEffect(() => {
    if (gameState !== 'playing') return;

    if (timeLeft === 0) {
      setGameState('over');
      playGameOverSound();
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('emojiGameHighScore', score.toString());
      }
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, timeLeft, score, highScore, playGameOverSound]);


  // Función para iniciar o reiniciar el juego
  const startGame = useCallback(() => {
    initializeAudio();
    setScore(0);
    setTimeLeft(GAME_DURATION_S);
    setCurrentRound(generateRound());
    setGameState('playing');
  }, [initializeAudio]);

  // Manejador del clic en un emoji
  const handleEmojiClick = useCallback((clickedEmoji: string, index: number) => {
    if (gameState !== 'playing' || feedback) return;

    if (clickedEmoji === currentRound.target) {
      setScore(prev => prev + 1);
      playCorrectSound();
      setFeedback({ index, type: 'correct' });
      if (navigator.vibrate) navigator.vibrate(50);

      setTimeout(() => {
        setCurrentRound(generateRound());
        setFeedback(null);
      }, 300);
    } else {
      playIncorrectSound();
      setFeedback({ index, type: 'incorrect' });
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      
      setTimeout(() => {
        setFeedback(null);
      }, 500);
    }
  }, [gameState, currentRound.target, playCorrectSound, playIncorrectSound, feedback]);
  
  return (
    <div className="w-[95vw] h-[95vh] bg-sky-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative touch-manipulation font-sans select-none animate-fade-in">
        <style>{`
          @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-5px); } 40%, 80% { transform: translateX(5px); } }
          .animate-shake { animation: shake 0.5s ease-in-out; }
          @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
          .animate-fade-in { animation: fade-in 0.5s ease-out; }
        `}</style>
        
        <GameOverlay gameState={gameState} score={score} onStart={startGame} />
        
        <GameHeader score={score} timeLeft={timeLeft} highScore={highScore} />

        <main className="flex-grow flex flex-col items-center justify-start overflow-auto p-2">
            {gameState === 'playing' && (
                <>
                    <TargetEmoji emoji={currentRound.target} />
                    <EmojiGrid options={currentRound.options} onEmojiClick={handleEmojiClick} feedback={feedback} />
                </>
            )}
        </main>

        <footer className="w-full flex justify-between items-center p-2 md:p-4 bg-white/50 rounded-b-2xl">
            <button
                onClick={startGame}
                className="px-4 py-2 text-lg md:px-6 md:py-3 md:text-xl font-bold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 transition-colors"
            >
                Reiniciar
            </button>
            <button
                onClick={toggleMute}
                aria-label={isMuted ? "Activar sonido" : "Silenciar sonido"}
                className="p-3 bg-orange-400 text-white rounded-full shadow-md hover:bg-orange-500 transition-colors"
            >
                {isMuted ? <SoundOffIcon className="w-6 h-6 md:w-8 md:h-8" /> : <SoundOnIcon className="w-6 h-6 md:w-8 md:h-8" />}
            </button>
        </footer>
    </div>
  );
}
