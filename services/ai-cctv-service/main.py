from fastapi import FastAPI

app = FastAPI(title="SurakshaNet AI CCTV Service")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "surakshanet-ai-cctv-service"}
