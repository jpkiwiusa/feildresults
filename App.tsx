import React, { useState, useMemo, useRef } from 'react';
import { Trial, FilterState, SortField, SortDirection } from './types';
import { ALL_TRIALS } from './constants';
import TrialRow from './components/TrialRow';
import StatCard from './components/StatCard';
import { 
  Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Leaf, Upload, 
  Database, LayoutDashboard, Calculator, Settings, Menu, X,
  BarChart3, TrendingUp, FlaskConical, MapPin, ChevronDown, RefreshCw, Sprout
} from 'lucide-react';

// Logic to determine product if missing
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

// Normalize crop names
const normalizeCrop = (crop: string): string => {
  const c = crop.trim();
  const lower = c.toLowerCase();
  if (lower.includes('canola') || lower.includes('rape') || lower.includes('rapeseed')) return 'Canola';
  return c;
};

const App: React.FC = () => {
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

  // Computed data
  const processedTrials = useMemo(() => {
    return sourceData.map(t => ({ 
      ...t, 
      Product: getProduct(t),
      Crop: normalizeCrop(t.Crop) 
    }));
  }, [sourceData]);

  const crops = useMemo(() => Array.from(new Set(processedTrials.map(t => t.Crop))).sort(), [processedTrials]);
  const countries = useMemo(() => Array.from(new Set(processedTrials.map(t => t.Country))).filter(Boolean).sort(), [processedTrials]);
  
  // Filtering
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

  // Sorting
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

  // Statistics
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

    let displayUnit = 'bu/ac';
    let maxUnitCount = 0;
    Object.entries(unitCounts).forEach(([unit, count]) => {
      if (count > maxUnitCount) {
        maxUnitCount = count;
        displayUnit = unit;
      }
    });

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
    if (sortConfig.field !== field) return <ArrowUpDown size={12} className="ml-1 text-slate-400 opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={12} className="ml-1 text-emerald-500" />
      : <ArrowDown size={12} className="ml-1 text-emerald-500" />;
  };

  const parseCSV = (text: string): Trial[] => {
    const lines = text.split('\n');
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const values: string[] = [];
      let inQuote = false;
      let currentValue = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') { inQuote = !inQuote; } 
        else if (char === ',' && !inQuote) { values.push(currentValue); currentValue = ''; } 
        else { currentValue += char; }
      }
      values.push(currentValue);
      const cleanValues = values.map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      const f = (n: string) => { const parsed = parseFloat(n); return isNaN(parsed) ? 0 : parsed; };

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
          } else { alert("Could not parse CSV data."); }
        } else {
          const json = JSON.parse(content);
          if (Array.isArray(json) && json.some(item => item.Year || item.Crop)) {
             setSourceData(json);
             setFilters({ search: '', crop: 'All', country: 'All', product: 'All' });
          } else { alert("Invalid trial data."); }
        }
      } catch (error) { console.error(error); alert("Failed to parse file."); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const cropCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTrials.forEach(t => { counts[t.Crop] = (counts[t.Crop] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredTrials]);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:relative z-50 w-64 h-full bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-14 flex items-center px-5 bg-slate-950 border-b border-slate-800">
          <div className="p-1.5 bg-emerald-500 rounded text-slate-900 mr-3">
             <Leaf size={16} strokeWidth={3} />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">AgroTech</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <div className="px-3 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Analytics</div>
          <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-emerald-600/10 border border-emerald-600/20 shadow-sm relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
            <Database size={18} className="mr-3 text-emerald-500" />
            <span>Trial Database</span>
          </a>
          <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:text-white hover:bg-slate-800 transition-colors">
            <LayoutDashboard size={18} className="mr-3 text-slate-500" />
            <span>Dashboard</span>
          </a>
          <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:text-white hover:bg-slate-800 transition-colors">
            <Calculator size={18} className="mr-3 text-slate-500" />
            <span>ROI Calculator</span>
          </a>

          <div className="mt-8 px-3 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">System</div>
          <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:text-white hover:bg-slate-800 transition-colors">
            <Settings size={18} className="mr-3 text-slate-500" />
            <span>Settings</span>
          </a>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <button 
            onClick={triggerUpload}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all"
          >
            <Upload size={14} />
            Import Data
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".json,.csv" />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 mr-2 text-slate-500 hover:text-slate-800">
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-base font-bold text-slate-900 leading-tight">AgroTech Trial Performance</h1>
              <p className="text-[10px] text-slate-500 font-medium">Internal Dealer Tool v2.4</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="relative hidden md:block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Quick search..." 
                  className="pl-9 pr-3 py-1.5 text-sm bg-slate-100 border border-slate-200 rounded-md w-64 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Trials" value={stats.total} icon={<FlaskConical />} />
              <StatCard label="Avg Yield Advantage" value={stats.avgAdv} highlight icon={<Sprout />} />
              <StatCard label="Avg % Increase" value={`+${stats.avgPct}%`} highlight icon={<TrendingUp />} />
              <StatCard label="Positive Response Rate" value={`${stats.positiveRate}%`} highlight icon={<BarChart3 />} />
            </div>

            {/* Filter Panel */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Filter size={14} className="text-slate-500" />
                    Filters
                  </div>
                  {showFilters ? (
                    <button onClick={() => setFilters({ search: '', crop: 'All', country: 'All', product: 'All' })} className="text-xs text-emerald-600 font-bold hover:text-emerald-700 flex items-center gap-1">
                      <RefreshCw size={10} /> Reset
                    </button>
                  ) : null}
               </div>
               
               {showFilters && (
                 <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {/* Search only visible on mobile here */}
                      <div className="md:hidden">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                          placeholder="Search..."
                          value={filters.search}
                          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                      </div>
                      
                      <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Crop Type</label>
                        <div className="relative">
                          <select
                            className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded px-3 py-2 pr-8 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                            value={filters.crop}
                            onChange={(e) => setFilters(prev => ({ ...prev, crop: e.target.value }))}
                          >
                            <option value="All">All Crops</option>
                            {crops.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Region</label>
                        <div className="relative">
                          <select
                            className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded px-3 py-2 pr-8 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                            value={filters.country}
                            onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                          >
                            <option value="All">All Regions</option>
                            {countries.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Product</label>
                        <div className="relative">
                          <select
                            className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded px-3 py-2 pr-8 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
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
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                      {cropCounts.slice(0, 6).map(([crop, count]) => (
                        <button
                          key={crop}
                          onClick={() => setFilters(prev => ({ ...prev, crop: prev.crop === crop ? 'All' : crop }))}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-all ${
                            filters.crop === crop 
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-700'
                          }`}
                        >
                          {crop} <span className={`ml-1 opacity-60 ${filters.crop === crop ? 'text-emerald-100' : 'text-slate-400'}`}>({count})</span>
                        </button>
                      ))}
                    </div>
                 </div>
               )}
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      <th className="w-8 py-3 px-4"></th>
                      <th className="py-3 pr-4 cursor-pointer hover:text-emerald-600 transition-colors group" onClick={() => handleSort('Crop')}>
                        <div className="flex items-center">Crop Type {getSortIcon('Crop')}</div>
                      </th>
                      <th className="py-3 px-4 cursor-pointer hover:text-emerald-600 transition-colors group" onClick={() => handleSort('Year')}>
                        <div className="flex items-center">Year {getSortIcon('Year')}</div>
                      </th>
                      <th className="py-3 px-4 cursor-pointer hover:text-emerald-600 transition-colors group" onClick={() => handleSort('Location')}>
                        <div className="flex items-center">Location {getSortIcon('Location')}</div>
                      </th>
                      <th className="py-3 px-4 w-1/4">Treatment</th>
                      <th className="py-3 px-4 pr-6 text-right cursor-pointer hover:text-emerald-600 transition-colors group" onClick={() => handleSort('Advantage_pct')}>
                        <div className="flex items-center justify-end">Advantage {getSortIcon('Advantage_pct')}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedTrials.length > 0 ? (
                      sortedTrials.map((trial, index) => (
                        <TrialRow key={`${trial.Year}-${trial.Location}-${index}`} trial={trial} />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-12 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <Search size={32} strokeWidth={1.5} className="mb-3 opacity-50" />
                            <p className="text-sm font-medium">No results match your criteria</p>
                            <button 
                              onClick={() => setFilters({ search: '', crop: 'All', country: 'All', product: 'All' })}
                              className="mt-2 text-emerald-600 hover:text-emerald-700 text-xs font-bold uppercase tracking-wide"
                            >
                              Clear Filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Showing {sortedTrials.length} Records
                </span>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default App;