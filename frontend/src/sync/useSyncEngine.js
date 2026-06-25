import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const useSyncEngine = () => {
  const { user } = useAuth();
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
      if (isOnline) {
        logSystem('info', 'Fetching live tables from remote Supabase...');
        const onlineCrops = await api.listCrops();
        const onlineWorkers = await api.listWorkers();
        const onlineJobs = await api.listJobs();

        // Sync remote state to local cache
        await db.crops.clear();
        if (onlineCrops && onlineCrops.length > 0) {
          await db.crops.bulkAdd(onlineCrops);
        }

        await db.workers.clear();
        if (onlineWorkers && onlineWorkers.length > 0) {
          await db.workers.bulkAdd(onlineWorkers);
        }

        await db.jobs.clear();
        if (onlineJobs && onlineJobs.length > 0) {
          await db.jobs.bulkAdd(onlineJobs);
        }
      }

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

      if (selectedJobId && setMatchingWorkers) {
        const currentJob = allJobs.find(j => j.id === selectedJobId);
        if (currentJob) {
          runMatchingQuery(currentJob, allWorkers, setMatchingWorkers);
        }
      }
    } catch (err) {
      console.error("Failed to load/sync IndexedDB stores:", err);
      logSystem('error', `Failed to load/sync: ${err.message}`);

      // Offline fallback
      const allCrops = await db.crops.reverse().toArray();
      const allWorkers = await db.workers.reverse().toArray();
      const allJobs = await db.jobs.reverse().toArray();
      setCrops(allCrops);
      setWorkers(allWorkers);
      setJobs(allJobs);
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
    if (!isOnline || syncQueue.length === 0) return;
    
    setSyncing(true);
    logSystem('info', `Sync engine executing flush batch of ${syncQueue.length} records...`);

    try {
      const syncedCount = syncQueue.length;
      await api.pushSync(syncQueue);

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
  };

  // Add Crop
  const handleAddCrop = async (cropData) => {
    const newId = crypto.randomUUID();
    const newCrop = {
      id: newId,
      farmer_id: user?.id || "user_farmer_ramesh",
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

    if (isOnline) {
      try {
        await api.createCrop(newCrop);
        logSystem('success', `Crop Listing "${cropData.name}" pushed to Supabase.`);
      } catch (err) {
        logSystem('error', `Failed to push crop: ${err.message}. Queueing mutation...`);
        await db.crops.update(newId, { sync_status: 'pending_create' });
        await db.sync_queue.add({
          action: 'CREATE',
          entity_type: 'crops',
          entity_id: newId,
          payload: newCrop,
          created_at: new Date().toISOString()
        });
      }
    } else {
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

    if (isOnline) {
      try {
        await api.createWorker(newWorker);
        logSystem('success', `Worker profile pushed to Supabase.`);
      } catch (err) {
        logSystem('error', `Failed to push worker: ${err.message}. Queueing mutation...`);
        await db.workers.update(newId, { sync_status: 'pending_create' });
        await db.sync_queue.add({
          action: 'CREATE',
          entity_type: 'workers',
          entity_id: newId,
          payload: newWorker,
          created_at: new Date().toISOString()
        });
      }
    } else {
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
      farmer_id: user?.id || "user_farmer_ramesh",
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

    if (isOnline) {
      try {
        await api.createJob(newJob);
        logSystem('success', `Agricultural task pushed to Supabase.`);
      } catch (err) {
        logSystem('error', `Failed to push job: ${err.message}. Queueing mutation...`);
        await db.jobs.update(newId, { sync_status: 'pending_create' });
        await db.sync_queue.add({
          action: 'CREATE',
          entity_type: 'jobs',
          entity_id: newId,
          payload: newJob,
          created_at: new Date().toISOString()
        });
      }
    } else {
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

    if (isOnline) {
      try {
        if (entity === 'crops') {
          await api.deleteCrop(id);
        } else if (entity === 'workers') {
          await api.deleteWorker(id);
        } else if (entity === 'jobs') {
          await api.deleteJob(id);
        }
        logSystem('success', `Deleted item from Supabase database.`);
      } catch (err) {
        logSystem('error', `Failed to delete from remote database: ${err.message}`);
        await db.sync_queue.add({
          action: 'DELETE',
          entity_type: entity,
          entity_id: id,
          payload: { id },
          created_at: new Date().toISOString()
        });
      }
    } else {
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

  // Apply for Job
  const applyForJob = async (jobId, workerId) => {
    const job = await db.jobs.get(jobId);
    if (!job) return;

    if (isOnline) {
      try {
        await api.createApplication({ job_id: jobId, laborer_id: workerId, message: "Applied online." });
        logSystem('success', `Application for Job [${jobId}] submitted directly to Supabase.`);
      } catch (err) {
        logSystem('error', `Failed to submit application online: ${err.message}`);
      }
    } else {
      // Offline fallback: update local Dexie model
      const applicants = job.applicants || [];
      if (!applicants.some(a => a.worker_id === workerId)) {
        applicants.push({ worker_id: workerId, status: 'pending' });
        await db.jobs.update(jobId, {
          applicants,
          updated_at: new Date().toISOString(),
          sync_status: "pending_update"
        });
        logSystem('warn', `Offline: Application cached in Dexie.`);
      }
    }
    await refreshData();
  };

  // Assign Worker to Job
  const assignWorkerToJob = async (jobId, workerId) => {
    if (isOnline) {
      try {
        await api.updateApplication(jobId, 'ACCEPTED'); // wait, the application endpoint accepts job assignment
        // Or directly call assign endpoint:
        const response = await fetch(`http://localhost:8000/api/v1/jobs/${jobId}/assign?worker_id=${workerId}`, { method: 'POST' });
        if (!response.ok) throw new Error("Failed to assign worker.");
        logSystem('success', `Assigned worker to job in Supabase.`);
      } catch (err) {
        logSystem('error', `Failed to assign worker online: ${err.message}`);
      }
    } else {
      await db.jobs.update(jobId, {
        worker_id: workerId,
        status: "assigned",
        updated_at: new Date().toISOString(),
        sync_status: "pending_update"
      });
      logSystem('warn', `Offline: Worker assignment cached in Dexie.`);
    }
    await refreshData();
  };

  // Unassign Worker
  const unassignWorker = async (jobId) => {
    if (isOnline) {
      try {
        const response = await fetch(`http://localhost:8000/api/v1/jobs/${jobId}/unassign`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Failed to unassign worker.");
        logSystem('success', `Unassigned worker from job in Supabase.`);
      } catch (err) {
        logSystem('error', `Failed to unassign worker online: ${err.message}`);
      }
    } else {
      const job = await db.jobs.get(jobId);
      if (job) {
        let updatedApplicants = job.applicants || [];
        if (job.worker_id) {
          updatedApplicants = updatedApplicants.filter(a => a.worker_id !== job.worker_id);
        }
        await db.jobs.update(jobId, {
          worker_id: null,
          status: "open",
          applicants: updatedApplicants,
          updated_at: new Date().toISOString(),
          sync_status: "pending_update"
        });
        logSystem('warn', `Offline: Unassignment cached in Dexie.`);
      }
    }
    await refreshData();
  };

  const handleClearLogs = async () => {
    await db.sync_logs.clear();
    logSystem('info', 'Sync audit logs table cleared.');
    await refreshData();
  };

  // Initial Database Loading
  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Monitor network status
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
    if (isOnline) {
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
    applyForJob,
    assignWorkerToJob,
    unassignWorker,
    handleClearLogs
  };
};
