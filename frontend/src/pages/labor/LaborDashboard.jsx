import React, { useState, useEffect, useMemo } from 'react';
import { Briefcase, Calendar, CheckSquare, ArrowRight, UserCheck, ShieldAlert, Award, LogOut, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const LaborDashboard = ({ jobs = [], workers = [], applyForJob, assignWorkerToJob, unassignWorker }) => {
  const { user } = useAuth();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [applicationsList, setApplicationsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [taskState, setTaskState] = useState({});

  const loadDashboardData = async () => {
    if (!user || !user.id) return;
    setIsLoading(true);
    try {
      const data = await api.getLaborDashboard(user.id);
      setDashboardData(data);

      const appsData = await api.listApplications({ laborer_id: user.id });
      setApplicationsList(appsData.items || []);
    } catch (err) {
      console.error("Failed to load labor dashboard remote data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user, jobs]); // Reload if user or local jobs sync changes

  // Determine current worker profile
  const currentWorker = useMemo(() => {
    return workers.find(w => {
      const userPhone = user?.phone?.replace(/\D/g, '').slice(-10);
      const workerPhone = w.phone?.replace(/\D/g, '').slice(-10);
      return userPhone && workerPhone && userPhone === workerPhone;
    }) || workers[0];
  }, [workers, user]);

  const workerId = user?.id || currentWorker?.id;
  const userName = user?.full_name || user?.name || currentWorker?.name || 'Suresh Pawar';

  // Determine active job
  const hasActiveJob = dashboardData 
    ? !!dashboardData.current_job 
    : !!jobs.find(j => j.worker_id === workerId && j.status === 'assigned');

  const employmentStatus = hasActiveJob ? 'employed' : 'unemployed';

  // Build active job info
  const activeJob = useMemo(() => {
    if (dashboardData && dashboardData.current_job) {
      const job = dashboardData.current_job;
      const engagement = dashboardData.current_engagement || {};
      const workdaysList = dashboardData.workdays || [];
      const tasksList = (engagement.assigned_tasks || []).map((t, idx) => ({ id: idx + 1, text: t }));
      
      return {
        id: job.id,
        employer: job.farmer?.full_name || "Verified Farmer",
        phone: job.farmer?.phone || "+91 98765 43210",
        title: job.title,
        location: job.location,
        rate: job.payment || job.daily_wage || 0,
        startDate: engagement.created_at ? engagement.created_at.split('T')[0] : (job.start_date || 'N/A'),
        daysWorked: engagement.working_days || workdaysList.length || 0,
        totalCost: engagement.total_cost || (workdaysList.length * (job.payment || job.daily_wage || 0)),
        tasks: tasksList.length > 0 ? tasksList : [
          { id: 1, text: `Initial ${job.required_skill} assignment` },
          { id: 2, text: "Report to field location on time" }
        ]
      };
    } else {
      const localActive = jobs.find(j => j.worker_id === workerId && j.status === 'assigned');
      if (localActive) {
        return {
          id: localActive.id,
          employer: "Verified Farmer",
          phone: "+91 98765 43210",
          title: localActive.title,
          location: localActive.location,
          rate: localActive.payment || 0,
          startDate: localActive.updated_at ? localActive.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
          daysWorked: 1,
          totalCost: localActive.payment || 0,
          tasks: [
            { id: 1, text: `Initial ${localActive.required_skill} assignment` },
            { id: 2, text: "Report to field location on time" }
          ]
        };
      }
    }
    return null;
  }, [dashboardData, jobs, workerId]);

  // Compute applications
  const activeApplications = useMemo(() => {
    if (dashboardData) {
      return (applicationsList || []).map(a => ({
        id: a.job_id || a.id,
        title: a.job?.title || "Agricultural Job",
        employer: a.job?.farmer?.full_name || "Verified Farmer",
        rate: a.job?.payment || a.job?.daily_wage || 0,
        status: a.status
      }));
    } else {
      return jobs.filter(j => j.status === 'open' && j.applicants && j.applicants.some(a => a.worker_id === workerId)).map(j => {
        const app = j.applicants.find(a => a.worker_id === workerId);
        return {
          id: j.id,
          title: j.title,
          employer: "Verified Farmer",
          rate: j.payment,
          status: app.status
        };
      });
    }
  }, [dashboardData, applicationsList, jobs, workerId]);

  // Compute jobs feed
  const jobsFeed = useMemo(() => {
    if (dashboardData) {
      return (dashboardData.available_jobs || []).map(j => ({
        id: j.id,
        title: j.title,
        employer: j.farmer?.full_name || "Verified Farmer",
        location: j.location,
        rate: j.payment || j.daily_wage || 0,
        skill: j.required_skill,
        applied: false
      }));
    } else {
      return jobs.filter(j => j.status === 'open').map(j => ({
        id: j.id,
        title: j.title,
        employer: "Verified Farmer",
        location: j.location,
        rate: j.payment,
        skill: j.required_skill,
        applied: j.applicants && j.applicants.some(a => a.worker_id === workerId)
      }));
    }
  }, [dashboardData, jobs, workerId]);

  const hasApplied = activeApplications.length > 0;

  const handleApplyJob = async (jobId) => {
    if (!user) return;
    try {
      await applyForJob(jobId, user.id);
      alert("Application submitted successfully!");
      await loadDashboardData();
    } catch (err) {
      alert(err.message || "Failed to apply for job");
    }
  };

  const handleToggleTask = (taskId) => {
    setTaskState(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleAcceptJobApplication = async (jobId) => {
    // Simulator helper
    try {
      await assignWorkerToJob(jobId, user.id);
      alert("Application accepted! You are now assigned to this job.");
      await loadDashboardData();
    } catch (err) {
      alert(err.message || "Failed to assign job");
    }
  };

  const handleResign = async () => {
    const jobId = activeJob?.id;
    if (!jobId) return;
    if (!confirm("Are you sure you want to resign/leave this job?")) return;
    try {
      await unassignWorker(jobId);
      alert("Resigned from job successfully.");
      await loadDashboardData();
    } catch (err) {
      alert(err.message || "Failed to resign");
    }
  };

  const handleLogWorkday = async () => {
    const jobId = activeJob?.id;
    if (!jobId || !user) return;
    
    const note = prompt("Enter log notes (e.g., weeding completed, harvesting section B):", "Logged workday");
    if (note === null) return;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await api.createWorkday({
        job_id: jobId,
        laborer_id: user.id,
        date: todayStr,
        present: true,
        note: note
      });
      alert("Today's workday has been logged successfully and appended to farmer contract details.");
      await loadDashboardData();
    } catch (err) {
      alert(err.message || "Failed to log workday. (Note: Attendance can only be logged once per day)");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* User Welcome Widget */}
      <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Award className="text-indigo-650 text-indigo-600" size={24} />
            Labour Workspace: {userName}
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Status: {employmentStatus === 'employed' ? (
              <span className="text-emerald-750 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 font-bold text-[10px]">
                Currently Employed (Locked to 1 Farmer)
              </span>
            ) : (
              <span className="text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 font-bold text-[10px]">
                Unemployed / Looking for Jobs
              </span>
            )}
          </p>
        </div>
        
        {employmentStatus === 'employed' && (
          <button
            onClick={handleResign}
            className="px-4 py-2 border border-red-200 text-red-650 text-red-650 text-red-600 hover:bg-red-50 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm font-bold"
          >
            <LogOut size={13} />
            <span>Resign / Leave Job</span>
          </button>
        )}
      </div>

      {isLoading && !dashboardData ? (
        <div className="text-center py-12 text-slate-400 font-bold text-xs">Loading workspace...</div>
      ) : employmentStatus === 'employed' && activeJob ? (
        /* ================= EMPLOYED STATE UI ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Employer details */}
          <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <UserCheck className="text-emerald-600" size={18} />
              Current Active Employer
            </h3>

            <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl space-y-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Farmer Name</span>
                <strong className="text-sm font-extrabold text-slate-800">{activeJob.employer}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Phone Number</span>
                <strong className="text-xs font-bold text-slate-700 block">{activeJob.phone}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Daily Payout Rate</span>
                <strong className="text-sm font-extrabold text-emerald-800">₹{activeJob.rate} / Day</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Location Site</span>
                <strong className="text-xs font-bold text-slate-700">{activeJob.location}</strong>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl flex gap-2">
              <ShieldAlert className="text-amber-600 flex-shrink-0" size={16} />
              <p className="text-[10px] font-semibold text-amber-800 leading-relaxed">
                Single-Contract Guard: To apply for other local farm jobs, you must first resign or check-out of your current agreement.
              </p>
            </div>
          </div>

          {/* Active Tasks list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <CheckSquare className="text-emerald-600" size={18} />
                Assigned Task List ({activeJob.tasks.filter(t => !!taskState[t.id]).length}/{activeJob.tasks.length})
              </h3>

              <div className="divide-y divide-slate-100">
                {activeJob.tasks.map(task => {
                  const isCompleted = !!taskState[task.id];
                  return (
                    <label 
                      key={task.id}
                      className="flex items-center gap-3 py-3 hover:bg-slate-50/20 px-2 rounded-xl transition duration-150 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => handleToggleTask(task.id)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className={`text-xs font-semibold text-slate-700 transition ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                        {task.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Days log tracker */}
            <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <Calendar className="text-emerald-600" size={18} />
                  Contract Working Log
                </h3>
                
                <button
                  onClick={handleLogWorkday}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-600/10 flex items-center gap-1.5"
                >
                  <Calendar size={13} />
                  <span>Log Today's Workday</span>
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Start Date</span>
                  <span className="text-xs font-bold text-slate-800 block mt-1">{activeJob.startDate}</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Days Logged</span>
                  <span className="text-sm font-extrabold text-emerald-800 block mt-1">{activeJob.daysWorked} Days</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Accrued Wage</span>
                  <span className="text-sm font-extrabold text-emerald-800 block mt-1">₹{activeJob.totalCost}</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Contract Status</span>
                  <span className="text-[10px] bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full inline-block mt-1">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= UNEMPLOYED STATE UI ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active applications tracking */}
          <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <Clock className="text-emerald-600" size={18} />
              Active Job Applications ({activeApplications.length})
            </h3>

            {activeApplications.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Clock className="mx-auto text-slate-200 mb-1" size={24} />
                <p className="text-[10px] font-bold">No active applications</p>
                <p className="text-[9px] font-medium text-slate-400">Apply to jobs in the marketplace to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeApplications.map(app => (
                  <div key={app.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-slate-800">{app.title}</h4>
                      <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-100">
                        {app.status === 'PENDING' ? 'Pending Approval' : app.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold">Employer: {app.employer} • Rate: ₹{app.rate}/Day</p>
                    
                    {/* Sandbox tool: allow accepting job from pending list */}
                    {app.status === 'PENDING' && (
                      <button
                        onClick={() => handleAcceptJobApplication(app.id)}
                        className="w-full mt-2 py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle size={10} />
                        <span>Simulate Farmer Accepting Application</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Job feed section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <Briefcase className="text-emerald-600" size={18} />
                  Discover Regional Job Openings
                </h3>
              </div>

              {hasApplied && (
                <div className="p-3.5 mb-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-2">
                  <ShieldAlert className="text-amber-600 flex-shrink-0" size={16} />
                  <p className="text-[10px] font-semibold text-amber-800 leading-relaxed">
                    Single-Application Guard: You have an active application pending farmer approval. You cannot apply to other jobs until your current application is accepted or rejected.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {jobsFeed.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-xs font-bold">No jobs currently available</p>
                  </div>
                ) : (
                  jobsFeed.map(job => (
                    <div key={job.id} className="border border-slate-100 rounded-2xl p-5 bg-white flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-emerald-100 hover:shadow-sm transition-all duration-200">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-800">{job.title}</h4>
                        <p className="text-xs text-slate-400 font-semibold mt-1">
                          Employer: {job.employer} • Location: {job.location}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="bg-indigo-50 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Requires: {job.skill}
                          </span>
                          <span className="bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Payout: ₹{job.rate}/Day
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleApplyJob(job.id)}
                        disabled={job.applied || hasApplied}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer self-start sm:self-center ${
                          job.applied 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200/50' 
                            : hasApplied
                              ? 'bg-slate-100 text-slate-400 border border-slate-200/50 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/5'
                        }`}
                      >
                        {job.applied ? (
                          <span>Applied</span>
                        ) : hasApplied ? (
                          <span>Locked</span>
                        ) : (
                          <>
                            <span>Apply Now</span>
                            <ArrowRight size={12} />
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
