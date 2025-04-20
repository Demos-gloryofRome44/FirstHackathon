from app.managers import ConnectionManager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile
import os
import uuid
import asyncio  
from typing import Dict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
manager = ConnectionManager()

print(f"✅ Audio storage initialized at: {os.path.abspath(manager.audio_storage)}")
print(f"✅ Storage exists: {os.path.exists(manager.audio_storage)}")
print(f"✅ Is writable: {os.access(manager.audio_storage, os.W_OK)}")

@app.get("/")
async def root():
    return {"message": "Server is running"}

@app.websocket("/ws/client")
async def client_websocket(websocket: WebSocket):
    await manager.connect_client(websocket)
    try:
        while True:
            data = await websocket.receive_bytes()
            await manager.broadcast_audio(websocket, data)
    except Exception as e:
        print(f"Клиент отключен: {e}")
        await manager._cleanup_connection(websocket)

@app.websocket("/ws/operator")
async def operator_websocket(websocket: WebSocket):
    await manager.connect_operator(websocket)
    try:
        while True:
            data = await websocket.receive_bytes()
            await manager.broadcast_audio(websocket, data)
    except Exception as e:
        print(f"Оператор отключен: {e}")
        await manager._cleanup_connection(websocket)

@app.get("/session_files/{session_id}")
async def get_files(session_id: str):
    return manager.get_session_files(session_id)

@app.post("/process_audio")
async def process_audio(file_path: str):
    return await manager.process_audio_file(file_path)

@app.get("/summarize")
async def summarize():
    return await manager.summarize_text()

@app.get("/active_sessions")
async def get_active_sessions():
    return {
        "active_sessions": list(manager.active_pairs.keys())
    }

@app.get("/audio/{session_id}")
async def get_session_audio(session_id: str):
    try:
        files = await manager.get_session_files(session_id)
        if not files:
            raise HTTPException(
                status_code=404,
                detail=f"No files found for session {session_id}"
            )
        return {"session_id": session_id, "files": files}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing request: {str(e)}"
        )

@app.get("/audio/download/{filename}")
async def download_audio(filename: str):
    """Скачивание конкретного аудиофайла"""
    filepath = os.path.join(manager.audio_storage, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath, media_type="audio/webm")

@app.post("/process_session/{session_id}")
async def process_session_audio(session_id: str):
    """Обработка всех аудиофайлов сессии"""
    files = await manager.get_session_files(session_id)
    if not files:
        raise HTTPException(status_code=404, detail="Session not found")
    
    results = []
    for file in files:
        # Здесь можно добавить обработку каждого файла
        results.append({
            "file": file["name"],
            "status": "processed",
            "result": {}  # Заглушка для результатов обработки
        })
    
    return {"session_id": session_id, "results": results}

