import { Routes, Route } from 'react-router-dom';
import KioskView from './views/KioskView';
import KidView from './views/KidView';
import AdminView from './views/AdminView';
import PinEntry from './views/PinEntry';
import RewardsView from './views/RewardsView';
import BonusView from './views/BonusView';
import DinnerPlanView from './views/DinnerPlanView';
import RecipeView from './views/RecipeView';
import { KioskLayout } from './components/KioskLayout';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<KioskView />} />
      <Route path="/kiosk" element={<KioskView />} />
      <Route path="/my/:memberId" element={<KidView />} />
      <Route path="/my" element={<PinEntry />} />
      <Route path="/admin" element={<AdminView />} />
      <Route path="/rewards" element={<RewardsView />} />
      <Route path="/bonus" element={<BonusView />} />
      <Route path="/dinner" element={<DinnerPlanView />} />
      <Route path="/recipe/:id" element={<RecipeView />} />
    </Routes>
  );
}

export default function App() {
  return (
    <KioskLayout>
      <AppRoutes />
    </KioskLayout>
  );
}
