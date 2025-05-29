from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def read_root():
    return {"message": "Hello from ChordLens Backend!"}


@app.get("/api/test")
async def read_test_api():
    return {"message": "This is a test API endpoint"}
