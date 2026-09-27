export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const api = {
  // Auth
  login: async (role, identifier, password) => {
    const isEmail = identifier.includes('@');
    const payload = {
      role,
      email: isEmail ? identifier : null,
      phone: !isEmail ? identifier : null,
      password
    };
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    return await res.json();
  },
  
  register: async (data) => {
    const payload = {
      role: data.role,
      email: data.email || `${data.phone}@kissan.in`,
      password: data.password,
      full_name: data.name,
      phone: data.phone,
      state: data.region || 'Maharashtra',
      skills: data.skills || [],
      daily_rate: data.daily_rate ? Number(data.daily_rate) : null,
      experience_yrs: data.experience_yrs ? Number(data.experience_yrs) : null,
    };
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    return await res.json();
  },

  me: async (userId) => {
    const res = await fetch(`${BASE_URL}/auth/me?user_id=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch user');
    return await res.json();
  },

  sendOtp: async (phone) => {
    const res = await fetch(`${BASE_URL}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to send OTP');
    }
    return await res.json();
  },

  verifyOtp: async (phone, code) => {
    const res = await fetch(`${BASE_URL}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Invalid OTP code');
    }
    return await res.json();
  },

  // Crops
  listCrops: async () => {
    const res = await fetch(`${BASE_URL}/crops/`);
    if (!res.ok) throw new Error('Failed to list crops');
    return await res.json();
  },

  createCrop: async (data) => {
    const res = await fetch(`${BASE_URL}/crops/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create crop');
    return await res.json();
  },

  deleteCrop: async (id) => {
    const res = await fetch(`${BASE_URL}/crops/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete crop');
    return await res.json();
  },

  // Workers
  listWorkers: async () => {
    const res = await fetch(`${BASE_URL}/workers/`);
    if (!res.ok) throw new Error('Failed to list workers');
    return await res.json();
  },

  createWorker: async (data) => {
    const res = await fetch(`${BASE_URL}/workers/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create worker');
    return await res.json();
  },

  deleteWorker: async (id) => {
    const res = await fetch(`${BASE_URL}/workers/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete worker');
    return await res.json();
  },

  // Equipment
  listEquipment: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/platform/equipment?${query}`);
    if (!res.ok) throw new Error('Failed to list equipment');
    return await res.json();
  },

  createEquipment: async (data) => {
    const res = await fetch(`${BASE_URL}/platform/equipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create equipment');
    }
    return await res.json();
  },

  updateEquipment: async (id, data) => {
    const res = await fetch(`${BASE_URL}/platform/equipment/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update equipment');
    return await res.json();
  },

  deleteEquipment: async (id) => {
    const res = await fetch(`${BASE_URL}/platform/equipment/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete equipment');
    return await res.json();
  },

  // Rentals
  listRentals: async (userId) => {
    const url = userId ? `${BASE_URL}/platform/rentals?user_id=${userId}` : `${BASE_URL}/platform/rentals`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to list rentals');
    return await res.json();
  },

  createRental: async (data) => {
    const res = await fetch(`${BASE_URL}/platform/rentals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to request rental');
    }
    return await res.json();
  },

  updateRental: async (id, status) => {
    const res = await fetch(`${BASE_URL}/platform/rentals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update rental');
    return await res.json();
  },

  // Jobs
  listJobs: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/platform/jobs?${query}`);
    if (!res.ok) throw new Error('Failed to list jobs');
    return await res.json();
  },

  createJob: async (data) => {
    const res = await fetch(`${BASE_URL}/platform/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create job');
    }
    return await res.json();
  },

  completeJob: async (id) => {
    const res = await fetch(`${BASE_URL}/platform/jobs/${id}/complete`, {
      method: 'PATCH'
    });
    if (!res.ok) throw new Error('Failed to complete job');
    return await res.json();
  },

  // Applications
  listApplications: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/platform/applications?${query}`);
    if (!res.ok) throw new Error('Failed to list applications');
    return await res.json();
  },

  createApplication: async (data) => {
    const res = await fetch(`${BASE_URL}/platform/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to submit application');
    }
    return await res.json();
  },

  updateApplication: async (id, status) => {
    const res = await fetch(`${BASE_URL}/platform/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update application');
    return await res.json();
  },

  // Dashboards
  getFarmerDashboard: async (farmerId) => {
    const res = await fetch(`${BASE_URL}/platform/dashboard/farmer?farmer_id=${farmerId}`);
    if (!res.ok) throw new Error('Failed to fetch farmer dashboard');
    return await res.json();
  },

  getLaborDashboard: async (laborerId) => {
    const res = await fetch(`${BASE_URL}/platform/dashboard/labor?laborer_id=${laborerId}`);
    if (!res.ok) throw new Error('Failed to fetch laborer dashboard');
    return await res.json();
  },

  // Notifications
  listNotifications: async (userId) => {
    const res = await fetch(`${BASE_URL}/platform/notifications?user_id=${userId}`);
    if (!res.ok) throw new Error('Failed to list notifications');
    return await res.json();
  },

  readAllNotifications: async (userId) => {
    const res = await fetch(`${BASE_URL}/platform/notifications/read-all?user_id=${userId}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to clear notifications');
    return await res.json();
  },

  // Admin Verification & Blacklist
  adminListUsers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/platform/admin/users?${query}`);
    if (!res.ok) throw new Error('Failed to fetch admin users queue');
    return await res.json();
  },

  adminVerifyUser: async (id, status, adminNote) => {
    const res = await fetch(`${BASE_URL}/platform/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, admin_note: adminNote })
    });
    if (!res.ok) throw new Error('Failed to verify user');
    return await res.json();
  },

  adminListBlacklist: async () => {
    const res = await fetch(`${BASE_URL}/platform/admin/blacklist`);
    if (!res.ok) throw new Error('Failed to list blacklist');
    return await res.json();
  },

  adminAddBlacklist: async (data) => {
    const res = await fetch(`${BASE_URL}/platform/admin/blacklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add to blacklist');
    return await res.json();
  },

  adminDeleteBlacklist: async (id) => {
    const res = await fetch(`${BASE_URL}/platform/admin/blacklist/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to remove from blacklist');
    return await res.json();
  },

  // Sync Push
  pushSync: async (queueItems) => {
    const res = await fetch(`${BASE_URL}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: queueItems })
    });
    if (!res.ok) throw new Error('Failed to push offline sync');
    return await res.json();
  },

  // Workdays
  createWorkday: async (data) => {
    const res = await fetch(`${BASE_URL}/platform/workdays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to log workday');
    return await res.json();
  },

  listWorkdays: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/platform/workdays?${query}`);
    if (!res.ok) throw new Error('Failed to list workdays');
    return await res.json();
  },

  // Job Assignments
  assignWorker: async (jobId, workerId) => {
    const res = await fetch(`${BASE_URL}/jobs/${jobId}/assign?worker_id=${workerId}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to assign worker');
    return await res.json();
  },

  unassignWorker: async (jobId) => {
    const res = await fetch(`${BASE_URL}/jobs/${jobId}/unassign`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to unassign worker');
    return await res.json();
  },

  // Voice Session
  createVoiceSession: async (data) => {
    const res = await fetch(`${BASE_URL}/platform/voice-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create voice session');
    return await res.json();
  },

  // AI Intent Parser
  parseIntent: async (transcript, language = 'en', sessionId = null) => {
    const res = await fetch(`${BASE_URL}/intent/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        language,
        session_id: sessionId || `session_${Date.now()}`
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to parse speech intent');
    }
    return await res.json();
  },

  // Audio Chunk Streaming & Finalization
  uploadAudioChunk: async (audioBlob, sessionId, chunkIndex, mimeType = 'audio/webm') => {
    const formData = new FormData();
    formData.append('audio', audioBlob, `chunk_${chunkIndex}.webm`);
    formData.append('session_id', sessionId);
    formData.append('chunk_index', String(chunkIndex));
    formData.append('mime_type', mimeType);

    const res = await fetch(`${BASE_URL}/audio/chunk`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload audio chunk');
    return await res.json();
  },

  finalizeAudioSession: async (sessionId, language = 'en-IN', userId = null) => {
    const res = await fetch(`${BASE_URL}/audio/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        language,
        user_id: userId
      })
    });
    if (!res.ok) throw new Error('Failed to finalize audio session');
    return await res.json();
  },

  translateText: async (text, sourceLang = 'en-IN', targetLang = 'hi-IN') => {
    const res = await fetch(`${BASE_URL}/audio/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        source_lang: sourceLang,
        target_lang: targetLang
      })
    });
    if (!res.ok) throw new Error('Failed to translate text');
    return await res.json();
  }
};
