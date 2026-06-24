export const SEED_CROPS = [
  {
    id: "7b9d313c-6cb2-4a0d-9b55-6b586bbd7cfa",
    farmer_id: "e3cb89cf-4a3b-4861-84bb-7313a0c5c3fb",
    name: "Basmati Rice",
    category: "grain",
    quantity_kg: 1200,
    price_per_kg: 85,
    status: "available",
    harvest_date: "2026-05-15",
    created_at: "2026-05-15T10:30:00Z",
    updated_at: "2026-05-15T10:30:00Z",
    sync_status: "synced"
  },
  {
    id: "f3c39df5-60b8-444f-a9cb-652f1e679a83",
    farmer_id: "e3cb89cf-4a3b-4861-84bb-7313a0c5c3fb",
    name: "Red Onions",
    category: "vegetable",
    quantity_kg: 2500,
    price_per_kg: 32,
    status: "available",
    harvest_date: "2026-05-20",
    created_at: "2026-05-20T08:15:00Z",
    updated_at: "2026-05-20T08:15:00Z",
    sync_status: "synced"
  }
];

export const SEED_WORKERS = [
  {
    id: "w1-9b55-6b586bbd7cfa",
    name: "Suresh Patil",
    phone: "+91 91234 56789",
    state: "Maharashtra",
    skills: ["Harvesting", "Sowing"],
    daily_rate: 450,
    status: "active",
    created_at: "2026-05-26T09:00:00Z",
    updated_at: "2026-05-26T09:00:00Z",
    sync_status: "synced"
  },
  {
    id: "w2-a9cb-652f1e679a83",
    name: "Amit Shinde",
    phone: "+91 99887 76655",
    state: "Maharashtra",
    skills: ["Tractor Driving", "Soil Tilling"],
    daily_rate: 650,
    status: "active",
    created_at: "2026-05-26T10:30:00Z",
    updated_at: "2026-05-26T10:30:00Z",
    sync_status: "synced"
  },
  {
    id: "w3-f3cb-652f1e679b94",
    name: "Ramesh Pawar",
    phone: "+91 98765 43210",
    state: "Maharashtra",
    skills: ["Irrigation", "Sowing"],
    daily_rate: 400,
    status: "active",
    created_at: "2026-05-26T11:00:00Z",
    updated_at: "2026-05-26T11:00:00Z",
    sync_status: "synced"
  }
];

export const SEED_JOBS = [
  {
    id: "j1-7cfa-4a0d-9b55-6b586bbd7cfa",
    worker_id: "w2-a9cb-652f1e679a83",
    title: "Tractor Soil Tilling",
    description: "Tilling of 4.5 acres of land in Nashik using modern tractor equipment.",
    location: "Pimplad Village",
    payment: 1800,
    required_skill: "Soil Tilling",
    status: "assigned",
    created_at: "2026-05-27T06:00:00Z",
    updated_at: "2026-05-27T06:00:00Z",
    sync_status: "synced"
  },
  {
    id: "j2-8cfa-4a0d-9b55-6b586bbd7cfb",
    worker_id: null,
    title: "Wheat Crop Harvesting",
    description: "Manual harvesting and gathering of high-grade wheat crop over 2 acres.",
    location: "Sinnar Region",
    payment: 1200,
    required_skill: "Harvesting",
    status: "open",
    created_at: "2026-05-27T08:00:00Z",
    updated_at: "2026-05-27T08:00:00Z",
    sync_status: "synced"
  }
];
