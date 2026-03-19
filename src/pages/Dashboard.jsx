import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import StatCard from '../components/Dashboard/StatCard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Scale, Activity, Box, Filter } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// Helper to get last 7 days skeleton
const getLast7Days = () => {
  const result = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    result.push({
      dateStr: d.toLocaleString('en-US', { weekday: 'short' }), // "Mon", "Tue"
      dateKey: d.toISOString().split('T')[0] // local ISO split approx
    });
  }
  return result;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  
  // Dashboard state
  const [totalWeight, setTotalWeight] = useState(0);
  const [weightTrend, setWeightTrend] = useState(0);
  
  const [totalPieces, setTotalPieces] = useState(0);
  const [piecesTrend, setPiecesTrend] = useState(0);
  
  const [avgDaily, setAvgDaily] = useState(0);

  const [stationData, setStationData] = useState([]);
  const [lineData, setLineData] = useState([]);
  const [timeTrendData, setTimeTrendData] = useState([]);
  const [activeLines, setActiveLines] = useState([]);
  const [trimTrendData, setTrimTrendData] = useState([]);
  const [activeTrimLines, setActiveTrimLines] = useState([]);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const q = query(collection(db, 'cullet_entries'), orderBy('timestamp', 'desc'));
        
        // Fetch both entries and stations to resolve relational data
        const [querySnapshot, stationsSnapshot] = await Promise.all([
           getDocs(q),
           getDocs(collection(db, 'stations'))
        ]);
        
        const stationsMap = {};
        stationsSnapshot.docs.forEach(d => {
           stationsMap[d.id] = d.data();
        });

        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(now.getDate() - 14);

        let currentWeekWeight = 0;
        let previousWeekWeight = 0;
        let currentWeekPieces = 0;
        let previousWeekPieces = 0;

        const stationWeights = {};
        const lineWeights = {};
        const trimLineWeights = {}; // to track active trim lines
        
        // Prepare time trend skeleton
        const last7Days = getLast7Days();
        const timeSeriesMap = {};
        const trimSeriesMap = {};
        last7Days.forEach(day => {
          timeSeriesMap[day.dateKey] = { date: day.dateStr };
          trimSeriesMap[day.dateKey] = { date: day.dateStr };
        });

        // Aggregate
        data.forEach(entry => {
          const entryDate = entry.timestamp ? new Date(entry.timestamp.toMillis()) : new Date();
          const weight = Number(entry.weight) || 0;
          const pieces = Number(entry.formData?.quantity || entry.formData?.pieces || 0);
          
          // Resolve actual station info
          const stationInfo = stationsMap[entry.station_id] || {};
          const lineName = entry.line || stationInfo.line || 'Unassigned';
          const stationName = entry.stationName || stationInfo.name || 'Unknown';
          const type = entry.type || stationInfo.type || 'Unknown';
          
          if (entryDate >= sevenDaysAgo) {
            currentWeekWeight += weight;
            currentWeekPieces += pieces;
            
            // Time Trend
            const localISODate = new Date(entryDate.getTime() - (entryDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            
            if (timeSeriesMap[localISODate]) {
               timeSeriesMap[localISODate][lineName] = (timeSeriesMap[localISODate][lineName] || 0) + weight;
               
               if (type === 'TrimCrusher') {
                  trimSeriesMap[localISODate][lineName] = (trimSeriesMap[localISODate][lineName] || 0) + weight;
                  trimLineWeights[lineName] = true; // track that this line exists in TrimCrusher
               }
            }
            
            // Bar and Pie Charts
            stationWeights[stationName] = (stationWeights[stationName] || 0) + weight;
            lineWeights[lineName] = (lineWeights[lineName] || 0) + weight;
            
          } else if (entryDate >= fourteenDaysAgo) {
            previousWeekWeight += weight;
            previousWeekPieces += pieces;
          }
        });

        // Calculate final UI metrics
        setTotalWeight(currentWeekWeight);
        setTotalPieces(currentWeekPieces);
        setAvgDaily((currentWeekWeight / 7));
        
        if (previousWeekWeight > 0) {
          setWeightTrend(((currentWeekWeight - previousWeekWeight) / previousWeekWeight) * 100);
        }
        if (previousWeekPieces > 0) {
          setPiecesTrend(((currentWeekPieces - previousWeekPieces) / previousWeekPieces) * 100);
        }

        // Format chart arrays
        const formattedStationData = Object.keys(stationWeights)
          .map(k => ({ name: k, weight: Number(stationWeights[k].toFixed(2)) }))
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 5); // Top 5 stations
          
        setStationData(formattedStationData);

        const linesList = Object.keys(lineWeights);
        setActiveLines(linesList);
        
        const trimLinesList = Object.keys(trimLineWeights);
        setActiveTrimLines(trimLinesList);

        const formattedLineData = linesList.map(k => ({ name: k, value: Number(lineWeights[k].toFixed(2)) }));
        setLineData(formattedLineData);

        const formattedTimeTrend = last7Days.map(day => {
          const obj = { ...timeSeriesMap[day.dateKey] };
          linesList.forEach(l => {
            if (obj[l] === undefined) obj[l] = 0;
            else obj[l] = Number(obj[l].toFixed(2));
          });
          return obj;
        });
        setTimeTrendData(formattedTimeTrend);

        const formattedTrimTrend = last7Days.map(day => {
          const obj = { ...trimSeriesMap[day.dateKey] };
          trimLinesList.forEach(l => {
            if (obj[l] === undefined) obj[l] = 0;
            else obj[l] = Number(obj[l].toFixed(2));
          });
          return obj;
        });
        setTrimTrendData(formattedTrimTrend);

      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  if (loading) {
     return (
       <div className="flex-1 flex items-center justify-center p-8">
         <div className="flex flex-col items-center gap-4">
           <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
           <p className="text-slate-500 font-medium animate-pulse">Aggregating Live Data...</p>
         </div>
       </div>
     );
  }

  // Check if we effectively have no data to show a nice empty state
  const hasData = totalWeight > 0 || totalPieces > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of plant-wide cullet generation.</p>
        </div>
        
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
          <Filter className="w-4 h-4" />
          <span>Last 7 Days</span>
        </button>
      </div>
      
      {!hasData && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center shadow-sm">
          <h3 className="text-amber-800 font-bold text-lg">Waiting for Data</h3>
          <p className="text-amber-600 mt-1 text-sm">No rejection entries found in the last 7 days. Once operators start submitting entries from the Data Entry page, this dashboard will automatically populate.</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Rejection Weight" 
          value={totalWeight.toLocaleString(undefined, { maximumFractionDigits: 2 })} 
          unit="Tons" 
          icon={<Scale className="w-6 h-6 text-indigo-600" />}
          trend={Number(weightTrend.toFixed(1))}
          trendLabel="vs last week"
        />
        <StatCard 
          title="Total Pieces" 
          value={totalPieces.toLocaleString()} 
          icon={<Box className="w-6 h-6 text-indigo-600" />}
          trend={Number(piecesTrend.toFixed(1))}
          trendLabel="vs last week"
        />
        <StatCard 
          title="Avg. Daily Generation" 
          value={avgDaily.toLocaleString(undefined, { maximumFractionDigits: 2 })} 
          unit="Tons/day" 
          icon={<Activity className="w-6 h-6 text-indigo-600" />}
        />
      </div>

      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Charts Grid */}
          
          {/* Time Trend - All Lines */}
          <div className="card lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Daily Trend (All Lines)</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {activeLines.map((lineName, i) => (
                    <Line 
                      key={lineName} 
                      type="monotone" 
                      dataKey={lineName} 
                      stroke={COLORS[i % COLORS.length]} 
                      strokeWidth={3} 
                      activeDot={{ r: 8 }} 
                      name={lineName}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Time Trend - Trim Crushers Only */}
          <div className="card lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Trim Crusher Trend (Line-wise)
            </h3>
            
            {activeTrimLines.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No Trim Crusher data logged in the last 7 days.
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trimTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {activeTrimLines.map((lineName, i) => (
                      <Line 
                        key={lineName} 
                        type="monotone" 
                        dataKey={lineName} 
                        stroke={COLORS[(i + 3) % COLORS.length]} // Just offset the colors so they look distinct
                        strokeWidth={3} 
                        activeDot={{ r: 8 }} 
                        name={lineName}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Station Wise Bar Chart */}
          <div className="card">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Top 5 Stations (Tons)</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stationData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} width={120} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="weight" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} name="Tonnage" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line Wise Pie Chart */}
          <div className="card flex flex-col items-center">
            <h3 className="text-lg font-bold text-slate-800 w-full text-left mb-2">Line-wise Distribution</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={lineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {lineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
