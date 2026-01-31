import confetti from 'canvas-confetti';

// Confetti burst for completions
export function celebrateCompletion() {
  // Quick burst from the center
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#7c3aed', '#fbbf24', '#34d399', '#f472b6', '#60a5fa'],
  });
}

// Big celebration for all chores done
export function celebrateBigWin() {
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#7c3aed', '#fbbf24', '#34d399'],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#7c3aed', '#fbbf24', '#34d399'],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
}

// Star earning animation burst
export function starBurst(x: number, y: number) {
  confetti({
    particleCount: 30,
    startVelocity: 20,
    spread: 360,
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    colors: ['#fbbf24', '#f59e0b', '#fcd34d'],
    shapes: ['circle'],
    gravity: 0.8,
    scalar: 0.8,
  });
}

// Sound effects (base64 encoded short sounds to avoid loading issues)
const sounds = {
  pop: null as HTMLAudioElement | null,
  success: null as HTMLAudioElement | null,
  chime: null as HTMLAudioElement | null,
};

// Initialize sounds lazily
function getSound(name: keyof typeof sounds): HTMLAudioElement | null {
  if (!sounds[name]) {
    try {
      // Use Web Audio API for simple tones
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (name === 'pop') {
        // Short pop sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 600;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      }
    } catch (e) {
      // Audio not supported, fail silently
    }
  }
  return sounds[name];
}

export function playPop() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.08);
  } catch (e) {}
}

export function playSuccess() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Play two notes for a "success" jingle
    [523.25, 659.25].forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      const startTime = audioContext.currentTime + i * 0.12;
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.15);
    });
  } catch (e) {}
}

export function playChime() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 1200;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {}
}
