import { useState } from 'react';
import { X } from 'lucide-react';
import CulletEntryForm from '../components/Forms/CulletEntryForm';
import PlantLayout from '../components/InteractiveMap/PlantLayout';

export default function DataEntry() {
  const [activeStation, setActiveStation] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStationSelect = (stationId) => {
    setActiveStation(stationId);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveStation(''); // Optional: clear selection on close
  };

  return (
    <div className="h-full flex flex-col w-full relative">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-slate-900">Plant Overview</h1>
        <p className="text-slate-500 mt-2">Select a station directly on the map to record cullet generation.</p>
      </div>
      
      {/* Interactive map takes full available width */}
      <div className="flex-1 w-full bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 overflow-hidden relative">
        <PlantLayout 
          selectedStation={activeStation} 
          onSelect={handleStationSelect} 
        />
      </div>

      {/* Pop-up Modal overlay for the Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          ></div>
          
          {/* Modal Content wrapped tightly around the Form */}
          <div className="relative w-[95%] max-w-2xl max-h-[95vh] overflow-hidden rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col bg-white">
            {/* Close button floats inside the form's header space naturally */}
            <button 
              onClick={closeModal}
              className="absolute top-5 right-5 z-50 p-2 bg-slate-100/50 hover:bg-slate-200 text-slate-500 hover:text-red-500 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto w-full custom-scrollbar">
              <CulletEntryForm 
                externalStationId={activeStation} 
                onStationChange={setActiveStation} 
                onSuccessCallback={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
