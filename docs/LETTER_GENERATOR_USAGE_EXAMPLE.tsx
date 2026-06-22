// Contoh penggunaan LetterGenerator

// 1. Import di komponen parent
import { LetterGenerator } from './components/LetterGenerator';

// 2. State management
const [showLetterModal, setShowLetterModal] = useState(false);
const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

// 3. Handler untuk membuka modal
const handleOpenLetterGenerator = (event: EventItem) => {
  setSelectedEvent(event);
  setShowLetterModal(true);
};

// 4. Render modal
<LetterGenerator 
  isOpen={showLetterModal}
  onClose={() => setShowLetterModal(false)}
  event={selectedEvent}
/>