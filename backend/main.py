from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
import models  # noqa: F401 — registers all ORM models before create_all
from routers import projects, toc

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="VSM·TOC API",
    description="Value Stream Mapping + Theory of Constraints integrated tool",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://frontend:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(toc.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "vsm-toc-api"}
