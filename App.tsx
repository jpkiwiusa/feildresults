import React, { useState, useMemo, useRef } from 'react';
import { Trial, FilterState, SortField, SortDirection } from './types';
import { ALL_TRIALS } from './constants';
import TrialRow from './components/TrialRow';
import StatCard from './components/StatCard';
import { 
  Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Leaf, Upload, 
  Database, LayoutDashboard, Sprout, Calculator, Settings, Menu, X,
  BarChart3, TrendingUp, FlaskConical, MapPin
} from 'lucide-react';

// Logic to determine product if missing (ported from original script)
const getProduct = (trial: Trial): string => {
  if (trial.Product) return trial.Product;
  const treatment = (trial.Treatment || '').toLowerCase();
  const notes = (trial.Notes || '').toLowerCase();
  if (treatment.includes('lst') || notes.includes('lst')) return 'NutriCharge LST';
  if (treatment.includes('powerplant') || treatment.includes('power plant') || notes.includes('powerplant')) return 'PowerPlant';
  if (treatment.includes('triune') || notes.includes('triune')) return 'Triune';
  if (treatment.includes('triphase') || treatment.includes('tri-phase') || notes.includes('triphase')) return 'TriPhase';
  return 'NutriCharge';
};

// Normalize crop names to group similar crops
const normalizeCrop = (crop: string): string => {
  const c = crop.trim();
  const lower = c.toLowerCase();
  
  if (
    lower.includes('canola') || 
    lower.includes('rape') || 
    lower.includes('rapeseed')
  ) {
    return 'Canola';
  }
  
  return c;
};

