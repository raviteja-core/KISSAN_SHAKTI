import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { SEED_CROPS, SEED_WORKERS, SEED_JOBS } from '../db/seedData';

export const useSyncEngine = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());
  const [toast, setToast] = useState(null);

  // Dexie loaded lists
  const [crops, setCrops] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [syncQueue, setSyncQueue] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);

  // Developer Simulation states
  const simulateLatency = 1500; // ms
  const forceServerError = false;
  
  const [consoleLogs, setConsoleLogs] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), type: 'info', text: 'IndexedDB persistent engine initialized via Dexie.js' },
    { id: 2, time: new Date().toLocaleTimeString(), type: 'success', text: 'KissanShakthi Offline Sync Monitor online.' }
  ]);

  const logSystem = (type, text) => {
    setConsoleLogs(prev => [
      ...prev,
      { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), type, text }
    ].slice(-50));
  };

  const refreshData = async (selectedJobId = null, setMatchingWorkers = null) => {
    try {
      const allCrops = await db.crops.reverse().toArray();
      const allWorkers = await db.workers.reverse().toArray();
      const allJobs = await db.jobs.reverse().toArray();
      const allQueue = await db.sync_queue.toArray();
      const allLogs = await db.sync_logs.reverse().limit(30).toArray();

      setCrops(allCrops);
      setWorkers(allWorkers);
      setJobs(allJobs);
      setSyncQueue(allQueue);
      setSyncLogs(allLogs);

      // Recalculate matches if modal is open
      if (selectedJobId && setMatchingWorkers) {
        const currentJob = allJobs.find(j => j.id === selectedJobId);
        if (currentJob) {
          runMatchingQuery(currentJob, allWorkers, setMatchingWorkers);
        }
      }
    } catch (err) {
      console.error("Failed to load local IndexedDB stores:", err);
      logSystem('error', `Failed to load IndexedDB: ${err.message}`);
    }
  };

  const runMatchingQuery = (job, allWorkersList = workers, setMatchingWorkers) => {
    const matched = allWorkersList.map(worker => {
      let score = 0;
      
      if (worker.skills.includes(job.required_skill)) {
        score += 70;
      } else {
        const hasOtherSkills = worker.skills.length > 0;
        if (hasOtherSkills) score += 35;
      }

      const isNearby = worker.phone && (
        job.location.toLowerCase().includes("village") || 
        job.location.toLowerCase().includes("region") || 
        job.location.toLowerCase().includes("field") ||
        job.location.toLowerCase().includes("pimplad") ||
        job.location.toLowerCase().includes("sinnar")
      );
      if (isNearby) score += 30;

      return {
        ...worker,
        match_score: score
      };
    })
    .filter(w => w.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score);

    if (setMatchingWorkers) {
      setMatchingWorkers(matched);
    }
    return matched;
  };

  const triggerSync = async () => {
    const currentConnection = isOnline;
    if (!currentConnection || syncQueue.length === 0) return;
    
    setSyncing(true);
    logSystem('info', `Sync engine executing flush batch of ${syncQueue.length} records...`);

    setTimeout(async () => {
      try {
        if (forceServerError) {
          throw new Error("Simulated Server Failure: 500 Internal Server Error.");
        }

        const syncedCount = syncQueue.length;
        
        await db.crops.filter(item => item.sync_status !== 'synced').modify({ sync_status: 'synced', updated_at: new Date().toISOString() });
        await db.workers.filter(item => item.sync_status !== 'synced').modify({ sync_status: 'synced', updated_at: new Date().toISOString() });
        await db.jobs.filter(item => item.sync_status !== 'synced').modify({ sync_status: 'synced', updated_at: new Date().toISOString() });

        await db.sync_queue.clear();

        await db.sync_logs.add({
          status: 'SUCCESS',
          message: `Successfully flushed ${syncedCount} mutation records to remote server.`,
          records_count: syncedCount,
          created_at: new Date().toISOString()
        });

        logSystem('success', `Synchronized successfully: Pushed ${syncedCount} mutations. Local store synchronized.`);
        setSyncing(false);
        setLastSyncTime(new Date().toLocaleTimeString());
        await refreshData();
      } catch (err) {
        console.error("Sync execution failed:", err);
        logSystem('error', `Synchronization failed: ${err.message}`);
        
        await db.sync_logs.add({
          status: 'FAILED',
          message: `Flushing aborted: ${err.message}`,
          records_count: syncQueue.length,
          created_at: new Date().toISOString()
        });

        setSyncing(false);
        await refreshData();
      }
    }, simulateLatency);
  };

  // Add Crop
  const handleAddCrop = async (cropData) => {
    const newId = crypto.randomUUID();
    const newCrop = {
      id: newId,
      farmer_id: "e3cb89cf-4a3b-4861-84bb-7313a0c5c3fb",
      name: cropData.name,
      category: cropData.category,
      quantity_kg: parseFloat(cropData.quantity),
      price_per_kg: parseFloat(cropData.price),
      status: "available",
      harvest_date: cropData.harvestDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: isOnline ? "synced" : "pending_create"
    };

    await db.crops.add(newCrop);
    logSystem('success', `Crop Listing "${cropData.name}" saved persistently in IndexedDB.`);

    if (!isOnline) {
      await db.sync_queue.add({
        action: 'CREATE',
        entity_type: 'crops',
        entity_id: newId,
        payload: newCrop,
        created_at: new Date().toISOString()
      });
      logSystem('warn', `Offline mode active: crop mutation registered in sync_queue.`);
    }

    await refreshData();
  };

  // Register Worker
  const handleAddWorker = async (workerData) => {
    const newId = crypto.randomUUID();
    const newWorker = {
      id: newId,
      name: workerData.name.trim(),
      phone: workerData.phone.trim(),
      state: workerData.state || "Maharashtra",
      skills: workerData.skills,
      daily_rate: parseFloat(workerData.rate),
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: isOnline ? "synced" : "pending_create"
    };

    await db.workers.add(newWorker);
    logSystem('success', `Worker profile for "${workerData.name.trim()}" registered in IndexedDB.`);

    if (!isOnline) {
      await db.sync_queue.add({
        action: 'CREATE',
        entity_type: 'workers',
        entity_id: newId,
        payload: newWorker,
        created_at: new Date().toISOString()
      });
      logSystem('warn', `Offline mode active: worker mutation registered in sync_queue.`);
    }

    await refreshData();
  };

  // Post Job
  const handleAddJob = async (jobData) => {
    const newId = crypto.randomUUID();
    const newJob = {
      id: newId,
      worker_id: jobData.assignedWorkerId || null,
      title: jobData.title.trim(),
      description: jobData.desc.trim(),
      location: jobData.location.trim(),
      payment: parseFloat(jobData.payment),
      required_skill: jobData.requiredSkill,
      status: jobData.assignedWorkerId ? "assigned" : "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: isOnline ? "synced" : "pending_create"
    };

    await db.jobs.add(newJob);
    logSystem('success', `Agricultural task "${jobData.title.trim()}" posted in IndexedDB.`);

    if (!isOnline) {
      await db.sync_queue.add({
        action: 'CREATE',
        entity_type: 'jobs',
        entity_id: newId,
        payload: newJob,
        created_at: new Date().toISOString()
      });
      logSystem('warn', `Offline mode active: job mutation registered in sync_queue.`);
    }

    await refreshData();
  };

  // Delete Item
  const handleDeleteItem = async (entity, id) => {
    if (entity === 'crops') {
      await db.crops.delete(id);
    } else if (entity === 'workers') {
      await db.workers.delete(id);
    } else if (entity === 'jobs') {
      await db.jobs.delete(id);
    }

    logSystem('warn', `Deleted item with ID: ${id} from IndexedDB table [${entity}].`);

    if (!isOnline) {
      await db.sync_queue.add({
        action: 'DELETE',
        entity_type: entity,
        entity_id: id,
        payload: { id },
        created_at: new Date().toISOString()
      });
      logSystem('warn', `Offline mode active: logged DELETE mutation in sync_queue.`);
    }

    await refreshData();
  };

  // Assign Worker to Job
  const assignWorkerToJob = async (jobId, workerId) => {
    await db.jobs.update(jobId, {
      worker_id: workerId,
      status: "assigned",
      updated_at: new Date().toISOString(),
      sync_status: isOnline ? "synced" : "pending_update"
    });

    logSystem('success', `Assigned worker [${workerId}] to Job task [${jobId}] locally.`);

    if (!isOnline) {
      const updatedJob = await db.jobs.get(jobId);
      await db.sync_queue.add({
        action: 'UPDATE',
        entity_type: 'jobs',
        entity_id: jobId,
        payload: updatedJob,
        created_at: new Date().toISOString()
      });
      logSystem('warn', `Offline mode active: logged UPDATE mutation in sync_queue.`);
    }

    await refreshData();
  };

  // Unassign Worker
  const unassignWorker = async (jobId) => {
    await db.jobs.update(jobId, {
      worker_id: null,
      status: "open",
      updated_at: new Date().toISOString(),
      sync_status: isOnline ? "synced" : "pending_update"
    });

    logSystem('info', `Unassigned worker from Job task [${jobId}] locally.`);

    if (!isOnline) {
      const updatedJob = await db.jobs.get(jobId);
      await db.sync_queue.add({
        action: 'UPDATE',
        entity_type: 'jobs',
        entity_id: jobId,
        payload: updatedJob,
        created_at: new Date().toISOString()
      });
      logSystem('warn', `Offline mode active: logged unassignment UPDATE mutation in sync_queue.`);
    }

    await refreshData();
  };

  const handleClearLogs = async () => {
    await db.sync_logs.clear();
    logSystem('info', 'Sync audit logs table cleared.');
    await refreshData();
  };

  // Initial Seeding and Database Loading
  useEffect(() => {
    const seedAndLoad = async () => {
      const cropCount = await db.crops.count();
      if (cropCount === 0) {
        await db.crops.bulkAdd(SEED_CROPS);
        logSystem('info', 'Seeded initial Crops memory into IndexedDB.');
      }
      
      const workerCount = await db.workers.count();
      if (workerCount === 0) {
        await db.workers.bulkAdd(SEED_WORKERS);
        logSystem('info', 'Seeded initial Workers memory into IndexedDB.');
      }

      const jobCount = await db.jobs.count();
      if (jobCount === 0) {
        await db.jobs.bulkAdd(SEED_JOBS);
        logSystem('info', 'Seeded initial Jobs Board memory into IndexedDB.');
      }

      await refreshData();
    };

    seedAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Monitor hardware network status and blockNetwork simulator
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setToast({ type: 'online', message: "🟢 You are back online! Syncing your local changes back to the server..." });
      setTimeout(() => setToast(null), 5000);
      setTimeout(() => logSystem('info', 'Device interface reported ONLINE status.'), 0);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setToast({ type: 'offline', message: "⚠️ Connection lost. You are now offline. Changes will save to IndexedDB." });
      setTimeout(() => setToast(null), 5000);
      setTimeout(() => logSystem('warn', 'Device interface reported OFFLINE status.'), 0);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Background Auto-Sync trigger when returning online
  useEffect(() => {
    const currentConnection = isOnline;
    if (currentConnection) {
      setTimeout(() => logSystem('success', 'Network Status: ONLINE. Simulated connection to Postgres database active.'), 0);
      if (syncQueue.length > 0) {
        setTimeout(() => logSystem('info', `Sync Queue has ${syncQueue.length} pending mutations. Triggering automatic background synchronizer...`), 0);
        setTimeout(() => triggerSync(), 0);
      }
    } else {
      setTimeout(() => logSystem('warn', 'Network Status: OFFLINE. Form submissions will cache locally in IndexedDB.'), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, syncQueue.length]);

  return {
    isOnline,
    setIsOnline,
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
    unassignWorker,
    handleClearLogs
  };
};
