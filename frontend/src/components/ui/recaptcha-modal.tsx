import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Headphones, Info, Check, Play, Square, Volume2, Grid } from 'lucide-react';

interface RecaptchaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifySuccess: () => void;
}

interface PhotoChallenge {
  prompt: string;
  keyword: string;
  imageSrc: string;
  // Slices (0 to 8, where index = row * 3 + col)
  matchingTiles: number[];
}

const CHALLENGES: PhotoChallenge[] = [
  {
    prompt: 'traffic lights',
    keyword: 'traffic light',
    imageSrc: '/captcha/challenge_traffic_light.jpg',
    matchingTiles: [1, 4],
  },
  {
    prompt: 'fire hydrants',
    keyword: 'fire hydrant',
    imageSrc: '/captcha/challenge_fire_hydrant.jpg',
    matchingTiles: [4, 7],
  },
  {
    prompt: 'bicycles',
    keyword: 'bicycle',
    imageSrc: '/captcha/challenge_bicycle.jpg',
    matchingTiles: [3, 4, 5, 6, 7, 8],
  },
  {
    prompt: 'crosswalks',
    keyword: 'crosswalk',
    imageSrc: '/captcha/challenge_crosswalk.jpg',
    matchingTiles: [4, 5, 7, 8],
  },
  {
    prompt: 'buses',
    keyword: 'bus',
    imageSrc: '/captcha/challenge_bus.jpg',
    matchingTiles: [3, 4, 6, 7],
  },
];

function generateRandomAudioCode(): string {
  // Generate 5 random single digits
  return Math.floor(10000 + Math.random() * 90000).toString();
}

