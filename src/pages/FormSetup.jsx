import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Save, Plus, Trash2, Sliders, Database, Calculator, Hash } from 'lucide-react';

const TYPES = ['EndCrusher', 'TrimCrusher', 'Emergency', 'CulletSilo'];

const DEFAULT_FORM_STATE = {
  fields: [
     { id: 'length', label: 'Length (mm)', type: 'number', defaultValue: '', required: true },
     { id: 'width', label: 'Width (mm)', type: 'number', defaultValue: '', required: true },
     { id: 'thickness', label: 'Thickness (mm)', type: 'number', defaultValue: '3.2', required: true },
     { id: 'quantity', label: 'Quantity', type: 'number', defaultValue: '1', required: true },
     { id: 'density', label: 'Density', type: 'number', defaultValue: '2500', required: true }
  ],
  formula: '(length * width * thickness * quantity * density) / 1000000000'
};

export default function FormSetup() {
  const [selectedType, setSelectedType] = useState(TYPES[0]);
  const [fields, setFields] = useState([]);
  const [formula, setFormula] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [globalDensity, setGlobalDensity] = useState(2500);

  // Fetch form config for selected type and global settings
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        // Fetch global density
        const globalRef = doc(db, 'global_settings', 'constants');
        const globalSnap = await getDoc(globalRef);
        if (globalSnap.exists() && globalSnap.data().density) {
          setGlobalDensity(globalSnap.data().density);
        }

        const docRef = doc(db, 'form_configs', selectedType);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFields(data.fields || []);
          setFormula(data.formula || '');
        } else {
          // If no config exists, initialize a default one based on old logic just as placeholder
          if (selectedType === 'EndCrusher' || selectedType === 'TrimCrusher') {
            setFields(DEFAULT_FORM_STATE.fields);
            setFormula(DEFAULT_FORM_STATE.formula);
          } else {
            setFields([]);
            setFormula('');
          }
        }
      } catch (error) {
        console.error("Error fetching form config:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [selectedType]);

  const handleAddField = () => {
    const newId = `field_${Date.now()}`;
    setFields([...fields, { 
      id: newId, 
      label: 'New Field', 
      type: 'number', 
      defaultValue: '', 
      required: true 
    }]);
  };

  const handleRemoveField = (idToRemove) => {
    setFields(fields.filter(f => f.id !== idToRemove));
  };

  const handleUpdateField = (id, key, value) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save global constants
      await setDoc(doc(db, 'global_settings', 'constants'), {
        density: Number(globalDensity),
        updatedAt: new Date()
      }, { merge: true });

      // Save form schema
      await setDoc(doc(db, 'form_configs', selectedType), {
        fields,
        formula,
        updatedAt: new Date()
      });
      alert('Form configuration saved successfully!');
    } catch (error) {
      console.error("Error saving form config:", error);
      alert('Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 h-full flex flex-col">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Sliders className="w-6 h-6 text-indigo-500" />
            Dynamic Form Setup
          </h1>
          <p className="text-sm text-slate-500 mt-1">Design custom data entry forms and formulas for each station type.</p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 btn-primary py-2.5 px-6 text-sm"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <><Save className="w-4 h-4" /> Save Configuration</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        
        {/* Sidebar */}
        <div className="lg:col-span-1 border-r border-slate-200 pr-6">
          
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" /> Global Constants
            </h3>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Glass Density (kg/m³)</label>
              <input 
                type="number" 
                value={globalDensity}
                onChange={e => setGlobalDensity(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">This 'density' variable will automatically apply to every calculation formula you write.</p>
            </div>
          </div>

          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Select Station Model</h3>
          <div className="space-y-1.5 flex flex-col custom-scrollbar overflow-y-auto max-h-[50vh] pr-2">
            {TYPES.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === type 
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                {type.replace(/([A-Z])/g, ' $1').trim()}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content: Field Builder & Formula */}
        <div className="lg:col-span-3 pb-8">
          {loading ? (
             <div className="flex h-64 items-center justify-center">
                <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : (
            <div className="space-y-6">
              
              {/* Field Builder */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-500" />
                    Input Fields
                  </h2>
                  <button 
                    onClick={handleAddField}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Field
                  </button>
                </div>

                {fields.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                    No fields configured. Add some fields to start building your form!
                  </div>
                ) : (
                  <div className="space-y-3 custom-scrollbar overflow-y-auto max-h-[45vh] pr-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex gap-3 items-start bg-slate-50 p-3 rounded-xl border border-slate-100 relative group">
                        
                        <div className="w-6 h-6 shrink-0 bg-white rounded-full flex items-center justify-center text-slate-400 text-xs font-bold border border-slate-200 shadow-sm mt-0.5">
                          {index + 1}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-1">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Display Label</label>
                            <input 
                              type="text" 
                              value={field.label}
                              onChange={e => handleUpdateField(field.id, 'label', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                              placeholder="e.g. Length (mm)"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Variable ID (For Math)</label>
                            <div className="relative">
                              <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                              <input 
                                type="text" 
                                value={field.id}
                                onChange={e => handleUpdateField(field.id, 'id', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                className="w-full bg-white border border-slate-200 rounded-md pl-7 pr-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 font-mono text-indigo-600 outline-none"
                                placeholder="e.g. length"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Input Type</label>
                            <select
                              value={field.type}
                              onChange={e => handleUpdateField(field.id, 'type', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                              <option value="number">Number</option>
                              <option value="text">Text</option>
                              <option value="hidden">Hidden Constant</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Default Value</label>
                            <input 
                              type="text" 
                              value={field.defaultValue || ''}
                              onChange={e => handleUpdateField(field.id, 'defaultValue', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder="Optional default"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={() => handleRemoveField(field.id)}
                          className="shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors mt-4"
                          title="Delete Field"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formula Builder */}
              <div className="bg-slate-900 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
                
                <div className="relative z-10">
                  <h2 className="text-lg font-bold flex items-center gap-2 mb-1.5">
                    <Calculator className="w-4 h-4 text-indigo-400" />
                    Weight / Tonnage Formula
                  </h2>
                  <p className="text-slate-400 text-xs mb-4">
                    Enter the mathematical expression to calculate the final weight. Use the <strong className="text-indigo-300 font-mono">Variable IDs</strong> exactly as defined above.
                  </p>
                  
                  <div className="bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                    <textarea 
                      value={formula}
                      onChange={e => setFormula(e.target.value)}
                      className="w-full bg-transparent text-white font-mono text-sm p-3 outline-none resize-none h-20 custom-scrollbar"
                      placeholder="e.g. (length * width * thickness * quantity * density) / 1000000000"
                    />
                  </div>

                  <div className="mt-4 flex gap-2 flex-wrap">
                    <span className="text-sm text-slate-400 mr-2">Available Variables:</span>
                    <span className="text-xs font-mono bg-indigo-900 border-indigo-700 text-indigo-300 px-2 py-1 rounded border">
                      density
                    </span>
                    {fields.filter(f => f.id).map(f => (
                      <span key={f.id} className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                        {f.id}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
