import asyncio
import uuid
from typing import Dict, List
from fastapi import WebSocket
from websockets.exceptions import ConnectionClosed
import os
from datetime import datetime
import aiofiles
import time


class ConnectionManager:
    def __init__(self):
        self.active_pairs: Dict[str, Dict[str, WebSocket]] = {}
        self.waiting_clients: List[WebSocket] = []
        self.waiting_operators: List[WebSocket] = []
        self.lock = asyncio.Lock()
        self.audio_storage = "audio_sessions"
        os.makedirs(self.audio_storage, exist_ok=True)
    
    # Добавляем инициализацию новых атрибутов
        self.audio_buffers: Dict[str, Dict[str, List[bytes]]] = {}  # {session_id: {"client": [], "operator": []}}
        self.last_save_time: Dict[str, Dict[str, float]] = {} 

        print(f"Audio files will be saved to: {os.path.abspath(self.audio_storage)}")



    async def accept_connection(self, websocket: WebSocket) -> bool:
        """Принимает соединение и возвращает статус"""
        try:
            await websocket.accept()
            print(f"Connection accepted from {websocket.client}")
            return True
        except Exception as e:
            print(f"Connection accept failed: {e}")
            return False

    async def connect_client(self, websocket: WebSocket) -> bool:
        """Обрабатывает подключение клиента"""
        if not await self.accept_connection(websocket):
            return False
            
        async with self.lock:
            try:
                await websocket.send_json({"type": "waiting"})
                self.waiting_clients.append(websocket)
                print(f"New client connected. Total clients: {len(self.waiting_clients)}")
                await self._try_pair_connections()
                return True
            except Exception as e:
                print(f"Client connection error: {e}")
                return False

    async def connect_operator(self, websocket: WebSocket) -> bool:
        """Обрабатывает подключение оператора"""
        if not await self.accept_connection(websocket):
            return False
            
        async with self.lock:
            try:
                self.waiting_operators.append(websocket)
                print(f"New operator connected. Total operators: {len(self.waiting_operators)}")
                await self._try_pair_connections()
                return True
            except Exception as e:
                print(f"Operator connection error: {e}")
                return False

    async def _try_pair_connections(self):
        """Пытается соединить клиентов и операторов"""
        while self.waiting_clients and self.waiting_operators:
            client = self.waiting_clients.pop(0)
            operator = self.waiting_operators.pop(0)
            
            session_id = str(uuid.uuid4())
            self.active_pairs[session_id] = {
                "client": client,
                "operator": operator
            }
            
            await asyncio.gather(
            client.send_json({
                "type": "call_connected",
                "session_id": session_id,
                "role": "client"
            }),
            operator.send_json({
                "type": "client_connected",
                "session_id": session_id,
                "role": "operator"
            })
        )
            try:
                await asyncio.gather(
                    client.send_json({"type": "call_connected", "session_id": session_id}),
                    operator.send_json({"type": "client_connected", "session_id": session_id})
                )
                print(f"Paired successfully. Session ID: {session_id}")
            except Exception as e:
                print(f"Pairing failed: {e}")
                # Возвращаем в очереди при ошибке
                self.waiting_clients.insert(0, client)
                self.waiting_operators.insert(0, operator)
                del self.active_pairs[session_id]
                break

    async def broadcast_audio(self, sender: WebSocket, data: bytes):
        print(f"🔊 Received audio data: {len(data)} bytes")
        async with self.lock:
            for session_id, pair in list(self.active_pairs.items()):
                try:
                    if pair["client"] == sender:
                        print(f"🔁 Forwarding to operator (session: {session_id})")
                        await pair["operator"].send_bytes(data)
                    # Только добавляем в буфер, не сохраняем сразу
                        await self._add_to_buffer(session_id, "operator", data)
                        return
                
                    if pair["operator"] == sender:
                        print(f"🔁 Forwarding to client (session: {session_id})")
                        await pair["client"].send_bytes(data)
                        await self._add_to_buffer(session_id, "client", data)
                        return
                except ConnectionClosed:
                    await self._cleanup_connection(sender)
                except Exception as e:
                    print(f"Unexpected error: {e}")
                    continue

    async def _add_to_buffer(self, session_id: str, role: str, data: bytes):
        """Добавляет данные в буфер и запускает сохранение при необходимости"""
        if session_id not in self.audio_buffers:
            self.audio_buffers[session_id] = {"client": [], "operator": []}
            self.last_save_time[session_id] = {"client": time.time(), "operator": time.time()}
    
        self.audio_buffers[session_id][role].append(data)
    
    # Сохраняем если прошло больше 10 секунд
        if time.time() - self.last_save_time[session_id][role] >= 10:
            await self._flush_buffer(session_id, role)

    async def _flush_buffer(self, session_id: str, role: str):
        """Сохраняет накопленные данные в файл"""
        if not self.audio_buffers.get(session_id, {}).get(role):
            return
    
        combined_data = b"".join(self.audio_buffers[session_id][role])
        if not combined_data:
            return
    
        # Добавляем WebM заголовок если его нет
        if not combined_data.startswith(b'\x1a\x45\xdf\xa3'):
            header = (b'\x1a\x45\xdf\xa3\x01\x00\x00\x00\x00\x00\x00\x1f\x42\x86\x81\x01'
                 b'\x42\x84\x81\x01\x42\x85\x81\x01')
            combined_data = header + combined_data
    
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{session_id}_{role}_{timestamp}.webm"
        filepath = os.path.join(self.audio_storage, filename)
    
        try:
            async with aiofiles.open(filepath, 'wb') as f:
                await f.write(combined_data)
            print(f"✅ Saved {len(combined_data)} bytes to {filename}")
        
        # Очищаем буфер
            self.audio_buffers[session_id][role] = []
            self.last_save_time[session_id][role] = time.time()
        except Exception as e:
            print(f"❌ Failed to save audio: {e}")

    async def _cleanup_connection(self, websocket: WebSocket):
        """Очищает соединение из всех очередей и удаляет связанные аудиофайлы"""
        async with self.lock:
        # Удаляем из очередей ожидания
            if websocket in self.waiting_clients:
                self.waiting_clients.remove(websocket)
                print("Removed client from waiting list")
                return
            
            if websocket in self.waiting_operators:
                self.waiting_operators.remove(websocket)
                print("Removed operator from waiting list")
                return
        
        # Удаляем из активных пар
            for session_id, pair in list(self.active_pairs.items()):
                if websocket in [pair["client"], pair["operator"]]:
                # 1. Сохраняем оставшиеся данные из буферов
                    if hasattr(self, 'audio_buffers') and session_id in self.audio_buffers:
                        for role in ["client", "operator"]:
                            if self.audio_buffers[session_id][role]:
                                combined_data = b"".join(self.audio_buffers[session_id][role])
                                if combined_data:
                                    await self._safe_save_audio(session_id, role, b"")  # trigger final save
                
                # 2. Удаляем файлы сессии
                await self._delete_session_files(session_id)
                
                # 3. Очищаем соединение
                other = pair["operator"] if websocket == pair["client"] else pair["client"]
                try:
                    await other.send_json({"type": "call_ended"})
                except:
                    pass
                del self.active_pairs[session_id]
                
                # 4. Очищаем буферы
                if hasattr(self, 'audio_buffers') and session_id in self.audio_buffers:
                    del self.audio_buffers[session_id]
                if hasattr(self, 'last_save_time') and session_id in self.last_save_time:
                    del self.last_save_time[session_id]
                
                print(f"Session {session_id} terminated and files cleaned")
                break


    async def _safe_save_audio(self, session_id: str, role: str, data: bytes):
        try:
        # Инициализация буферов, если их нет
            if not hasattr(self, 'audio_buffers'):
                self.audio_buffers = {}
            if not hasattr(self, 'last_save_time'):
                self.last_save_time = {}
            
            if session_id not in self.audio_buffers:
                self.audio_buffers[session_id] = {"client": [], "operator": []}
                self.last_save_time[session_id] = {"client": time.time(), "operator": time.time()}
        
            # Добавляем данные в буфер
            self.audio_buffers[session_id][role].append(data)
        
        # Проверяем, нужно ли сохранять (каждые 10 секунд)
            if time.time() - self.last_save_time[session_id][role] >= 10:
                combined_data = b"".join(self.audio_buffers[session_id][role])
                if combined_data:
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"{session_id}_{role}_{timestamp}.webm"
                    filepath = os.path.join(self.audio_storage, filename)
                
                    print(f"📁 Saving combined audio: {filepath}")
                
                    async with aiofiles.open(filepath, 'wb') as f:
                        await f.write(combined_data)
                        print(f"✅ Successfully saved combined audio: {filename}")
                
                # Очищаем буфер и обновляем время
                    self.audio_buffers[session_id][role] = []
                    self.last_save_time[session_id][role] = time.time()
                
        except Exception as e:
            print(f"❌ Error in _safe_save_audio: {str(e)}")
            raise
            
    async def _write_file(self, path: str, data: bytes):
        """Асинхронная запись файла"""
        try:
            async with aiofiles.open(path, 'wb') as f:
                await f.write(data)
        except Exception as e:
            print(f"Error writing file {path}: {e}")
            raise

    async def get_session_files(self, session_id: str):
        """Возвращает файлы конкретной сессии"""
        if not os.path.exists(self.audio_storage):
            return []
    
        session_files = []
        try:
            for filename in os.listdir(self.audio_storage):
                if filename.startswith(session_id):
                    filepath = os.path.join(self.audio_storage, filename)
                    if os.path.isfile(filepath):
                        session_files.append({
                            "filename": filename,
                            "size": os.path.getsize(filepath),
                            "modified": os.path.getmtime(filepath)
                        })
        except Exception as e:
            print(f"Error listing files: {e}")
            raise  # Перебрасываем исключение для обработки в FastAPI
    
        return session_files
    
    async def _delete_session_files(self, session_id: str):
        """Удаляет все файлы, связанные с сессией"""
        try:
            if not os.path.exists(self.audio_storage):
                return

            for filename in os.listdir(self.audio_storage):
                if filename.startswith(session_id):
                    filepath = os.path.join(self.audio_storage, filename)
                    try:
                        os.remove(filepath)
                        print(f"Deleted session file: {filename}")
                    except Exception as e:
                        print(f"Error deleting file {filename}: {e}")
        except Exception as e:
            print(f"Error in _delete_session_files: {e}")