export const RecaptchaModal: React.FC<RecaptchaModalProps> = ({
  isOpen,
  onClose,
  onVerifySuccess,
}) => {
  const [mode, setMode] = useState<'visual' | 'audio'>('visual');
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Audio challenge state
  const [audioCode, setAudioCode] = useState(() => generateRandomAudioCode());
  const [audioInput, setAudioInput] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      setAudioInput('');
      setErrorMessage('');
      setShowInfo(false);
      setMode('visual');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentChallenge = CHALLENGES[challengeIdx % CHALLENGES.length];

  const handleTileClick = (index: number) => {
    setErrorMessage('');
    if (selectedTiles.includes(index)) {
      setSelectedTiles(selectedTiles.filter((i) => i !== index));
    } else {
      setSelectedTiles([...selectedTiles, index]);
    }
  };

  const handleNextChallenge = () => {
    setErrorMessage('');
    if (mode === 'visual') {
      setSelectedTiles([]);
      setChallengeIdx((prev) => prev + 1);
    } else {
      const newCode = generateRandomAudioCode();
      setAudioCode(newCode);
      setAudioInput('');
      playAudio(newCode);
    }
  };

  const playAudio = (codeToPlay?: string) => {
    const code = codeToPlay || audioCode;
    if (!('speechSynthesis' in window)) {
      setErrorMessage('Audio is not supported in this browser.');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(true);
      setErrorMessage('');

      // Formulate clear security speech format
      const digitsList = code.split('').join(' . . . ');
      const utterance = new SpeechSynthesisUtterance(`Security code: . . ${digitsList}`);
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      utterance.onend = () => {
        setIsPlayingAudio(false);
      };
      utterance.onerror = () => {
        setIsPlayingAudio(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsPlayingAudio(false);
    }
  };

  const stopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  const switchToAudioMode = () => {
    setMode('audio');
    setErrorMessage('');
    const newCode = generateRandomAudioCode();
    setAudioCode(newCode);
    setAudioInput('');
    setTimeout(() => {
      playAudio(newCode);
      audioInputRef.current?.focus();
    }, 150);
  };

  const switchToVisualMode = () => {
    stopAudio();
    setMode('visual');
    setErrorMessage('');
    setSelectedTiles([]);
  };

  const handleVerify = () => {
    if (mode === 'visual') {
      if (selectedTiles.length === 0) {
        setErrorMessage('Please select all squares containing the object before clicking verify.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      setIsVerifying(true);
      setErrorMessage('');

      setTimeout(() => {
        setIsVerifying(false);

        const targetMatches = currentChallenge.matchingTiles;
        const hasWrongTile = selectedTiles.some((tileIdx) => !targetMatches.includes(tileIdx));
        const matchedCount = selectedTiles.filter((tileIdx) => targetMatches.includes(tileIdx)).length;
        const requiredCount = targetMatches.length;

        const isCorrect = !hasWrongTile && matchedCount === requiredCount;

        if (isCorrect) {
          onVerifySuccess();
          onClose();
        } else {
          setErrorMessage('Incorrect. Please try again with the new image below.');
          setShake(true);
          setTimeout(() => setShake(false), 500);
          setSelectedTiles([]);
          setChallengeIdx((prev) => prev + 1);
        }
      }, 600);
    } else {
      // Audio verification
      const cleanInput = audioInput.trim().replace(/\s+/g, '');
      if (!cleanInput) {
        setErrorMessage('Please enter the numbers you heard.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      setIsVerifying(true);
      setErrorMessage('');

      setTimeout(() => {
        setIsVerifying(false);
        if (cleanInput === audioCode) {
          stopAudio();
          onVerifySuccess();
          onClose();
        } else {
          const newCode = generateRandomAudioCode();
          setAudioCode(newCode);
          setAudioInput('');
          setErrorMessage('Incorrect code. Please listen to the new audio challenge.');
          setShake(true);
          setTimeout(() => setShake(false), 500);
          playAudio(newCode);
        }
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className={`bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-[360px] overflow-hidden select-none animate-scale-up text-left transition-transform ${shake ? 'animate-bounce' : ''}`}>
        
        {/* Challenge Header */}
        <div className="bg-[#1A73E8] p-4 text-white">
          {mode === 'visual' ? (
            <>
              <p className="text-[12px] font-medium leading-tight opacity-95">
                Select all squares with
              </p>
              <h4 className="text-xl font-extrabold capitalize mt-0.5 tracking-tight">
                {currentChallenge.prompt}
              </h4>
              <p className="text-[11px] opacity-85 mt-1 leading-snug">
                Click all matching parts, then click VERIFY.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-white animate-pulse" />
                <h4 className="text-lg font-extrabold tracking-tight">
                  Audio Challenge
                </h4>
              </div>
              <p className="text-[11px] opacity-90 mt-1 leading-snug">
                Press PLAY, listen carefully, and type the numbers you hear below.
              </p>
            </>
          )}
        </div>

        {/* Content Area */}
        {showInfo ? (
          <div className="p-4 bg-slate-50 space-y-3 animate-fade-in text-xs text-slate-600">
            <div className="flex items-center gap-2 text-[#1A73E8] font-bold text-sm">
              <Info className="w-4 h-4" />
              <span>About reCAPTCHA Security</span>
            </div>
            <p className="leading-relaxed">
              This security challenge verifies that you are a real resident and prevents automated bot scripts from spamming the login system.
            </p>
            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-800 shrink-0">🖼️ Image Mode:</span>
                <span>Select all square tiles that match the challenge prompt.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-800 shrink-0">🎧 Audio Mode:</span>
                <span>Press play to hear the spoken digits, then type them into the box.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="w-full py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold rounded text-xs transition-colors cursor-pointer text-center"
            >
              Back to Challenge
            </button>
          </div>
        ) : mode === 'visual' ? (
          /* 3x3 Sliced Real Photo Grid */
          <div className="p-2.5 bg-slate-100">
            <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-sm border border-slate-300">
              {Array.from({ length: 9 }).map((_, idx) => {
                const row = Math.floor(idx / 3);
                const col = idx % 3;
                const isSelected = selectedTiles.includes(idx);

                // 0% for col 0, 50% for col 1, 100% for col 2
                const posX = col === 0 ? '0%' : col === 1 ? '50%' : '100%';
                const posY = row === 0 ? '0%' : row === 1 ? '50%' : '100%';

                return (
                  <div
                    key={idx}
                    onClick={() => handleTileClick(idx)}
                    className={`relative aspect-square cursor-pointer overflow-hidden transition-all duration-150 ${
                      isSelected ? 'opacity-90 ring-3 ring-inset ring-[#1A73E8]' : 'hover:opacity-95'
                    }`}
                    style={{
                      backgroundImage: `url(${currentChallenge.imageSrc})`,
                      backgroundSize: '300% 300%',
                      backgroundPosition: `${posX} ${posY}`,
                      backgroundRepeat: 'no-repeat',
                    }}
                  >
                    {/* Selection Overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#1A73E8]/25 flex items-center justify-center animate-fade-in">
                        <div className="w-6 h-6 bg-[#1A73E8] text-white rounded-full flex items-center justify-center shadow-md animate-scale-up">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Audio Player and Input Area */
          <div className="p-5 bg-slate-50 space-y-4">
            <div className="bg-white border border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
              <button
                type="button"
                onClick={isPlayingAudio ? stopAudio : () => playAudio()}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                  isPlayingAudio
                    ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                    : 'bg-[#1A73E8] hover:bg-[#1557B0] text-white hover:scale-105'
                }`}
                title={isPlayingAudio ? 'Stop audio' : 'Play audio code'}
              >
                {isPlayingAudio ? (
                  <Square className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5 fill-current" />
                )}
              </button>

              <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-slate-700">
                <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'text-amber-500 animate-bounce' : 'text-slate-400'}`} />
                <span>{isPlayingAudio ? 'Playing numbers...' : 'Click to Play Audio'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enter the numbers heard:
              </label>
              <input
                ref={audioInputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={audioInput}
                onChange={(e) => setAudioInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerify();
                }}
                placeholder="e.g. 54291"
                className="w-full px-3 py-2 text-center text-lg font-mono font-bold tracking-widest bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A73E8] text-slate-800"
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="px-3 py-2 bg-red-50 border-t border-b border-red-200 text-[11px] text-red-600 font-bold text-center animate-fade-in">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Footer controls */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500">
            <button
              type="button"
              onClick={handleNextChallenge}
              title={mode === 'visual' ? 'Get a new challenge' : 'Generate new audio'}
              className="p-1.5 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {mode === 'visual' ? (
              <button
                type="button"
                onClick={switchToAudioMode}
                title="Switch to Audio Challenge"
                className="p-1.5 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              >
                <Headphones className="w-4 h-4 text-[#1A73E8]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={switchToVisualMode}
                title="Switch to Image Challenge"
                className="p-1.5 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              >
                <Grid className="w-4 h-4 text-[#1A73E8]" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              title="Help & Security Info"
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                showInfo ? 'text-[#1A73E8] bg-blue-50' : 'hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopAudio();
                onClose();
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying}
              className="px-5 py-2 bg-[#1A73E8] hover:bg-[#1557B0] active:bg-[#10448A] text-white text-xs font-bold uppercase tracking-wider rounded shadow-sm transition-colors cursor-pointer disabled:opacity-75 flex items-center gap-1.5"
            >
              {isVerifying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying</span>
                </>
              ) : (
                'VERIFY'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

