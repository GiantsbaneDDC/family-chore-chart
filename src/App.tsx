import { Routes, Route } from 'react-router-dom';
import KioskView from './views/KioskView';
import KidView from './views/KidView';
import AdminView from './views/AdminView';
import PinEntry from './views/PinEntry';
import RewardsView from './views/RewardsView';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<KioskView />} />
      <Route path="/kiosk" element={<KioskView />} />
      <Route path="/my/:memberId" element={<KidView />} />
      <Route path="/my" element={<PinEntry />} />
      <Route path="/admin" element={<AdminView />} />
      <Route path="/rewards" element={<RewardsView />} />
    </Routes>
  );
}
