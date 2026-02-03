import { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomeView from './views/HomeView';
import KioskView from './views/KioskView';
import KidView from './views/KidView';
import AdminView from './views/AdminView';
import PinEntry from './views/PinEntry';
import RewardsView from './views/RewardsView';
import DinnerPlanView from './views/DinnerPlanView';
import RecipeView from './views/RecipeView';
import CalendarView from './views/CalendarView';
import WeatherView from './views/WeatherView';
import FitnessView from './views/FitnessView';
import { KioskLayout } from './components/KioskLayout';
import { IdleScreen } from './components/IdleScreen';

const IDLE_TIMEOUT = 2 * 60 * 1000; // 2 minutes of inactivity

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeView />} />
      <Route path="/chores" element={<KioskView />} />
      <Route path="/kiosk" element={<KioskView />} />
      <Route path="/my/:memberId" element={<KidView />} />
      <Route path="/my" element={<PinEntry />} />
      <Route path="/admin" element={<AdminView />} />
      <Route path="/rewards" element={<RewardsView />} />
      <Route path="/dinner" element={<DinnerPlanView />} />
      <Route path="/recipe/:id" element={<RecipeView />} />
      <Route path="/calendar" element={<CalendarView />} />
      <Route path="/weather" element={<WeatherView />} />
      <Route path="/fitness" element={<FitnessView />} />
    </Routes>
  );
}

export default function App() {
  const [isIdle, setIsIdle] = useState(false);
  const [familyAvatars, setFamilyAvatars] = useState<string[]>([]);

  // Fetch family avatars for the idle screen
  useEffect(() => {
    fetch('/api/members')
      .then(r => r.json())
      .then(members => {
        if (Array.isArray(members) && members.length > 0) {
          setFamilyAvatars(members.map((m: any) => m.avatar));
        }
      })
      .catch(err => console.warn('Failed to fetch family avatars:', err));
  }, []);

  // Idle detection
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      setIsIdle(false);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT);
    };

    // Events that count as activity
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    // Start the timer
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, []);

  const handleWake = useCallback(() => {
    setIsIdle(false);
  }, []);

  return (
    <>
      {isIdle && (
        <IdleScreen 
          onWake={handleWake} 
          familyAvatars={familyAvatars.length > 0 ? familyAvatars : undefined}
        />
      )}
      <KioskLayout>
        <AppRoutes />
      </KioskLayout>
    </>
  );
}
