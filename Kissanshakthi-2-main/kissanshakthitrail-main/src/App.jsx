import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

// Custom Hooks
import { useSyncEngine } from './sync/useSyncEngine';
import { useSpeechAssistant } from './voice/useSpeechAssistant';

// Modular UI Components
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';
import { VoiceAssistant } from './voice/VoiceAssistant';
import { MatchmakerModal } from './components/MatchmakerModal';

// Tab Workspace Sections
import { CropsBoard } from './pages/CropsBoard';
import { WorkersRegistry } from './pages/WorkersRegistry';
import { JobsBoard } from './pages/JobsBoard';
import { SyncAudit } from './pages/SyncAudit';
import { SchemaSpecs } from './pages/SchemaSpecs';
import { EquipmentBoard } from './pages/EquipmentBoard';

// Onboarding and Role contexts / portals
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { LoginSelection } from './pages/auth/LoginSelection';
import { VerificationGate } from './pages/auth/VerificationGate';
import { LaborDashboard } from './pages/labor/LaborDashboard';
import { AdminConsole } from './pages/admin/AdminConsole';
import { BuyerDashboard } from './pages/buyer/BuyerDashboard';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}

function AppContent() {
  // Helper to parse current path into a tab
  const getTabFromPath = (path) => {
    const p = path.toLowerCase().replace(/^\/|\/$/g, '');
    if (p === 'equipment') return 'equipment';
    if (p === 'workers') return 'workers';
    if (p === 'jobs' || p === 'jobsboard' || p === 'jobboard') return 'jobs';
    if (p === 'sync_audit' || p === 'sync-audit') return 'sync_audit';
    if (p === 'schema') return 'schema';
    return 'dashboard';
  };

  const getPathFromTab = (tab) => {
    if (tab === 'equipment') return '/equipment';
    if (tab === 'workers') return '/workers';
    if (tab === 'jobs') return '/jobsboard';
    if (tab === 'sync_audit') return '/sync-audit';
    if (tab === 'schema') return '/schema';
    return '/crops';
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(window.location.pathname));

  // Sync tab with URL history changes (e.g. back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getTabFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync URL with activeTab changes
  useEffect(() => {
    const currentPath = window.location.pathname;
    const tabFromCurrentPath = getTabFromPath(currentPath);
    if (tabFromCurrentPath !== activeTab) {
      window.history.pushState(null, '', getPathFromTab(activeTab));
    }
  }, [activeTab]);



  // Form states - Jobs (controlled in parent for Voice AI autofill support)
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobPayment, setJobPayment] = useState('');
  const [requiredSkill, setRequiredSkill] = useState('Harvesting');
  const [assignedWorkerId, setAssignedWorkerId] = useState('');
  const [jobErrors, setJobErrors] = useState({});
  const [jobFilledStatus, setJobFilledStatus] = useState({ title: false, desc: false, location: false, payment: false, skill: false });

  // Selected job for Matchmaker modal
  const [selectedJobForMatching, setSelectedJobForMatching] = useState(null);
  const [matchingWorkers, setMatchingWorkers] = useState([]);

  // Destructure sync hook operations
  const {
    isOnline,
    syncing,
    lastSyncTime,
    toast,
    setToast,
    crops,
    workers,
    jobs,
    syncQueue,
    syncLogs,
    consoleLogs,
    logSystem,
    refreshData,
    runMatchingQuery,
    triggerSync,
    handleAddCrop,
    handleAddWorker,
    handleAddJob,
    handleDeleteItem,
    assignWorkerToJob,
    applyForJob,
    unassignWorker,
    handleClearLogs
  } = useSyncEngine();

  // Destructure speech assistant hook operations
  const {
    isRecording,
    speechText,
    recognizedEntities,
    speechActiveSection,
    setSpeechActiveSection,
    visualizerRef,
    runSimulatedSpeech,
    handleToggleSpeech,
    clearRecognizedEntities
  } = useSpeechAssistant(activeTab);

  const applyVoiceEntities = () => {
    if (!recognizedEntities) return;

    if (recognizedEntities.title) {
      setJobTitle(recognizedEntities.title);
      setJobFilledStatus(prev => ({ ...prev, title: true }));
    }
    if (recognizedEntities.desc) {
      setJobDesc(recognizedEntities.desc);
      setJobFilledStatus(prev => ({ ...prev, desc: true }));
    }
    if (recognizedEntities.location) {
      setJobLocation(recognizedEntities.location);
      setJobFilledStatus(prev => ({ ...prev, location: true }));
    }
    if (recognizedEntities.rate) {
      setJobPayment(recognizedEntities.rate);
      setJobFilledStatus(prev => ({ ...prev, payment: true }));
    }
    if (recognizedEntities.skills.length > 0) {
      setRequiredSkill(recognizedEntities.skills[0]);
      setJobFilledStatus(prev => ({ ...prev, skill: true }));
    }
    setActiveTab('jobs');
    logSystem('success', 'Injected Voice AI entities into Task Posting fields.');

    clearRecognizedEntities();
  };

  const openMatchmaker = (job) => {
    setSelectedJobForMatching(job);
    runMatchingQuery(job, workers, setMatchingWorkers);
  };

  const handleModalAssign = async (jobId, workerId) => {
    await assignWorkerToJob(jobId, workerId);
    setSelectedJobForMatching(null);
  };

  const { user } = useAuth();

  // Onboarding & Role routing guards
  if (!user) {
    return <LoginSelection />;
  }

  // Verification Gate Routing Guard (enforces document upload & blacklist checks for farmers and laborers)
  if (user.role !== 'admin' && (!user.isVerified || user.verificationStep !== 'completed')) {
    return <VerificationGate />;
  }

  if (user.role === 'admin') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOnline={isOnline}
        />
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminConsole />
        </main>
        <Footer />
      </div>
    );
  }

  if (user.role === 'buyer') {
    return <BuyerDashboard crops={crops} />;
  }

  if (user.role === 'laborer') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOnline={isOnline}
        />
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LaborDashboard 
            jobs={jobs} 
            workers={workers} 
            applyForJob={applyForJob}
            assignWorkerToJob={assignWorkerToJob} 
            unassignWorker={unassignWorker} 
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-inner animate-pulse transition-all duration-300 z-50">
          <WifiOff size={16} />
          <span>Offline mode active. Form submits will save locally to IndexedDB & sync queue.</span>
        </div>
      )}

      {/* Main Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOnline={isOnline}
      />

      {/* Main Workspace Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* KissanShakthi Voice AI Assistant section */}
        {(activeTab === 'workers' || activeTab === 'jobs' || activeTab === 'equipment') && (
          <VoiceAssistant
            isRecording={isRecording}
            speechText={speechText}
            recognizedEntities={recognizedEntities}
            speechActiveSection={speechActiveSection}
            setSpeechActiveSection={setSpeechActiveSection}
            visualizerRef={visualizerRef}
            handleToggleSpeech={handleToggleSpeech}
            runSimulatedSpeech={runSimulatedSpeech}
            applyVoiceEntities={applyVoiceEntities}
            logSystem={logSystem}
          />
        )}

        {/* Tab 1: Crops Board */}
        {activeTab === 'dashboard' && (
          <CropsBoard
            crops={crops}
            handleAddCrop={handleAddCrop}
            handleDeleteItem={handleDeleteItem}
          />
        )}

        {/* Tab 2: Workers Registry */}
        {activeTab === 'workers' && (
          <WorkersRegistry
            workers={workers}
            handleDeleteItem={handleDeleteItem}
          />
        )}

        {/* Tab 3: Jobs Board & Matchmaker */}
        {activeTab === 'jobs' && (
          <JobsBoard
            jobs={jobs}
            workers={workers}
            jobTitle={jobTitle}
            setJobTitle={setJobTitle}
            jobDesc={jobDesc}
            setJobDesc={setJobDesc}
            jobLocation={jobLocation}
            setJobLocation={setJobLocation}
            jobPayment={jobPayment}
            setJobPayment={setJobPayment}
            requiredSkill={requiredSkill}
            setRequiredSkill={setRequiredSkill}
            assignedWorkerId={assignedWorkerId}
            setAssignedWorkerId={setAssignedWorkerId}
            jobErrors={jobErrors}
            setJobErrors={setJobErrors}
            jobFilledStatus={jobFilledStatus}
            setJobFilledStatus={setJobFilledStatus}
            handleAddJob={handleAddJob}
            handleDeleteItem={handleDeleteItem}
            openMatchmaker={openMatchmaker}
            assignWorkerToJob={assignWorkerToJob}
            unassignWorker={unassignWorker}
            logSystem={logSystem}
          />
        )}

        {/* Tab 4: Sync Audit Logs */}
        {activeTab === 'sync_audit' && (
          <SyncAudit
            syncLogs={syncLogs}
            handleClearLogs={handleClearLogs}
          />
        )}

        {/* Tab 5: Database & API specs */}
        {activeTab === 'schema' && <SchemaSpecs />}

        {/* Tab 6: Equipment Board */}
        {activeTab === 'equipment' && <EquipmentBoard />}

      </main>

      {/* Matchmaker Modal Popup Overlay */}
      {selectedJobForMatching && (
        <MatchmakerModal
          selectedJobForMatching={selectedJobForMatching}
          setSelectedJobForMatching={setSelectedJobForMatching}
          matchingWorkers={matchingWorkers}
          assignWorkerToJob={handleModalAssign}
        />
      )}

      {/* Dynamic Toast Notification Popup Overlay */}
      <Toast toast={toast} />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
