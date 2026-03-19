import { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Save, Plus, Trash2, Tag, Palette, Type, MousePointer2, Focus, Crop, Image as ImageIcon, UploadCloud } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#3b82f6'];
const TYPES = ['EndCrusher', 'TrimCrusher', 'Emergency', 'CulletSilo'];

export default function Settings() {
  const [stations, setStations] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [viewport, setViewport] = useState({ scale: 1, positionX: 0, positionY: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  
  // Reference for the layout canvas to bind dragging constraints
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch existing layout from Firebase
  useEffect(() => {
    const fetchLayout = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'stations'));
        const layoutData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStations(layoutData);

        const settingsDoc = await getDoc(doc(db, 'layout_settings', 'config'));
        if (settingsDoc.exists()) {
          const config = settingsDoc.data();
          if (config.backgroundImage) setBackgroundImage(config.backgroundImage);
          if (config.viewport) setViewport(config.viewport);
        }
      } catch (error) {
        console.error("Error fetching layout:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLayout();
  }, []);

  const handleAddStation = () => {
    const newId = `station_${Date.now()}`;
    const newStation = {
      id: newId,
      name: 'New Station',
      type: 'EndCrusher',
      line: 'SG#1',
      color: COLORS[0],
      // Spawn near the center of the viewport ideally, but default to 50,50
      x: 50,
      y: 50,
      width: 120,
      height: 80,
    };
    setStations(prev => [...prev, newStation]);
    setSelectedId(newId);
  };

  const handleUpdateStation = (id, updates) => {
    setStations(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDeleteStation = async (id) => {
    // Optimistic UI update
    setStations(prev => prev.filter(s => s.id !== id));
    if (selectedId === id) setSelectedId(null);
    
    // Attempt delete from DB if it existed there
    try {
      await deleteDoc(doc(db, 'stations', id));
    } catch (err) {
      console.error("Error deleting from DB:", err);
    }
  };

  const handleStationClick = (e, id) => {
    e.stopPropagation();
    setSelectedId(id);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `layout_images/background_${Date.now()}`);
      const uploadTask = await uploadBytesResumable(storageRef, file);
      const downloadURL = await getDownloadURL(uploadTask.ref);
      
      setBackgroundImage(downloadURL);
      
      // Save it automatically to settings
      await setDoc(doc(db, 'layout_settings', 'config'), {
        backgroundImage: downloadURL,
        viewport
      }, { merge: true });

    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Make sure your Firebase Storage rules are updated!");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveLayout = async () => {
    setSaving(true);
    try {
      // Create/Update all stations in Firestore sequentially
      for (const station of stations) {
        await setDoc(doc(db, 'stations', station.id), station);
      }
      
      // Save global configuration (viewport + background)
      await setDoc(doc(db, 'layout_settings', 'config'), {
        backgroundImage,
        viewport
      });

      alert('Layout saved successfully!');
    } catch (error) {
      console.error("Error saving layout:", error);
      alert('Failed to save layout.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewportChange = (ref) => {
    setViewport({
      scale: ref.state.scale,
      positionX: ref.state.positionX,
      positionY: ref.state.positionY
    });
  };

  const selectedStation = stations.find(s => s.id === selectedId);

  return (
    <div className="h-full flex flex-col pt-4 pb-8 px-6 lg:px-8">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Plant Layout Editor</h1>
          <p className="text-slate-500 mt-2">Design the shop floor mapping for data entry.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="flex items-center gap-2 border border-slate-200 text-slate-700 bg-white font-medium py-2 px-4 rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
          >
            {uploadingImage ? (
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <><UploadCloud className="w-5 h-5 text-indigo-500" /> Upload Image</>
            )}
          </button>
          
          <button 
            onClick={handleAddStation}
            className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium py-2 px-4 rounded-xl shadow-sm hover:bg-indigo-100 transition-colors"
          >
            <Plus className="w-5 h-5" /> Add Hotspot
          </button>

          <button 
            onClick={handleSaveLayout}
            disabled={saving || loading}
            className="flex items-center gap-2 btn-primary py-2 px-6"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <><Save className="w-5 h-5" /> Save State</>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 h-[calc(100vh-180px)] min-h-[500px]">
        
        {/* Canvas Area Wrapped in Pan/Zoom */}
        <div className="flex-1 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner relative overflow-hidden flex flex-col">
          <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 shadow-sm flex items-center gap-2">
            <Crop className="w-4 h-4 text-indigo-500" />
            Pan & Zoom to set Operator's default view
          </div>

          <div className="flex-1 relative" ref={canvasRef} onClick={() => setSelectedId(null)}>
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400">Loading layout...</div>
            ) : (
              <TransformWrapper
                initialScale={viewport.scale || 1}
                initialPositionX={viewport.positionX || 0}
                initialPositionY={viewport.positionY || 0}
                onTransformed={handleViewportChange}
                panning={{ disabled: isDraggingBox }}
                minScale={0.1}
                maxScale={4}
                centerOnInit={true}
                limitToBounds={false}
              >
                <TransformComponent wrapperStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div 
                    className="relative bg-white shadow-xl flex-shrink-0"
                    style={{ 
                      width: backgroundImage ? 'auto' : '1200px',
                      height: backgroundImage ? 'auto' : '800px',
                    }}
                  >
                    {backgroundImage ? (
                      <img 
                        src={backgroundImage} 
                        alt="Facility Layout" 
                        className="block pointer-events-none" 
                        style={{ maxWidth: '1200px', maxHeight: '1200px', width: 'auto', height: 'auto' }} 
                      />
                    ) : (
                      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
                    )}

                    {/* Draggable Hotspots */}
                    {stations.map((station) => (
                      <Rnd
                        key={station.id}
                        scale={viewport.scale || 1}
                        size={{ width: station.width, height: station.height }}
                        position={{ x: station.x, y: station.y }}
                        bounds="parent" // Keeps it inside the 3000x3000 canvas
                        onDragStart={() => setIsDraggingBox(true)}
                        onDragStop={(e, d) => {
                          setIsDraggingBox(false);
                          handleUpdateStation(station.id, { x: d.x, y: d.y });
                        }}
                        onResizeStop={(e, direction, ref, delta, position) => {
                          handleUpdateStation(station.id, {
                            width: parseInt(ref.style.width, 10),
                            height: parseInt(ref.style.height, 10),
                            ...position,
                          });
                        }}
                        className={`box-draggable group flex flex-col items-center justify-center transition-all ${
                          selectedId === station.id ? 'ring-4 ring-indigo-500 ring-offset-2 z-20 shadow-lg border-2 border-indigo-600' : 'border-2 border-dashed border-red-500/80 hover:border-solid hover:border-red-500 z-10'
                        }`}
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                      >
                        {/* Interactive overlay to guarantee click registers */}
                        <div 
                          className="absolute inset-0 z-10" 
                          onMouseDown={(e) => {
                            setSelectedId(station.id);
                          }}
                        />
                        <div className="bg-red-900/80 text-white rounded px-2 py-0.5 pointer-events-none text-xs font-bold drop-shadow-md text-center">
                          {station.name || "Unnamed"}
                        </div>
                      </Rnd>
                    ))}

                  </div>
                </TransformComponent>
              </TransformWrapper>
            )}
          </div>
        </div>

        {/* Properties Sidebar */}
        <div className="w-80 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-y-auto">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-500" />
            Properties
          </h3>

          {!selectedStation ? (
            <div className="text-center text-slate-400 mt-10">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Type className="w-8 h-8 text-slate-300" />
              </div>
              <p>Select a station on the canvas to configure it.</p>
            </div>
          ) : (
            <div className="space-y-5">
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Station ID (Internal)</label>
                <input 
                  type="text" 
                  value={selectedStation.id}
                  disabled
                  className="input-field bg-slate-50 text-slate-500 cursor-not-allowed text-sm py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={selectedStation.name}
                  onChange={(e) => handleUpdateStation(selectedStation.id, { name: e.target.value })}
                  className="input-field py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Production Line</label>
                <input 
                  type="text" 
                  value={selectedStation.line}
                  onChange={(e) => handleUpdateStation(selectedStation.id, { line: e.target.value })}
                  className="input-field py-2"
                  placeholder="e.g. SG#1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Station Type</label>
                <select 
                  value={selectedStation.type}
                  onChange={(e) => handleUpdateStation(selectedStation.id, { type: e.target.value })}
                  className="input-field py-2 cursor-pointer"
                >
                  {TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-slate-400" /> Color Tag
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => handleUpdateStation(selectedStation.id, { color })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        selectedStation.color === color ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6">
                <button
                  onClick={() => handleDeleteStation(selectedStation.id)}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" /> Remove Station
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
