import { useState } from 'react';
import { WifiOff } from 'lucide-react';

// Custom Hooks
import { useSyncEngine } from './sync/useSyncEngine';
import { useSpeechAssistant } from './voice/useSpeechAssistant';

// Modular UI Components
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';
import { StatusWidgets } from './components/StatusWidgets';
import { VoiceAssistant } from './voice/VoiceAssistant';
import { MatchmakerModal } from './components/MatchmakerModal';

// Tab Workspace Sections
import { CropsBoard } from './pages/CropsBoard';
import { WorkersRegistry } from './pages/WorkersRegistry';
import { JobsBoard } from './pages/JobsBoard';
import { SyncAudit } from './pages/SyncAudit';
import { SchemaSpecs } from './pages/SchemaSpecs';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Form states - Workers (controlled in parent for Voice AI autofill support)
  const [workerName, setWorkerName] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerRate, setWorkerRate] = useState('');
  const [workerState, setWorkerState] = useState('Maharashtra');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [workerErrors, setWorkerErrors] = useState({});
  const [workerFilledStatus, setWorkerFilledStatus] = useState({ name: false, phone: false, rate: false, skills: false });

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
    blockNetwork,
    setBlockNetwork,
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

    if (speechActiveSection === 'worker') {
      if (recognizedEntities.name) {
        setWorkerName(recognizedEntities.name);
        setWorkerFilledStatus(prev => ({ ...prev, name: true }));
      }
      if (recognizedEntities.phone) {
        setWorkerPhone(recognizedEntities.phone);
        setWorkerFilledStatus(prev => ({ ...prev, phone: true }));
      }
      if (recognizedEntities.rate) {
        setWorkerRate(recognizedEntities.rate);
        setWorkerFilledStatus(prev => ({ ...prev, rate: true }));
      }
      if (recognizedEntities.skills.length > 0) {
        setSelectedSkills(recognizedEntities.skills);
        setWorkerFilledStatus(prev => ({ ...prev, skills: true }));
      }
      setActiveTab('workers');
      logSystem('success', 'Injected Voice AI entities into Laborer Registration fields.');
    } else {
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
    }

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Offline Status Banner */}
      {(!isOnline || blockNetwork) && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-inner animate-pulse transition-all duration-300 z-50">
          <WifiOff size={16} />
          <span>Offline mode active. Form submits will save locally to IndexedDB & sync queue.</span>
        </div>
      )}

      {/* Main Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        blockNetwork={blockNetwork}
        setBlockNetwork={setBlockNetwork}
        isOnline={isOnline}
        setToast={setToast}
      />

      {/* Main Workspace Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Core System Status Widgets */}
        <StatusWidgets
          cropsCount={crops.length}
          workersCount={workers.length}
          jobsCount={jobs.length}
          syncQueueCount={syncQueue.length}
          isOnline={isOnline}
          blockNetwork={blockNetwork}
          lastSyncTime={lastSyncTime}
          syncing={syncing}
          triggerSync={triggerSync}
        />

        {/* KissanShakthi Voice AI Assistant section */}
        {(activeTab === 'workers' || activeTab === 'jobs') && (
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
            syncQueue={syncQueue}
            handleAddCrop={handleAddCrop}
            handleDeleteItem={handleDeleteItem}
          />
        )}

        {/* Tab 2: Workers Registry */}
        {activeTab === 'workers' && (
          <WorkersRegistry
            workers={workers}
            syncQueue={syncQueue}
            workerName={workerName}
            setWorkerName={setWorkerName}
            workerPhone={workerPhone}
            setWorkerPhone={setWorkerPhone}
            workerRate={workerRate}
            setWorkerRate={setWorkerRate}
            workerState={workerState}
            setWorkerState={setWorkerState}
            selectedSkills={selectedSkills}
            setSelectedSkills={setSelectedSkills}
            workerErrors={workerErrors}
            setWorkerErrors={setWorkerErrors}
            workerFilledStatus={workerFilledStatus}
            setWorkerFilledStatus={setWorkerFilledStatus}
            handleAddWorker={handleAddWorker}
            handleDeleteItem={handleDeleteItem}
            logSystem={logSystem}
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
