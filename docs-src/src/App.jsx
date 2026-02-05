import React, { useState } from 'react';
import { 
  Database, 
  Server, 
  Layout, 
  FileSpreadsheet, 
  ArrowDown, 
  ArrowRight, 
  ArrowLeft,
  ArrowUp,
  Cpu, 
  MessageSquare, 
  Layers, 
  Activity,
  Menu,
  X,
  Bot,
  Terminal,
  BookOpen,
  Lightbulb,
  ShieldAlert,
  Target,
  Clock,
  DollarSign,
  Users,
  CloudLightning,
  Cloud,
  Workflow,
  Table,
  Presentation,
  FileText,
  StickyNote,
  Zap,
  AlertCircle,
  Play,
  Calendar,
  TrendingUp,
  CreditCard,
  Radio,
  FileJson
} from 'lucide-react';

const InTouchDocs = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sections = [
    { id: 'overview', label: 'Architecture Overview', icon: <Layout className="w-4 h-4" /> },
    { id: 'upstream-etl', label: 'Upstream ETL (Snowflake)', icon: <Cloud className="w-4 h-4" /> },
    { id: 'pipeline', label: 'Data Pipeline Engine', icon: <Database className="w-4 h-4" /> },
    { id: 'spreadsheet', label: 'Spreadsheet Structure', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'ui-layer', label: 'User Interface', icon: <Layers className="w-4 h-4" /> },
    { id: 'ai-features', label: 'AI Functionality', icon: <Bot className="w-4 h-4" /> },
    { id: 'logging', label: 'Live Central Logging', icon: <Activity className="w-4 h-4" /> },
    { id: 'strategy', label: 'Strategic Frameworks', icon: <Lightbulb className="w-4 h-4" /> },
  ];

  const scrollToSection = (id) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bot className="text-blue-400" />
            InTouch <span className="text-slate-400 font-light">Docs</span>
          </h1>
          <p className="text-xs text-slate-500 mt-2">System & Strategy v2.9</p>
        </div>
        <nav className="p-4 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeSection === section.id 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-full relative scroll-smooth">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-slate-800">InTouch Docs</span>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600">
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        <div className="max-w-6xl mx-auto p-8 space-y-16 pb-32">
          
          {/* Header */}
          <header className="mb-12">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">InTouch System Reference</h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-3xl">
              Complete documentation covering the technical architecture, data pipelines, and strategic frameworks for the InTouch system used by RSS Account Managers.
            </p>
          </header>

          {/* Section: Architecture Overview */}
          <section id="overview" className="scroll-mt-8">
            <SectionHeader title="High-Level System Workflow" icon={<Layout />} />
            
            {/* WIREFRAME DIAGRAM */}
            <div className="bg-slate-100 p-8 rounded-xl border border-slate-300 mb-12 overflow-x-auto">
              <div className="min-w-[900px] flex flex-col gap-12">
                
                {/* Workflow Row 1: Main Data Flow */}
                <div className="flex justify-between items-start relative z-10">
                  
                  {/* Phase 1: Data Origin */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data Origin</div>
                    <div className="bg-white p-4 rounded shadow-sm border border-slate-300 w-48 text-center space-y-2 h-32 flex flex-col justify-center">
                      <div className="flex justify-center gap-2 mb-1">
                        <Cloud className="text-blue-400 w-5 h-5" />
                        <Database className="text-indigo-400 w-5 h-5" />
                      </div>
                      <div className="font-bold text-slate-700">Source Systems</div>
                      <div className="text-[10px] text-slate-500">
                        Salesforce • Snowflake<br/>Events • Tasks
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="text-slate-300 w-8 h-8 mt-12 flex-shrink-0" />

                  {/* Phase 2: ETL Layer */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">ETL Layer</div>
                    <div className="bg-white p-4 rounded shadow-sm border border-slate-300 w-48 text-center space-y-2 h-32 flex flex-col justify-center">
                      <Workflow className="text-orange-400 w-6 h-6 mx-auto mb-1" />
                      <div className="font-bold text-slate-700">Unload Sheets</div>
                      <div className="text-[10px] text-slate-500">
                        STATCORE • SYSCORE<br/>DAGCORE
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="text-slate-300 w-8 h-8 mt-12 flex-shrink-0" />

                  {/* Phase 3: InTouch Core */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">InTouch Core</div>
                    <div className="bg-blue-50 p-4 rounded shadow-md border-2 border-blue-200 w-48 text-center space-y-2 h-32 flex flex-col justify-center relative">
                      <Cpu className="text-blue-600 w-6 h-6 mx-auto mb-1" />
                      <div className="font-bold text-blue-900">Data Pipeline</div>
                      <div className="text-[10px] text-blue-700">
                        Nightly Refresh<br/>Logic & Rules
                      </div>
                      {/* Drop Line to Log */}
                      <div className="absolute bottom-0 left-1/2 w-0.5 h-12 bg-blue-200 translate-y-full"></div>
                    </div>
                  </div>

                  <ArrowRight className="text-slate-300 w-8 h-8 mt-12 flex-shrink-0" />

                  {/* Phase 4: User Experience */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">User Experience</div>
                    <div className="bg-white p-4 rounded shadow-lg border border-slate-300 w-56 space-y-3 relative h-32 flex flex-col justify-center">
                      <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                        User
                      </div>
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="text-green-600 w-5 h-5" />
                        <div className="text-left">
                          <div className="font-bold text-slate-800 text-sm">Local Sheets</div>
                          <div className="text-[10px] text-slate-500">AM Tabs • AI Panel</div>
                        </div>
                      </div>
                      {/* Drop Line to Log */}
                      <div className="absolute bottom-0 left-1/2 w-0.5 h-12 bg-slate-300 translate-y-full"></div>
                    </div>
                  </div>
                </div>

                {/* Workflow Row 2: Central Logging (Feedback Loop) */}
                <div className="relative pl-[520px] pr-12">
                   <div className="border-t-2 border-dashed border-slate-200 absolute top-6 left-[380px] right-[110px] z-0"></div>
                   
                   <div className="bg-slate-800 text-white p-4 rounded-lg shadow-xl border border-slate-600 relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="bg-slate-700 p-2 rounded">
                            <Activity className="w-6 h-6 text-green-400 animate-pulse" />
                         </div>
                         <div>
                            <div className="font-bold">Central Log Sheet</div>
                            <div className="text-xs text-slate-400">Live Telemetry Aggregation</div>
                         </div>
                      </div>
                      
                      <div className="flex gap-8 text-xs text-slate-300">
                         <div className="text-center">
                            <span className="block font-bold text-blue-400">Refresh</span>
                            <span className="text-[10px]">Performance Stats</span>
                         </div>
                         <div className="text-center">
                            <span className="block font-bold text-purple-400">AI Usage</span>
                            <span className="text-[10px]">Token Cost</span>
                         </div>
                         <div className="text-center">
                            <span className="block font-bold text-orange-400">Activity</span>
                            <span className="text-[10px]">User Actions</span>
                         </div>
                      </div>
                   </div>
                </div>

              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-8">
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6 flex items-start gap-4">
                <Users className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                    <h3 className="font-bold text-blue-900 mb-1">Target User Base</h3>
                    <p className="text-sm text-blue-800 leading-relaxed">
                    InTouch is an internal tool designed specifically for <strong>RSS Account Managers and Leaders</strong>. It is not a consumer-facing application. The system supports ~15 local spreadsheets distributed across global territories.
                    </p>
                </div>
              </div>

              {/* Layer 1: External Data */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">External Data Sources</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {[
                    { name: 'STATCORE', origin: 'Snowflake API', type: 'Master Data', icon: <CloudLightning className="w-3 h-3 text-blue-400" /> },
                    { name: 'SYSCORE', origin: 'Events/Tasks -> SFDC', type: 'System Status', icon: <Database className="w-3 h-3 text-blue-400" /> },
                    { name: 'DAGCORE', origin: 'Snowflake (Distro)', type: 'Performance', icon: <CloudLightning className="w-3 h-3 text-blue-400" /> },
                    { name: 'BENCHMARKS', origin: 'External Sheet', type: 'Market Data', icon: <FileSpreadsheet className="w-3 h-3 text-green-500" /> },
                    { name: 'CENTRAL LOG', origin: 'Google Sheet', type: 'Live Monitor', icon: <Zap className="w-3 h-3 text-orange-500" /> }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col items-center justify-center text-center h-24 shadow-sm hover:border-blue-300 transition-colors relative overflow-hidden">
                      <div className="mb-1">{item.icon}</div>
                      <div className="font-bold text-xs text-slate-700">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 bg-white px-1.5 py-0.5 rounded border border-slate-100 z-10 relative">
                        {item.origin}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center mt-2">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">
                        Note: Eventcore & Taskcore flow directly into SYSCORE
                    </span>
                </div>
              </div>

              {/* Connector */}
              <div className="flex justify-center">
                <ArrowDown className="text-slate-300 animate-bounce" />
              </div>

              {/* Layer 2: Pipeline */}
              <div className="relative bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-100 px-3 py-1 rounded-full text-xs font-bold text-blue-700 border border-blue-200 shadow-sm">
                  Data Pipeline Engine (Scheduled Overnight Refresh)
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-2">
                  <PipelineStep step="1" title="updateSTATCORE" desc="Filter by AM (NA/INTL)" />
                  <ArrowRight className="hidden md:block text-blue-300" />
                  <ArrowDown className="md:hidden text-blue-300" />
                  <PipelineStep step="2" title="runSYSCORE" desc="Ingest Events/Tasks" />
                  <ArrowRight className="hidden md:block text-blue-300" />
                  <ArrowDown className="md:hidden text-blue-300" />
                  <PipelineStep step="3" title="runDAGCORE" desc="Metrics Match" />
                  <ArrowRight className="hidden md:block text-blue-300" />
                  <ArrowDown className="md:hidden text-blue-300" />
                  <PipelineStep step="4" title="Notes Engine" desc="Dynamic Stickies" />
                </div>
              </div>

              {/* Connector */}
              <div className="flex justify-center">
                <ArrowDown className="text-slate-300" />
              </div>

              {/* Layer 3: Local Spreadsheet */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
                <div className="text-center mb-4">
                  <h3 className="font-bold text-green-800 flex items-center justify-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    Local Spreadsheets (~15 Files)
                  </h3>
                  <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                    <span>Segmentation: NA / INTL</span>
                  </div>
                </div>
                
                {/* AM Tabs */}
                <div className="bg-white border-2 border-dashed border-green-300 rounded-lg p-6">
                  <p className="text-xs text-green-600 font-bold mb-4 uppercase tracking-wide text-center">User Interaction Layer (AM Personal Tabs)</p>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 text-center">
                          <span className="block text-xs font-bold text-slate-700 mb-1">Managed Accounts</span>
                          <span className="text-xs text-slate-500">Routed by AM Name</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 text-center">
                          <span className="block text-xs font-bold text-slate-700 mb-1">CQ Accounts</span>
                          <span className="text-xs text-slate-500">Routed by Territory Manager</span>
                      </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    {['Erin (AM)', 'Mike (AM)', 'Sara (AM)', 'Kevin (AM)', 'Manager Lens'].map(tab => (
                      <div key={tab} className="bg-green-600 text-white rounded-t-lg px-4 py-2 text-sm font-medium shadow-md mt-auto">
                        {tab}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Upstream ETL (NEW) */}
          <section id="upstream-etl" className="scroll-mt-8">
            <SectionHeader title="Upstream ETL (Snowflake → Sheets)" icon={<Cloud />} />
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
               <div className="p-6 border-b border-slate-100 bg-slate-50">
                 <h3 className="font-bold text-slate-800 mb-2">High-Level Data Flow</h3>
                 <p className="text-sm text-slate-600">
                   InTouch consumes data that is pre-processed in Snowflake and "unloaded" to intermediate Google Sheets via Airflow.
                 </p>
               </div>
               
               <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col items-center text-center w-full md:w-1/5">
                    <Database className="w-8 h-8 text-indigo-500 mb-2" />
                    <span className="font-bold text-sm text-slate-700">Source Systems</span>
                    <span className="text-xs text-slate-400">Salesforce, Warehouse</span>
                  </div>
                  
                  <ArrowRight className="text-slate-300 hidden md:block" />
                  <ArrowDown className="text-slate-300 md:hidden" />

                  <div className="flex flex-col items-center text-center w-full md:w-1/5">
                    <CloudLightning className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="font-bold text-sm text-slate-700">Snowflake</span>
                    <span className="text-xs text-slate-400">Transforms & Views</span>
                  </div>

                  <ArrowRight className="text-slate-300 hidden md:block" />
                  <ArrowDown className="text-slate-300 md:hidden" />

                  <div className="flex flex-col items-center text-center w-full md:w-1/5">
                    <Workflow className="w-8 h-8 text-orange-500 mb-2" />
                    <span className="font-bold text-sm text-slate-700">Airflow Operator</span>
                    <span className="text-xs text-slate-400">SnowflakeToGoogleSheet</span>
                  </div>

                  <ArrowRight className="text-slate-300 hidden md:block" />
                  <ArrowDown className="text-slate-300 md:hidden" />

                  <div className="flex flex-col items-center text-center w-full md:w-1/5">
                    <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2" />
                    <span className="font-bold text-sm text-slate-700">Intermediate Sheets</span>
                    <span className="text-xs text-slate-400">"Unloads"</span>
                  </div>

                  <ArrowRight className="text-slate-300 hidden md:block" />
                  <ArrowDown className="text-slate-300 md:hidden" />

                  <div className="flex flex-col items-center text-center w-full md:w-1/5 bg-blue-50 p-2 rounded border border-blue-100">
                    <Bot className="w-8 h-8 text-blue-600 mb-2" />
                    <span className="font-bold text-sm text-slate-800">InTouch</span>
                    <span className="text-xs text-slate-500">User</span>
                  </div>
               </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                   <Table className="w-4 h-4 text-slate-400" />
                   Destination Matrix (EDS)
                </h4>
                <div className="space-y-4">
                   <DestinationItem 
                      title="STATCORE"
                      id="1bh4XfKM8l5MoTHHQzjP22Lln9yWBljHzmGHan_qA9Qk"
                      variant="Global / Intl"
                      source="VW_GLOBALREPORT" 
                   />
                   <DestinationItem 
                      title="DAGCORE"
                      id="1Rp42PivUzqnm3VzV15g_R9KcairXX9dWGOfIjeotzTQ"
                      variant="Global / Intl"
                      source="RIDSTATS, CHARM, POS" 
                   />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <Activity className="w-4 h-4 text-slate-400" />
                     Activity Feeds Configuration
                  </h4>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                      <div className="text-xs font-bold text-yellow-800 mb-2 uppercase">Critical Data Flow</div>
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                          <span className="bg-white px-2 py-1 rounded border">Eventcore</span>
                          <span>+</span>
                          <span className="bg-white px-2 py-1 rounded border">Taskcore</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="bg-blue-100 px-2 py-1 rounded border border-blue-200 font-bold">SYSCORE</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="bg-green-100 px-2 py-1 rounded border border-green-200 font-bold">STATCORE (Local)</span>
                      </div>
                  </div>
                  <DestinationItem 
                    title="SYSCORE"
                    id="1V4C9mIL4ISP4rx2tJcpPhflM-RIi4eft_xDZWAgWmGU"
                    variant="System Status & Activity"
                    source="Aggregates Events & Tasks" 
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section: Data Pipeline */}
          <section id="pipeline" className="scroll-mt-8">
            <SectionHeader title="Data Pipeline Engine (InTouch)" icon={<Database />} />
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-6 border-b border-slate-100">
                 <p className="text-slate-600 mb-4">
                   Runs nightly via <code className="text-blue-600">runMasterPipeline()</code> (Scheduled Overnight Refresh).
                 </p>
               </div>
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                   <tr>
                     <th className="px-6 py-3">Step</th>
                     <th className="px-6 py-3">Function</th>
                     <th className="px-6 py-3">Source &rarr; Target</th>
                     <th className="px-6 py-3">Volume</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   <tr>
                     <td className="px-6 py-4 font-mono text-slate-400">01</td>
                     <td className="px-6 py-4 font-semibold text-blue-600">updateSTATCORE()</td>
                     <td className="px-6 py-4 text-slate-600">External Master &rarr; Local STATCORE</td>
                     <td className="px-6 py-4 text-slate-500">4,000 rows (Batch)</td>
                   </tr>
                   <tr>
                     <td className="px-6 py-4 font-mono text-slate-400">02</td>
                     <td className="px-6 py-4 font-semibold text-blue-600">runSYSCOREUpdates()</td>
                     <td className="px-6 py-4 text-slate-600">SYSCORE (Events/Tasks) &rarr; Columns AH-AT</td>
                     <td className="px-6 py-4 text-slate-500">3,000 rows</td>
                   </tr>
                   <tr>
                     <td className="px-6 py-4 font-mono text-slate-400">03</td>
                     <td className="px-6 py-4 font-semibold text-blue-600">runDAGCOREUpdates()</td>
                     <td className="px-6 py-4 text-slate-600">Metrics Source &rarr; DISTRO Sheet</td>
                     <td className="px-6 py-4 text-slate-500">4,000 rows</td>
                   </tr>
                   <tr>
                     <td className="px-6 py-4 font-mono text-slate-400">04</td>
                     <td className="px-6 py-4 font-semibold text-purple-600">updateAccountNotes()</td>
                     <td className="px-6 py-4 text-slate-600">NOTE_CONFIG Rules &rarr; Sticky Notes</td>
                     <td className="px-6 py-4 text-slate-500">Per AM Sheet</td>
                   </tr>
                 </tbody>
               </table>
            </div>
          </section>

          {/* Section: Spreadsheet Structure */}
          <section id="spreadsheet" className="scroll-mt-8">
            <SectionHeader title="Spreadsheet & UI Structure" icon={<FileSpreadsheet />} />
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Sheet Visualizer */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Fake Sheet UI with Sticky Note Visual */}
                <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden relative min-h-[350px] bg-slate-50">
                   
                   {/* UPDATED STICKY NOTE VISUAL - Production Style */}
                   <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20 w-80 shadow-2xl font-sans text-xs text-slate-800 overflow-hidden bg-white border border-slate-300 rounded-lg">
                      
                      {/* Note Header */}
                      <div className="bg-gradient-to-r from-slate-50 to-white px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                         <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">JD</div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm leading-tight">Joe's Diner</div>
                                <div className="text-[10px] text-slate-400 font-mono">RID: 123456 • NYC</div>
                            </div>
                         </div>
                         <div className="bg-green-100 text-green-700 text-[9px] uppercase px-2 py-1 rounded font-bold tracking-wider">
                            Active
                         </div>
                      </div>

                      <div className="p-0">
                         {/* Status Bar */}
                         <div className="flex divide-x divide-slate-100 border-b border-slate-100">
                            <div className="flex-1 p-2 text-center bg-red-50/50">
                               <div className="text-[9px] text-red-400 uppercase font-semibold mb-0.5">Contract End</div>
                               <div className="font-bold text-red-600">03/15/26</div>
                               <div className="text-[9px] text-red-400 italic">45 days left</div>
                            </div>
                            <div className="flex-1 p-2 text-center">
                               <div className="text-[9px] text-slate-400 uppercase font-semibold mb-0.5">System</div>
                               <div className="font-bold text-slate-700">GuestCenter Pro</div>
                               <div className="text-[9px] text-slate-400">JoeCorp Group</div>
                            </div>
                         </div>

                         {/* Metrics Grid */}
                         <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                            <div className="p-3 text-center">
                               <div className="text-[9px] text-slate-400 uppercase font-semibold mb-1">Revenue</div>
                               <div className="font-bold text-slate-700 text-sm">$1,234</div>
                               <div className="text-[9px] text-green-500 flex items-center justify-center gap-0.5">
                                  <TrendingUp className="w-2 h-2" /> +5%
                               </div>
                            </div>
                            <div className="p-3 text-center">
                               <div className="text-[9px] text-slate-400 uppercase font-semibold mb-1">Covers</div>
                               <div className="font-bold text-slate-700 text-sm">450</div>
                               <div className="text-[9px] text-slate-400">Last 30d</div>
                            </div>
                            <div className="p-3 text-center">
                               <div className="text-[9px] text-slate-400 uppercase font-semibold mb-1">Disco %</div>
                               <div className="font-bold text-blue-600 text-sm">23%</div>
                               <div className="text-[9px] text-slate-400">Healthy</div>
                            </div>
                         </div>

                         {/* Footer Actions */}
                         <div className="bg-slate-50 p-2 flex justify-between items-center text-[10px] text-slate-500">
                            <div className="flex items-center gap-1">
                               <Clock className="w-3 h-3 text-slate-400" />
                               <span>Last Touch: <strong>01/15/26</strong></span>
                            </div>
                            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                               <CreditCard className="w-3 h-3 text-slate-400" />
                               <span>Auto-Pay</span>
                            </div>
                         </div>
                      </div>
                   </div>

                  <div className="bg-green-600 px-4 py-2 text-white text-sm font-bold flex justify-between">
                    <span>Erin (AM) - View</span>
                    <span className="opacity-75 font-normal">Sheet 1 of 12</span>
                  </div>
                  <div className="overflow-x-auto opacity-30 hover:opacity-100 transition-opacity">
                    <table className="min-w-full text-xs border-collapse">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="border p-2 w-8 bg-slate-200"></th>
                          <th className="border p-2 text-slate-500 font-normal">A</th>
                          <th className="border p-2 text-slate-500 font-normal">B</th>
                          <th className="border p-2 text-slate-500 font-normal">C</th>
                          <th className="border p-2 text-slate-500 font-normal">D</th>
                          <th className="border p-2 text-slate-500 font-normal">E</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-slate-50">
                          <td className="border p-2 bg-slate-100 text-center font-mono text-slate-400">2</td>
                          <td className="border p-2 font-bold text-slate-400">Hidden</td>
                          <td className="border p-2 font-bold bg-yellow-50 text-yellow-800 border-yellow-200">Smart Select</td>
                          <td className="border p-2 font-bold text-blue-600">Notes*</td>
                          <td className="border p-2 font-bold">RID</td>
                          <td className="border p-2 font-bold">Account Name</td>
                        </tr>
                        <tr>
                          <td className="border p-2 bg-slate-100 text-center font-mono text-slate-400">3</td>
                          <td className="border p-2 text-slate-300">...</td>
                          <td className="border p-2 text-center"><input type="checkbox" className="rounded" /></td>
                          <td className="border p-2 text-center group relative cursor-help">
                            <div className="w-2 h-2 bg-red-400 rounded-full mx-auto"></div>
                          </td>
                          <td className="border p-2 font-mono text-slate-600">12345</td>
                          <td className="border p-2">Joe's Diner</td>
                        </tr>
                        <tr className="bg-blue-50/30">
                          <td className="border p-2 bg-slate-100 text-center font-mono text-slate-400">4</td>
                          <td className="border p-2 text-slate-300">...</td>
                          <td className="border p-2 text-center"><input type="checkbox" checked readOnly className="rounded text-blue-600" /></td>
                          <td className="border p-2 text-center"><div className="w-2 h-2 bg-green-400 rounded-full mx-auto"></div></td>
                          <td className="border p-2 font-mono text-slate-600">67890</td>
                          <td className="border p-2">Jane's Cafe</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded border border-slate-200">
                    <h5 className="font-bold text-sm mb-2">Event Triggers</h5>
                    <ul className="text-xs space-y-2 text-slate-600">
                      <li className="flex items-start gap-2">
                        <span className="bg-slate-200 p-0.5 rounded font-mono">onEdit(e)</span>
                        Handles checkbox clicks and Note edits.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-yellow-100 text-yellow-800 p-0.5 rounded font-mono">Smart Select</span>
                        Checking the box moves account to "Focus20" sheet automatically.
                      </li>
                    </ul>
                  </div>
                  <div className="bg-slate-50 p-4 rounded border border-slate-200">
                    <h5 className="font-bold text-sm mb-2">Sticky Notes</h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Hover over the Notes column (C) to see dynamic HTML notes generated nightly based on account health, contract status, and revenue.
                    </p>
                  </div>
                </div>

                {/* Dynamic Columns Feature */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-4">
                  <h5 className="font-bold text-sm mb-3 text-indigo-900 flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    Dynamic Column Headers
                  </h5>
                  <p className="text-xs text-indigo-800 mb-4">
                    <strong>Double-click any column header</strong> in Row 2 to open a dropdown and change the displayed metric. AI Chat can also change columns automatically.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { col: 'I', name: 'Location', options: 'Metro, Macro, Neighborhood' },
                      { col: 'J-L', name: 'Dates & Activity', options: 'Event Date, Task Date, Focus20, Contract Alerts' },
                      { col: 'M-O', name: 'Status Info', options: 'Status, System Type, No Bookings' },
                      { col: 'P-R', name: 'System Stats', options: 'POS Type, Active PI/XP, Exclusive Pricing' },
                      { col: 'S-U', name: 'Percentages', options: 'Disco %, CVR YoY%, PI Rev Share %' },
                      { col: 'V-X', name: 'Revenue', options: 'Yield, PI Revenue, Past Due' },
                      { col: 'Y-AA', name: 'Covers', options: 'Network, Discovery, Google, PI' },
                      { col: 'AB-AD', name: 'Pricing', options: 'Cover Price, Sub Fees' },
                    ].map((section, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border border-indigo-100 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-indigo-700">{section.name}</span>
                          <span className="text-[10px] font-mono text-indigo-400">{section.col}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate" title={section.options}>{section.options}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-indigo-600">
                    <span className="bg-white px-2 py-1 rounded border border-indigo-200">Fixed: D (Smart Select), F (Parent), H (iQ)</span>
                  </div>
                </div>

              </div>

              {/* Core Sheet List */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-700">Protected Core Sheets</h4>
                <div className="space-y-2">
                  {[
                    {name: 'STATCORE', desc: 'Master account data (30k rows)'},
                    {name: 'DISTRO', desc: 'Distribution metrics (Revenue, CVR)'},
                    {name: 'SETUP', desc: 'Config, Slides ID, AM List'},
                    {name: 'NOTE_CONFIG', desc: 'Formulas for sticky notes'},
                    {name: 'Refresh', desc: 'System logs (Pattern 6)'},
                    {name: 'Launcher', desc: 'Template for new AM tabs'},
                  ].map((s) => (
                    <div key={s.name} className="flex flex-col p-3 bg-white border border-slate-200 rounded shadow-sm">
                      <span className="font-mono text-sm font-bold text-green-700">{s.name}</span>
                      <span className="text-xs text-slate-500">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Section: UI Layer */}
          <section id="ui-layer" className="scroll-mt-8">
            <SectionHeader title="User Interface Layer" icon={<Layers />} />
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Menu className="w-4 h-4" /> Spreadsheet Menus
                </h4>
                <ul className="text-sm space-y-2 text-slate-600">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> InTouch AI Panel</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Admin: Fleet Commander</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Admin: Create/Delete Tabs</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Focus20: Add/Remove RIDs</li>
                </ul>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="font-bold text-indigo-700 mb-2 flex items-center gap-2">
                  <Bot className="w-4 h-4" /> AI Sidebar (HTML)
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-2 rounded text-xs text-center border border-indigo-100 text-indigo-600">Meeting Prep</div>
                  <div className="bg-white p-2 rounded text-xs text-center border border-indigo-100 text-indigo-600">Pricing Sim</div>
                  <div className="bg-white p-2 rounded text-xs text-center border border-indigo-100 text-indigo-600">Bucket Summary</div>
                  <div className="bg-white p-2 rounded text-xs text-center border border-indigo-100 text-indigo-600 font-bold">Bucket IQ</div>
                </div>
                <div className="mt-2 text-[10px] text-indigo-500 text-center">Bucket IQ = AI Chat + Free Google + Feedback</div>
              </div>
            </div>
          </section>

          {/* Section: AI Functionality */}
          <section id="ai-features" className="scroll-mt-8">
             <SectionHeader title="AI Functionality" icon={<Bot />} />
             
             <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
                <p className="text-slate-600">The <strong>InTouch✔ ai</strong> panel offers AI-driven workflows with intelligent query routing and cost optimization:</p>
                
                <div className="grid md:grid-cols-3 gap-6">
                   <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                      <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center mb-4 text-blue-600">
                         <MessageSquare className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-800 mb-2">1. Bucket IQ Chat</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                         <strong>Smart AI Chat.</strong> Ask about your portfolio with intelligent query routing: simple questions use Gemini Flash, complex analysis uses Gemini Pro with context caching for 50% cost savings.
                      </p>
                   </div>
                   
                   <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                      <div className="bg-indigo-100 w-10 h-10 rounded-full flex items-center justify-center mb-4 text-indigo-600">
                         <FileText className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-800 mb-2">2. AI Brief</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                         <strong>Text Summary.</strong> Generates a concise text briefing of an account's health, history, and opportunities. Designed to be copied/pasted or read for quick pre-meeting context.
                      </p>
                   </div>

                   <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                      <div className="bg-purple-100 w-10 h-10 rounded-full flex items-center justify-center mb-4 text-purple-600">
                         <Presentation className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-800 mb-2">3. Presentation Creator</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                         <strong>Slide Generation.</strong> Auto-generates a Google Slides deck for a specific account, pre-filled with benchmark data, charts, and account insights.
                      </p>
                   </div>
                </div>

                {/* Free Google Cohort System */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
                   <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" /> Free Google Cohort System (Q1 2026)
                   </h4>
                   <p className="text-sm text-green-700 mb-4">
                      The Free Google Initiative is integrated directly into the Bucket IQ tab. Accounts are automatically grouped by strategic cohort.
                   </p>
                   
                   <div className="grid md:grid-cols-5 gap-3 mb-4">
                      {[
                         { name: "PI Reinvestment", play: "PI Booster", priority: 1 },
                         { name: "Unsecured Contracts", play: "Save At-Risk", priority: 2 },
                         { name: "Low Hanging Fruit", play: "Discount Swap", priority: 3 },
                         { name: "Partial Sub Reinvest", play: "Hybrid", priority: 4 },
                         { name: "Other", play: "Standard Eval", priority: 5 },
                      ].map((cohort, idx) => (
                         <div key={idx} className="bg-white p-3 rounded border border-green-100 text-center">
                            <div className="text-[10px] text-green-500 font-bold mb-1">P{cohort.priority}</div>
                            <div className="font-bold text-xs text-slate-700 mb-1">{cohort.name}</div>
                            <div className="text-[10px] text-slate-500">{cohort.play}</div>
                         </div>
                      ))}
                   </div>

                   <div className="bg-white p-4 rounded border border-green-100">
                      <h5 className="font-bold text-sm text-slate-700 mb-2">Free Google Workflow</h5>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                         <span className="bg-green-100 px-2 py-1 rounded">1. Browse Cohorts</span>
                         <ArrowRight className="w-3 h-3 text-slate-400" />
                         <span className="bg-green-100 px-2 py-1 rounded">2. Click RID</span>
                         <ArrowRight className="w-3 h-3 text-slate-400" />
                         <span className="bg-green-100 px-2 py-1 rounded">3. Paste in Chat</span>
                         <ArrowRight className="w-3 h-3 text-slate-400" />
                         <span className="bg-green-100 px-2 py-1 rounded">4. Choose Strategy</span>
                         <ArrowRight className="w-3 h-3 text-slate-400" />
                         <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Quick / Full / Glean</span>
                      </div>
                   </div>
                </div>

                {/* Query Classification */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                   <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-slate-500" /> Query Classification & Cost Optimization
                   </h4>
                   <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-white p-3 rounded border border-slate-200">
                         <div className="font-bold text-sm text-slate-700 mb-1">Scripted</div>
                         <div className="text-[10px] text-slate-500">Definitions, how-to, glossary</div>
                         <div className="text-[10px] text-green-600 font-bold mt-1">No API call</div>
                      </div>
                      <div className="bg-white p-3 rounded border border-slate-200">
                         <div className="font-bold text-sm text-blue-600 mb-1">Gemini Flash</div>
                         <div className="text-[10px] text-slate-500">Simple lookups, status checks</div>
                         <div className="text-[10px] text-blue-600 font-bold mt-1">Fast & cheap</div>
                      </div>
                      <div className="bg-white p-3 rounded border border-slate-200">
                         <div className="font-bold text-sm text-purple-600 mb-1">Gemini Pro</div>
                         <div className="text-[10px] text-slate-500">Analysis, strategy, comparisons</div>
                         <div className="text-[10px] text-purple-600 font-bold mt-1">Context cache: 50% savings</div>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          {/* Section: Logging */}
          <section id="logging" className="scroll-mt-8">
             <SectionHeader title="Live Central Logging" icon={<Activity />} />
             <div className="flex flex-col md:flex-row gap-6 items-center bg-white p-6 rounded-xl border border-slate-200">
                <div className="flex-1 space-y-4">
                   <p className="text-slate-600">
                     The <strong>Central Log</strong> is a dedicated spreadsheet that receives <span className="text-green-600 font-bold bg-green-50 px-1 rounded border border-green-200 inline-flex items-center gap-1"><Zap className="w-3 h-3 fill-current" /> LIVE</span> updates from all ~15 local InTouch files as users interact with the system.
                   </p>
                   <ul className="space-y-3">
                     <li className="flex items-center gap-3 bg-slate-50 p-3 rounded">
                       <Terminal className="text-slate-400 w-5 h-5" />
                       <div>
                         <span className="block text-sm font-bold text-slate-700">Refresh Log</span>
                         <span className="text-xs text-slate-500">Tracks pipeline execution time and row counts.</span>
                       </div>
                     </li>
                     <li className="flex items-center gap-3 bg-slate-50 p-3 rounded">
                       <MessageSquare className="text-slate-400 w-5 h-5" />
                       <div>
                         <span className="block text-sm font-bold text-slate-700">Prompt Log</span>
                         <span className="text-xs text-slate-500">Analyzes AI chat queries and routing types.</span>
                       </div>
                     </li>
                     <li className="flex items-center gap-3 bg-slate-50 p-3 rounded">
                       <Cpu className="text-slate-400 w-5 h-5" />
                       <div>
                         <span className="block text-sm font-bold text-slate-700">API Usage</span>
                         <span className="text-xs text-slate-500">Monitors Gemini token consumption.</span>
                       </div>
                     </li>
                     <li className="flex items-center gap-3 bg-green-50 p-3 rounded border border-green-200">
                       <BookOpen className="text-green-500 w-5 h-5" />
                       <div>
                         <span className="block text-sm font-bold text-green-700">Feedback Log</span>
                         <span className="text-xs text-green-600">User ratings and corrections for AI improvement.</span>
                       </div>
                     </li>
                   </ul>
                </div>
                <div className="w-full md:w-1/3 bg-slate-100 rounded-lg p-4 border border-slate-200 text-center relative">
                  <div className="absolute top-2 right-2 flex gap-1 items-center bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                     <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                     <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Live Feed</span>
                  </div>
                  
                  {/* CENTRAL LOG VISUALIZATION - Specific Data Types */}
                  <div className="bg-white p-4 rounded shadow mb-4 mt-4 text-left">
                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                        <Activity className="w-4 h-4 text-orange-500" />
                        <div className="font-bold text-slate-800 text-sm">Central Log Sheet</div>
                    </div>
                    
                    <div className="space-y-2">
                        {/* Interaction Log Packet */}
                        <div className="flex items-center gap-2 text-xs bg-slate-50 p-1.5 rounded border border-slate-100">
                            <Radio className="w-3 h-3 text-blue-400 animate-pulse" />
                            <span className="font-mono text-slate-600 font-bold">INTERACTION:</span>
                            <span className="text-slate-500">Sidebar Opened (LA)</span>
                        </div>
                        {/* Refresh Log Packet */}
                        <div className="flex items-center gap-2 text-xs bg-slate-50 p-1.5 rounded border border-slate-100">
                            <Radio className="w-3 h-3 text-green-400 animate-pulse delay-75" />
                            <span className="font-mono text-slate-600 font-bold">REFRESH:</span>
                            <span className="text-slate-500">Pipeline Success (4s)</span>
                        </div>
                        {/* API Usage Packet */}
                        <div className="flex items-center gap-2 text-xs bg-slate-50 p-1.5 rounded border border-slate-100">
                            <Radio className="w-3 h-3 text-purple-400 animate-pulse delay-150" />
                            <span className="font-mono text-slate-600 font-bold">API_USAGE:</span>
                            <span className="text-slate-500">450 Tokens (Gemini)</span>
                        </div>
                        {/* Prompt Log Packet */}
                        <div className="flex items-center gap-2 text-xs bg-slate-50 p-1.5 rounded border border-slate-100">
                            <Radio className="w-3 h-3 text-orange-400 animate-pulse delay-200" />
                            <span className="font-mono text-slate-600 font-bold">PROMPT:</span>
                            <span className="text-slate-500">"Show Risky Accts"</span>
                        </div>
                        {/* Feedback Log Packet */}
                        <div className="flex items-center gap-2 text-xs bg-green-50 p-1.5 rounded border border-green-100">
                            <Radio className="w-3 h-3 text-green-400 animate-pulse delay-300" />
                            <span className="font-mono text-green-600 font-bold">FEEDBACK:</span>
                            <span className="text-slate-500">Thumbs Up (NYC)</span>
                        </div>
                    </div>
                  </div>

                  <div className="flex justify-center gap-2">
                    <div className="w-16 h-12 bg-green-100 border border-green-300 rounded flex items-center justify-center text-xs font-bold text-green-800">InTouch<br/>LA</div>
                    <div className="w-16 h-12 bg-green-100 border border-green-300 rounded flex items-center justify-center text-xs font-bold text-green-800">InTouch<br/>NYC</div>
                    <div className="w-16 h-12 bg-green-100 border border-green-300 rounded flex items-center justify-center text-xs font-bold text-green-800">InTouch<br/>CHI</div>
                  </div>
                </div>
             </div>
          </section>

          {/* Section: Strategic Frameworks (Moved to End) */}
          <section id="strategy" className="scroll-mt-8">
            <SectionHeader title="Strategic Frameworks" icon={<Lightbulb />} />
            <p className="text-slate-600 mb-8">
              Visualizing the core business logic, decision models, and strategic playbooks extracted from the knowledge base.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              
              {/* 1. The Three-Layer Framework */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-500" /> 
                  The Three-Layer Framework
                </h3>
                <div className="flex items-center gap-8">
                   <div className="flex flex-col-reverse w-48 gap-1">
                      <div className="bg-slate-700 text-white p-4 rounded-b-lg text-center shadow-lg transform hover:scale-105 transition-transform cursor-help" title="Base Layer: Renewal Lifecycle & Contract Health">
                         <div className="font-bold">1. TIME</div>
                         <div className="text-xs opacity-75">Lifecycle</div>
                      </div>
                      <div className="bg-blue-600 text-white p-4 text-center shadow-lg transform hover:scale-105 transition-transform cursor-help z-10" title="Middle Layer: Product Adoption & Value">
                         <div className="font-bold">2. SYSTEM</div>
                         <div className="text-xs opacity-75">Value</div>
                      </div>
                      <div className="bg-green-500 text-white p-4 rounded-t-lg text-center shadow-lg transform hover:scale-105 transition-transform cursor-help" title="Top Layer: Pricing Levers (Freemium, AYCE)">
                         <div className="font-bold">3. ECONOMICS</div>
                         <div className="text-xs opacity-75">Price</div>
                      </div>
                   </div>
                   <div className="flex-1 text-sm text-slate-600 space-y-4">
                      <div className="bg-red-50 p-3 rounded border border-red-100">
                        <span className="font-bold text-red-700 block mb-1">CRITICAL RULE</span>
                        "Fix System BEFORE changing Price."
                      </div>
                      <p>Pricing complaints are often proxies for system/value issues. Solve layers from bottom to top.</p>
                   </div>
                </div>
              </div>

              {/* 2. Renewal Lifecycle */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    Renewal Lifecycle Phases
                 </h3>
                 <div className="space-y-6">
                    <div className="relative pt-6 pb-2">
                       <div className="h-4 bg-slate-100 rounded-full flex overflow-hidden">
                          <div className="w-1/4 bg-blue-200"></div>
                          <div className="w-1/4 bg-indigo-300"></div>
                          <div className="w-1/4 bg-orange-300"></div>
                          <div className="w-1/4 bg-green-300"></div>
                       </div>
                       
                       {/* Markers */}
                       <div className="absolute top-0 left-0 w-full flex justify-between text-xs font-mono text-slate-400">
                          <span>90d</span>
                          <span>60d</span>
                          <span>30d</span>
                          <span>0d</span>
                       </div>

                       <div className="mt-4 grid grid-cols-2 gap-4">
                          <div className="text-xs">
                             <span className="block font-bold text-blue-700">Phase 1: Discover</span>
                             <span className="text-slate-500">{'>'}90 Days Out</span>
                          </div>
                          <div className="text-xs">
                             <span className="block font-bold text-indigo-700">Phase 2: Build Value</span>
                             <span className="text-slate-500">60-90 Days Out</span>
                          </div>
                          <div className="text-xs">
                             <span className="block font-bold text-orange-700">Phase 3: Run & Close</span>
                             <span className="text-slate-500">30-60 Days Out</span>
                          </div>
                          <div className="text-xs">
                             <span className="block font-bold text-green-700">Phase 4: Land</span>
                             <span className="text-slate-500">0-30 Days Post</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* 3. Channel Math */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-2">
                 <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-500" />
                    Channel Hierarchy Math
                 </h3>
                 <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                    
                    {/* Equation 1 */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                       <div className="text-sm text-slate-500 mb-2 font-mono">THE NETWORK FORMULA</div>
                       <div className="flex items-center gap-2 text-lg font-bold">
                          <span className="px-3 py-1 bg-white border rounded shadow-sm text-blue-600">Network</span>
                          <span>=</span>
                          <span className="px-3 py-1 bg-white border rounded shadow-sm text-slate-700">Direct</span>
                          <span>+</span>
                          <span className="px-3 py-1 bg-white border rounded shadow-sm text-slate-700">Discovery</span>
                       </div>
                    </div>

                    {/* Logic Gate */}
                    <div className="hidden md:block h-12 w-px bg-slate-300"></div>

                    {/* Equation 2 */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                       <div className="text-sm text-slate-500 mb-2 font-mono">FULLBOOK DEFINITION</div>
                       <div className="flex items-center gap-2 text-lg font-bold">
                          <span className="px-3 py-1 bg-white border rounded shadow-sm text-green-600">Fullbook</span>
                          <span>=</span>
                          <span className="px-3 py-1 bg-white border rounded shadow-sm text-blue-600">Network</span>
                          <span>+</span>
                          <span className="px-3 py-1 bg-white border rounded shadow-sm text-slate-700">RestRef</span>
                          <span>+</span>
                          <span className="px-3 py-1 bg-white border rounded shadow-sm text-slate-700">Phone/Walk</span>
                       </div>
                    </div>
                 </div>
                 <div className="mt-4 text-center">
                    <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold">
                       ⚠️ NEVER ADD GOOGLE TO NETWORK (It's an overlay)
                    </span>
                 </div>
              </div>

              {/* 4. System Archetypes */}
              <div className="md:col-span-2">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    System Type Archetypes
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {[
                       { title: "BASIC", desc: "Light-Touch / Demand Only", color: "bg-slate-100 border-slate-300" },
                       { title: "CORE", desc: "On-Prem / Constrained", color: "bg-blue-50 border-blue-200" },
                       { title: "PRO Partial", desc: "Under-Adopted Integration", color: "bg-indigo-50 border-indigo-200" },
                       { title: "PRO Full", desc: "Full Platform Usage", color: "bg-purple-50 border-purple-200" },
                       { title: "PRO Group", desc: "Multi-Location Integrated", color: "bg-fuchsia-50 border-fuchsia-200" },
                    ].map((arch, i) => (
                       <div key={i} className={`${arch.color} border p-4 rounded-lg text-center flex flex-col items-center h-full`}>
                          <div className="font-bold text-sm mb-2">{arch.title}</div>
                          <div className="text-xs text-slate-600">{arch.desc}</div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* 5. Decision Engine */}
              <div className="md:col-span-2 bg-slate-900 text-slate-300 p-6 rounded-xl">
                 <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-yellow-400" />
                    Decision Engine & Guardrails
                 </h3>
                 <div className="grid md:grid-cols-3 gap-6">
                    <DecisionCard 
                       trigger="IF Ghosting > 90 Days"
                       action="Schedule Health Check"
                       rule="The Ghosting Rule"
                    />
                    <DecisionCard 
                       trigger="IF Term > 90 Days + No Flags"
                       action="Light-Touch Prep (Phase 1)"
                       rule="Phase Trigger Rule"
                    />
                    <DecisionCard 
                       trigger="IF Objection = 'Too Expensive' + Basic"
                       action="Operational Relief Play"
                       rule="Pricing Lever Rule"
                    />
                 </div>
              </div>

            </div>
          </section>

          <footer className="pt-12 border-t border-slate-200 text-center text-slate-500 text-sm">
            <p className="mb-2">InTouch System Architecture &copy; 2026</p>
            <p>Built with Google Apps Script, React, and Gemini AI</p>
          </footer>

        </div>
      </main>
    </div>
  );
};

// Helper Components
const SectionHeader = ({ title, icon }) => (
  <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-200">
    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
      {React.cloneElement(icon, { className: "w-6 h-6" })}
    </div>
    <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
  </div>
);

const PipelineStep = ({ step, title, desc }) => (
  <div className="flex-1 bg-white p-4 rounded border border-blue-100 shadow-sm flex flex-col items-center text-center w-full md:w-auto">
    <span className="text-xs font-bold text-blue-200 mb-2">STEP {step}</span>
    <span className="font-mono font-bold text-blue-700 text-sm mb-1">{title}</span>
    <span className="text-xs text-slate-500">{desc}</span>
  </div>
);

const DecisionCard = ({ trigger, action, rule }) => (
   <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
      <div className="text-xs font-mono text-yellow-500 mb-2">{rule}</div>
      <div className="text-sm text-slate-400 mb-1">IF: {trigger}</div>
      <div className="flex items-center gap-2">
         <ArrowRight className="w-4 h-4 text-slate-500" />
         <div className="font-bold text-white text-sm">{action}</div>
      </div>
   </div>
);

const DestinationItem = ({ title, id, variant, source }) => (
  <div className="flex items-start gap-4 p-3 bg-slate-50 rounded border border-slate-100">
     <div className="mt-1 bg-white p-1 rounded border border-slate-200">
        <FileSpreadsheet className="w-4 h-4 text-green-500" />
     </div>
     <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
           <h5 className="font-bold text-sm text-slate-700 truncate">{title}</h5>
           <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{variant}</span>
        </div>
        <div className="text-xs font-mono text-slate-400 truncate mb-1" title={id}>{id}</div>
        <div className="text-xs text-slate-500 flex items-center gap-1">
           <Database className="w-3 h-3 text-slate-400" />
           Src: {source}
        </div>
     </div>
  </div>
);

export default InTouchDocs;
