import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, AlertCircle, Save, Scale, Box, Hash, ChevronDown, Layers } from 'lucide-react';

export default function CulletEntryForm({ externalStationId, onStationChange, onSuccessCallback }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [stationId, setStationId] = useState(externalStationId || '');
  const [stations, setStations] = useState([]);
  
  // Dynamic Form State
  const [config, setConfig] = useState(null); 
  const [formData, setFormData] = useState({}); 
  const [weight, setWeight] = useState(0); 
  const [globalDensity, setGlobalDensity] = useState(2500);

  useEffect(() => {
    if (externalStationId && externalStationId !== stationId) {
      setStationId(externalStationId);
    }
  }, [externalStationId]);

  // Fetch stations & global density
  useEffect(() => {
    const fetchInitialData = async () => {
      // Fetch stations
      const snapshot = await getDocs(collection(db, 'stations'));
      setStations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      // Fetch universal density
      try {
        const globalSnap = await getDoc(doc(db, 'global_settings', 'constants'));
        if (globalSnap.exists() && globalSnap.data().density) {
          setGlobalDensity(globalSnap.data().density);
        }
      } catch (err) {
        console.warn("Could not fetch global constants:", err);
      }
    };
    fetchInitialData();
  }, []);

  // When Station changes, figure out its component Type and fetch the correct dynamic config!
  useEffect(() => {
    if (!stationId || stations.length === 0) return;
    
    // Find selected station object
    const selectedStation = stations.find(s => s.id === stationId);
    const stationType = selectedStation?.type;
    
    if (stationType) {
      const fetchConfig = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'form_configs', stationType));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setConfig(data);
            
            // Initialize form data state with default values where present
            const initialData = {};
            if (data.fields) {
              data.fields.forEach(f => {
                initialData[f.id] = f.defaultValue !== undefined ? f.defaultValue : '';
              });
            }
            setFormData(initialData);
          } else {
            console.warn(`No Form Configuration set for type: ${stationType}. Please ask an Admin to set it up in Form Setup.`);
            setConfig(null);
          }
        } catch (err) {
          console.error("Failed to load form configuration:", err);
          setConfig(null);
        }
      };
      
      fetchConfig();
    }
  }, [stationId, stations]);

  const handleStationChange = (e) => {
    const newVal = e.target.value;
    setStationId(newVal);
    setConfig(null); // Reset config immediately to show loading or empty state
    if (onStationChange) onStationChange(newVal);
  };

  const handleFieldChange = (id, val) => {
    setFormData(prev => ({ ...prev, [id]: val }));
  };

  // Evaluate the dynamic Form Calculation instantly!
  useEffect(() => {
    if (!config || !config.formula) {
      setWeight(0);
      return;
    }

    try {
      const keys = Object.keys(formData);
      // Ensure all values are cast to numbers for the math execution. String/empty fields become 0.
      const values = Object.values(formData).map(v => Number(v) || 0);

      // Create a dynamic evaluator function: `function(density, length, width) { return ... }`
      const evaluator = new Function('density', ...keys, `return ${config.formula};`);
      
      const result = evaluator(globalDensity, ...values);
      setWeight(Number.isFinite(result) && result > 0 ? result : 0);
    } catch (err) {
      // Very normal if user hasn't typed in all inputs yet, no need to aggressively log
      setWeight(0);
    }
  }, [formData, config]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (weight <= 0) {
      setError("Calculated metric must be greater than zero. Check your inputs.");
      return;
    }
    if (!stationId) {
      setError("Please select a station.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Format number fields into numbers before sending to database
      const parsedData = {};
      Object.keys(formData).forEach(k => {
        parsedData[k] = Number(formData[k]) || formData[k];
      });

      await addDoc(collection(db, 'cullet_entries'), {
        station_id: stationId,
        ...parsedData,
        weight: parseFloat(weight.toFixed(3)),
        timestamp: serverTimestamp(),
        operator_id: currentUser.uid,
        operator_email: currentUser.email
      });
      
      setSuccess(true);
      
      // Reset strictly user-input fields, but keep hidden/default constants intact
      if (config && config.fields) {
        setFormData(prev => {
          const resetData = { ...prev };
          config.fields.forEach(f => {
             if (f.type !== 'hidden' && !f.defaultValue) {
               resetData[f.id] = '';
             }
          });
          return resetData;
        });
      }
      
      setTimeout(() => {
        setSuccess(false);
        if (onSuccessCallback) {
          onSuccessCallback();
        }
      }, 1500);
    } catch (err) {
      console.error("Error adding document: ", err);
      setError("Failed to save entry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full relative overflow-hidden bg-white">
      
      {/* Premium Background Hint */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      <div className="p-8 pb-4 relative z-10">
        <h2 className="text-xl font-bold text-slate-800">Record Rejection</h2>
        <p className="text-sm text-slate-500 mt-1">Select a station and fill the dynamically generated metrics.</p>
      </div>

      <div className="px-8 pb-8">
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg flex items-start gap-3 border border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 text-green-700 p-3 rounded-lg flex items-start gap-3 border border-green-100">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs font-medium">Entry saved successfully!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        
          {/* Station Selection Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Station Location</label>
            <div className="relative">
              <select 
                className="input-field bg-slate-50 border-slate-200 text-sm py-2.5 cursor-pointer appearance-none"
                value={stationId}
                onChange={handleStationChange}
                required
              >
                <option value="" disabled>-- Select Station --</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.line ? `${s.line} - ` : ''}{s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Dynamic Fields Area */}
          {stationId && !config ? (
             <div className="py-6 bg-amber-50 rounded-xl border border-amber-200 text-center text-amber-600 text-sm font-medium">
               No configuration layout found for this station. Please ask an Administrator to design one under the Form Setup dashboard.
             </div>
          ) : config && config.fields && config.fields.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
              {config.fields.filter(f => f.type !== 'hidden').map((field) => (
                <div key={field.id} className="relative">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{field.label}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       {/* Dynamic generic Icon mapping based on naming conventions to look pretty */}
                       {field.id.includes('length') || field.id.includes('width') ? <Box className="h-4 w-4 text-indigo-400" /> : 
                        field.id.includes('thickness') ? <Layers className="h-4 w-4 text-indigo-400" /> :
                        <Hash className="h-4 w-4 text-indigo-400" />}
                    </div>
                    <input 
                      type={field.type === 'number' ? "number" : "text"} 
                      min={field.type === 'number' ? "0" : undefined}
                      step={field.type === 'number' ? "any" : undefined}
                      className="input-field pl-9 text-sm py-2 bg-white border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                      value={formData[field.id] !== undefined ? formData[field.id] : ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      required={field.required !== false} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Real-time Weight Preview Panel */}
          <div className="bg-indigo-600 rounded-xl p-5 text-white flex items-center justify-between shadow-md mt-4 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 opacity-10 pointer-events-none">
               <Scale className="w-32 h-32" />
            </div>
            <div className="relative z-10 w-full pl-2">
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-0.5">Calculated Metric</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">
                  {weight > 0 ? weight.toFixed(3) : '0.000'}
                </span>
                <span className="text-indigo-200 font-medium text-sm">
                  {config?.unit || 'Tons'}
                </span>
              </div>
            </div>
            <div className="bg-white/10 p-3 rounded-xl hidden sm:block relative z-10 backdrop-blur-md">
              <Scale className="w-6 h-6 text-white opacity-90" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || weight <= 0}
            className="btn-primary w-full py-3 text-sm font-semibold tracking-wide flex justify-center items-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
               <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save className="w-5 h-5" /> Save Entry Record
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