const App: React.FC = () => {
  // State for data source - initialized with the constant data
  const [sourceData, setSourceData] = useState<Trial[]>(ALL_TRIALS);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    crop: 'All',
    country: 'All',
    product: 'All'
  });
  
  const [sortConfig, setSortConfig] = useState<{ field: SortField, direction: SortDirection }>({
    field: 'Advantage_pct',
    direction: 'desc'
  });

  const [showFilters, setShowFilters] = useState(true);

  // Computed data with products derived and crops normalized
  const processedTrials = useMemo(() => {
    return sourceData.map(t => ({ 
      ...t, 
      Product: getProduct(t),
      Crop: normalizeCrop(t.Crop) 
    }));
  }, [sourceData]);

  // Derived Lists for Select Options
  const crops = useMemo(() => Array.from(new Set(processedTrials.map(t => t.Crop))).sort(), [processedTrials]);
  const countries = useMemo(() => Array.from(new Set(processedTrials.map(t => t.Country))).filter(Boolean).sort(), [processedTrials]);
  
  // Filtering Logic
  const filteredTrials = useMemo(() => {
    return processedTrials.filter(trial => {
      const matchesCrop = filters.crop === 'All' || trial.Crop === filters.crop;
      const matchesCountry = filters.country === 'All' || trial.Country === filters.country;
      const matchesProduct = filters.product === 'All' || trial.Product === filters.product;
      
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = !filters.search || 
        (trial.Crop || '').toLowerCase().includes(searchLower) ||
        (trial.Location || '').toLowerCase().includes(searchLower) ||
        (trial.Treatment || '').toLowerCase().includes(searchLower) ||
        (trial.Notes || '').toLowerCase().includes(searchLower) ||
        String(trial.Year || '').includes(searchLower);

      return matchesCrop && matchesCountry && matchesProduct && matchesSearch;
    });
  }, [filters, processedTrials]);

  // Sorting Logic
  const sortedTrials = useMemo(() => {
    return [...filteredTrials].sort((a, b) => {
      let aVal = a[sortConfig.field];
      let bVal = b[sortConfig.field];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTrials, sortConfig]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const total = filteredTrials.length;
    if (total === 0) return { total: 0, avgPct: 0, positiveRate: 0, avgAdv: '—' };

    let sumPct = 0;
    let positiveCount = 0;
    let sumAdv = 0;
    let countAdv = 0;
    const unitCounts: Record<string, number> = {};

    filteredTrials.forEach(t => {
      sumPct += t.Advantage_pct || 0;
      if (t.Advantage_pct > 0) positiveCount++;
      if (t.Advantage_bu !== undefined && t.Advantage_bu !== null) {
        sumAdv += t.Advantage_bu;
        countAdv++;
      }
      const u = t.Unit || 'bu/ac';
      unitCounts[u] = (unitCounts[u] || 0) + 1;
    });

    const avgPct = (sumPct / total).toFixed(1);
    const positiveRate = ((positiveCount / total) * 100).toFixed(0);

    // Determine dominant unit for display
    let displayUnit = 'bu/ac';
    let maxUnitCount = 0;
    Object.entries(unitCounts).forEach(([unit, count]) => {
      if (count > maxUnitCount) {
        maxUnitCount = count;
        displayUnit = unit;
      }
    });

    // Only show absolute advantage if >80% share the same unit to avoid confusion
    const avgAdv = (maxUnitCount / total) > 0.8 && countAdv > 0
      ? `+${(sumAdv / countAdv).toFixed(1)} ${displayUnit}`
      : 'Mixed Units';

    return { total, avgPct, positiveRate, avgAdv };
  }, [filteredTrials]);

  // Handlers
  const handleSort = (field: SortField) => {
    setSortConfig(current => ({
      field,
      direction: current.field === field && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return <ArrowUpDown size={14} className="ml-1 text-slate-500 opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="ml-1 text-emerald-400" />
      : <ArrowDown size={14} className="ml-1 text-emerald-400" />;
  };

  const parseCSV = (text: string): Trial[] => {
    const lines = text.split('\n');
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const values: string[] = [];
      let inQuote = false;
      let currentValue = '';
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
          values.push(currentValue);
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue);
      
      const cleanValues = values.map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      
      const f = (n: string) => {
        const parsed = parseFloat(n);
        return isNaN(parsed) ? 0 : parsed;
      };

      return {
        Year: cleanValues[0],
        Location: cleanValues[1],
        Country: cleanValues[2],
        State: cleanValues[3],
        Crop: cleanValues[4],
        Product: cleanValues[5],
        Variety: cleanValues[6],
        Treatment: cleanValues[7],
        NC_Yield: f(cleanValues[8]),
        Check_Yield: f(cleanValues[9]),
        Advantage_bu: f(cleanValues[10]),
        Advantage_pct: f(cleanValues[11]),
        Unit: cleanValues[12],
        Significant: cleanValues[13],
        Notes: cleanValues[14]
      } as Trial;
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (file.name.endsWith('.csv') || file.type === 'text/csv') {
          const parsedData = parseCSV(content);
          if (parsedData.length > 0) {
            setSourceData(parsedData);
            setFilters({ search: '', crop: 'All', country: 'All', product: 'All' });
          } else {
            alert("Could not parse CSV data. Please check the file format.");
          }
        } else {
          const json = JSON.parse(content);
          if (Array.isArray(json) && json.some(item => item.Year || item.Crop)) {
             setSourceData(json);
             setFilters({ search: '', crop: 'All', country: 'All', product: 'All' });
          } else {
             alert("The file doesn't seem to contain valid trial data.");
          }
        }
      } catch (error) {
        console.error(error);
        alert("Failed to parse file. Please ensure it is a valid CSV or JSON export.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Crop Pills Data
  const cropCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTrials.forEach(t => {
      counts[t.Crop] = (counts[t.Crop] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredTrials]);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:relative z-30 w-64 h-full bg-slate-950 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} border-r border-slate-800`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950 shadow-md">
          <Leaf className="text-emerald-500 mr-2" size={24} />
          <span className="text-lg font-bold text-white tracking-tight">AgroTech USA</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <a href="#" className="flex items-center px-3 py-2.5 rounded-lg text-white bg-slate-800 border border-slate-700 group transition-colors shadow-sm">
            <Database size={20} className="mr-3 text-emerald-400" />
            <span className="font-semibold">Trial Database</span>
          </a>
          <a href="#" className="flex items-center px-3 py-2.5 rounded-lg hover:text-white hover:bg-slate-800/50 group transition-colors">
            <LayoutDashboard size={20} className="mr-3 text-slate-400 group-hover:text-emerald-400" />
            <span className="font-medium">Dashboard</span>
          </a>
          <a href="#" className="flex items-center px-3 py-2.5 rounded-lg hover:text-white hover:bg-slate-800/50 group transition-colors">
            <Calculator size={20} className="mr-3 text-slate-400 group-hover:text-emerald-400" />
            <span className="font-medium">Calculator</span>
          </a>
          <a href="#" className="flex items-center px-3 py-2.5 rounded-lg hover:text-white hover:bg-slate-800/50 group transition-colors">
            <Settings size={20} className="mr-3 text-slate-400 group-hover:text-emerald-400" />
            <span className="font-medium">Settings</span>
          </a>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-emerald-900 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold text-xs shadow-inner">
              AT
            </div>
            <div className="ml-3">
              <p className="text-xs font-semibold text-white">AgroTech Admin</p>
              <p className="text-xs text-slate-500">View Only</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header - Now Dark to Match Style */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-10 shadow-md">
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 mr-2 text-slate-400 hover:text-white"
            >
              <Menu size={20} />
            </button>
            <div className="relative hidden sm:block w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Search database..."
                className="pl-10 w-full rounded-md border border-slate-700 bg-slate-800 py-1.5 px-3 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".json,.csv"
            />
            <button 
              onClick={triggerUpload}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 px-3 py-1.5 rounded-md text-sm font-medium transition-all shadow-sm"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">Import Data</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Performance Trials</h1>
                <p className="text-slate-500 text-sm mt-1 font-medium">
                  Viewing {filteredTrials.length} results from {sourceData.length === ALL_TRIALS.length ? 'default dataset' : 'uploaded dataset'}
                </p>
              </div>
              <div className="flex gap-2">
                 <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors border shadow-sm ${showFilters ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  <Filter size={16} />
                  Filters
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Trials" value={stats.total} icon={<FlaskConical size={20} />} />
              <StatCard label="Avg Yield Adv" value={stats.avgAdv} highlight icon={<Sprout size={20} />} />
              <StatCard label="Avg % Increase" value={`+${stats.avgPct}%`} highlight icon={<TrendingUp size={20} />} />
              <StatCard label="Positive Response" value={`${stats.positiveRate}%`} highlight icon={<BarChart3 size={20} />} />
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-300 p-5 mb-6 animate-slideDown">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:hidden">
                     {/* Mobile Search - visible only on small screens inside filters */}
                     <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Search</label>
                     <input
                      type="text"
                      placeholder="Search..."
                      className="w-full rounded-md border border-slate-300 bg-slate-50 py-2 px-3 text-sm focus:border-slate-500 outline-none"
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Crop</label>
                    <select
                      className="w-full rounded-md border border-slate-300 bg-slate-50 py-2 px-3 text-sm font-medium text-slate-700 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none shadow-sm"
                      value={filters.crop}
                      onChange={(e) => setFilters(prev => ({ ...prev, crop: e.target.value }))}
                    >
                      <option value="All">All Crops</option>
                      {crops.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Region</label>
                    <select
                      className="w-full rounded-md border border-slate-300 bg-slate-50 py-2 px-3 text-sm font-medium text-slate-700 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none shadow-sm"
                      value={filters.country}
                      onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                    >
                      <option value="All">All Countries</option>
                      {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Product</label>
                    <select
                      className="w-full rounded-md border border-slate-300 bg-slate-50 py-2 px-3 text-sm font-medium text-slate-700 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none shadow-sm"
                      value={filters.product}
                      onChange={(e) => setFilters(prev => ({ ...prev, product: e.target.value }))}
                    >
                      <option value="All">All Products</option>
                      <option value="NutriCharge">NutriCharge</option>
                      <option value="NutriCharge LST">NutriCharge LST</option>
                      <option value="PowerPlant">PowerPlant</option>
                      <option value="Triune">Triune</option>
                      <option value="TriPhase">TriPhase</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                     <button 
                      onClick={() => setFilters({ search: '', crop: 'All', country: 'All', product: 'All' })}
                      className="w-full py-2 px-3 text-sm font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded-md transition-colors shadow-sm"
                     >
                       Reset Filters
                     </button>
                  </div>
                </div>
                
                {/* Pills */}
                <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-500 self-center mr-2 uppercase tracking-wide">Quick Filter:</span>
                  {cropCounts.slice(0, 8).map(([crop, count]) => (
                    <button
                      key={crop}
                      onClick={() => setFilters(prev => ({ ...prev, crop: prev.crop === crop ? 'All' : crop }))}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                        filters.crop === crop 
                          ? 'bg-slate-800 text-white border-slate-900' 
                          : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {crop} <span className="opacity-60 ml-0.5 text-[10px] font-normal">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Table Card */}
            <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-300 font-semibold">
                      <th 
                        className="p-4 pl-6 cursor-pointer hover:bg-slate-800 hover:text-white transition-colors group w-1/6"
                        onClick={() => handleSort('Crop')}
                      >
                        <div className="flex items-center">Crop {getSortIcon('Crop')}</div>
                      </th>
                      <th 
                        className="p-4 cursor-pointer hover:bg-slate-800 hover:text-white transition-colors group w-24"
                        onClick={() => handleSort('Year')}
                      >
                        <div className="flex items-center">Year {getSortIcon('Year')}</div>
                      </th>
                      <th 
                        className="p-4 cursor-pointer hover:bg-slate-800 hover:text-white transition-colors group w-1/5"
                        onClick={() => handleSort('Location')}
                      >
                        <div className="flex items-center">Location {getSortIcon('Location')}</div>
                      </th>
                      <th className="p-4 w-1/4">Treatment</th>
                      <th 
                        className="p-4 pr-6 text-right cursor-pointer hover:bg-slate-800 hover:text-white transition-colors group"
                        onClick={() => handleSort('Advantage_pct')}
                      >
                        <div className="flex items-center justify-end">Advantage {getSortIcon('Advantage_pct')}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sortedTrials.length > 0 ? (
                      sortedTrials.map((trial, index) => (
                        <TrialRow key={`${trial.Year}-${trial.Location}-${index}`} trial={trial} />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-16 text-center text-slate-400">
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-4 bg-slate-50 rounded-full border border-slate-200">
                              <Search size={32} className="opacity-20" />
                            </div>
                            <p className="font-medium text-slate-600">No trials found matching your filters</p>
                            <button 
                              onClick={() => setFilters({ search: '', crop: 'All', country: 'All', product: 'All' })}
                              className="text-emerald-600 font-bold hover:text-emerald-700 text-sm"
                            >
                              Clear all filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 px-6 py-4 text-center sm:text-right text-xs font-medium text-slate-500 border-t border-slate-200">
                AgroTech USA Internal Database • Confidential
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;