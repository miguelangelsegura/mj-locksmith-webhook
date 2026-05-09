import json
import os

from fastapi import FastAPI, Request

app = FastAPI()


@app.get("/")
async def health():
    return {"status": "ok"}


@app.post("/vapi/webhook")
async def vapi_webhook(request: Request):
    raw = await request.body()
    try:
        payload = json.loads(raw)
        print(json.dumps(payload, indent=2), flush=True)
    except Exception as e:
        print(f"[vapi/webhook] failed to parse JSON: {e}", flush=True)
        print(f"[vapi/webhook] raw body: {raw!r}", flush=True)
    return {"received": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
