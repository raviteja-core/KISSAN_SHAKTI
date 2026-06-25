from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes import auth, crops, jobs, workers, sync, matches, platform, audio

app = FastAPI(title="KissanShakti Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(crops.router, prefix="/api/v1/crops", tags=["crops"])
app.include_router(workers.router, prefix="/api/v1/workers", tags=["workers"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["jobs"])
app.include_router(matches.router, prefix="/api/v1/matches", tags=["matches"])
app.include_router(sync.router, prefix="/api/v1/sync", tags=["sync"])
app.include_router(platform.router, prefix="/api/v1/platform", tags=["platform"])
app.include_router(audio.router, prefix="/api/v1/audio", tags=["audio"])


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "kissan-shakti-backend",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "kissan-shakti-backend"}
