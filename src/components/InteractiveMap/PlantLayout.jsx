import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function PlantLayout({ selectedStation, onSelect }) {
  const [stations, setStations] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingStations, setLoadingStations] = useState(true);
  
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [autoScale, setAutoScale] = useState(1);

  // Listen for real-time updates to the layout
  useEffect(() => {
    let isMounted = true;

    const fetchLayoutConfig = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'layout_settings', 'config'));
        if (settingsDoc.exists() && isMounted) {
          const config = settingsDoc.data();
          if (config.backgroundImage) setBackgroundImage(config.backgroundImage);
        }
      } catch (err) {
        console.error("Error fetching layout config:", err);
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    };
    fetchLayoutConfig();

    const unsubscribe = onSnapshot(collection(db, 'stations'), (snapshot) => {
      const layoutData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (layoutData.length === 0) {
        console.warn("No stations found. Please configure them in Settings.");
      }
      
      if (isMounted) {
        setStations(layoutData);
        setLoadingStations(false);
      }
    }, (error) => {
      console.error("Error fetching stations:", error);
      if (isMounted) setLoadingStations(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Compute the perfect scale to autofit the layout inside the window
  const updateScale = () => {
    if (!containerRef.current || !contentRef.current) return;
    
    const cWidth = containerRef.current.clientWidth;
    const cHeight = containerRef.current.clientHeight;
    
    // Use offsetWidth to get the unscaled intrinsic size of the layout content
    const iWidth = contentRef.current.offsetWidth;
    const iHeight = contentRef.current.offsetHeight;
    
    if (cWidth && iWidth && iHeight) {
      // Fit to container with 3% padding
      const scaleX = cWidth / iWidth;
      const scaleY = cHeight / iHeight;
      const optimalScale = Math.min(scaleX, scaleY) * 0.97;
      
      // We can allow scaling up slightly or just prevent it from scaling up too much
      setAutoScale(optimalScale);
    }
  };

  // Recompute scale on window resize or when layout data arrives
  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [stations, backgroundImage]);

  const isLoading = loadingConfig || loadingStations;

  return (
    <div className="flex flex-col items-center justify-center p-0 h-full w-full bg-slate-50 relative">
      {isLoading ? (
        <div className="relative w-full h-[60vh] sm:h-[70vh] bg-slate-50 rounded-3xl overflow-hidden shadow-inner border border-slate-200 flex items-center justify-center animate-pulse">
           <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
           
           <div className="relative z-10 flex flex-col items-center">
             <div className="w-16 h-16 bg-slate-200 rounded-full shadow-sm"></div>
             <div className="w-48 h-6 bg-slate-200 rounded mt-4 shadow-sm"></div>
             
             <div className="flex gap-16 mt-12 opacity-80">
                <div className="w-32 h-24 bg-slate-200 rounded-xl shadow-sm"></div>
                <div className="w-40 h-24 bg-slate-200 rounded-xl shadow-sm"></div>
             </div>
             
             <div className="w-[400px] h-32 bg-slate-200 rounded-xl mt-12 shadow-sm opacity-60"></div>
           </div>
        </div>
      ) : stations.length === 0 ? (
        <div className="flex-1 w-full bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 p-8 text-center mt-4">
          <p className="font-medium text-lg mb-2">No layout configured.</p>
          <p className="text-sm">Please ask an Administrator to design the layout in the Settings dashboard.</p>
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="relative w-full h-[60vh] sm:h-[70vh] bg-slate-50 rounded-3xl overflow-hidden shadow-inner border border-slate-200 flex items-center justify-center"
        >
            <div 
              ref={contentRef}
              className="relative bg-white shadow-xl flex-shrink-0 origin-center transition-transform duration-300"
              style={{ 
                width: backgroundImage ? 'fit-content' : '1200px',
                height: backgroundImage ? 'fit-content' : '800px',
                transform: `scale(${autoScale})`,
              }}
            >
              {backgroundImage ? (
                <img 
                  src={backgroundImage} 
                  alt="Facility Layout" 
                  className="block pointer-events-none" 
                  style={{ maxWidth: '1200px', maxHeight: '1200px', width: 'auto', height: 'auto' }} 
                  onLoad={updateScale} // Recalculate scale once image natural dimensions are known
                />
              ) : (
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
              )}
              
              {/* Render Invisible Hotstations */}
              {stations.map(station => {
                if (station.type === 'Junction') return null; // Junctions are deprecated but handle just in case

                const isSelected = selectedStation === station.id;
                
                return (
                  <div
                    key={station.id}
                    onClick={() => onSelect(station.id)}
                    className={`absolute flex flex-col items-center justify-center cursor-pointer transition-all duration-200 rounded-xl overflow-hidden group ${
                      isSelected ? 'ring-4 ring-indigo-500 ring-offset-2 z-20 shadow-xl opacity-100 bg-indigo-500/20 scale-110' : 'opacity-0 hover:opacity-100 hover:bg-slate-500/10 z-10'
                    }`}
                    style={{ 
                      left: station.x, 
                      top: station.y, 
                      width: station.width, 
                      height: station.height,
                    }}
                  >
                    {/* Optional: Add a subtle overlay when hovering or selected so operator knows they tapped it */}
                    <div className={`w-full text-center px-1 py-1 bg-slate-900/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100' : ''}`}>
                      <p className="font-bold text-sm sm:text-lg leading-tight drop-shadow-md truncate tracking-wide">
                        {station.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      )}
    </div>
  );
}
