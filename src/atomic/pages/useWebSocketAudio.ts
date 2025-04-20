import { useState, useRef, useEffect } from 'react';

type CallStatus = 'disconnected' | 'waiting' | 'connected';

export const useWebSocketAudio = (url: string, role: 'client' | 'operator') => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [callStatus, setCallStatus] = useState<CallStatus>('disconnected');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const [audioQueue, setAudioQueue] = useState<ArrayBuffer[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);

    // Уникальный ID для логов
    const connectionId = useRef(Date.now()).current;

    const log = (message: string, data?: any) => {
        console.log(`[${role.toUpperCase()}-${connectionId}] ${message}`, data || '');
    };

    const getAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            log("AudioContext created");
        }
        return audioContextRef.current;
    };

    const playAudioBuffer = async (arrayBuffer: ArrayBuffer) => {
        log("Starting audio playback", { size: arrayBuffer.byteLength });
        
        try {
            const audioContext = getAudioContext();
            const blob = new Blob([arrayBuffer], { type: 'audio/webm;codecs=opus' });
            const url = URL.createObjectURL(blob);
            
            log("Audio blob created", { blob, url });

            // Вариант 1: Воспроизведение через HTML Audio
            try {
                const audio = new Audio();
                audio.src = url;
                audio.onplay = () => log("HTML Audio playback started");
                audio.onended = () => log("HTML Audio playback ended");
                await audio.play();
                log("HTML Audio play successful");
            } catch (htmlError) {
                log("HTML Audio play failed, falling back to Web Audio API", htmlError);
            }

            // Вариант 2: Воспроизведение через Web Audio API
            try {
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.onended = () => log("Web Audio playback ended");
                source.start(0);
                log("Web Audio playback started");
            } catch (webAudioError) {
                log("Web Audio API playback failed", webAudioError);
            }
        } catch (error) {
            log("Audio playback failed", error);
        }
    };

    const processAudioQueue = async () => {
        if (audioQueue.length === 0 || isPlaying || !audioContextRef.current) {
            log("Audio queue processing skipped", { 
                queueLength: audioQueue.length,
                isPlaying,
                hasContext: !!audioContextRef.current
            });
            return;
        }
        
        log("Processing audio queue", { queueLength: audioQueue.length });
        setIsPlaying(true);
        
        try {
            const nextAudio = audioQueue[0];
            log("Playing next audio chunk", { size: nextAudio.byteLength });
            await playAudioBuffer(nextAudio);
            setAudioQueue(prev => prev.slice(1));
        } catch (err) {
            log("Queue processing error", err);
        }
        
        setIsPlaying(false);
        processAudioQueue();
    };

    const startRecording = async (ws: WebSocket) => {
        log("Starting recording");
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = getSupportedMimeType();

            if (!mimeType) {
                throw new Error('No supported audio format found');
            }

            log("Recording with mimeType", mimeType);
            
            const recorder = new MediaRecorder(stream, { 
                mimeType,
                audioBitsPerSecond: 128000 
            });

            // Упрощаем отправку аудио, так как сохранение теперь на сервере
            recorder.ondataavailable = async (e) => {
                if (e.data.size > 0 && ws?.readyState === WebSocket.OPEN) {
                    const arrayBuffer = await e.data.arrayBuffer();
                    ws.send(arrayBuffer);
                    console.log(`Sent audio chunk: ${arrayBuffer.byteLength} bytes`);
                }
            };

            recorder.onstart = () => log("Recording started");
            recorder.onstop = () => log("Recording stopped");
            recorder.onerror = (e) => log("Recording error", e);

            recorder.start(role === 'client' ? 1000 : 2000);
            mediaRecorderRef.current = recorder;
            log("MediaRecorder initialized", { interval: role === 'client' ? 1000 : 2000 });
        } catch (err) {
            log("Recording initialization failed", err);
            setCallStatus('disconnected');
        }
    };

    const stopRecording = () => {
        const recorder = mediaRecorderRef.current;
        if (recorder) {
            log("Stopping recording");
            recorder.stream.getTracks().forEach(track => {
                track.stop();
                log("MediaTrack stopped", { kind: track.kind });
            });
            recorder.stop();
            mediaRecorderRef.current = null;
        }
    };

    const getSupportedMimeType = (): string => {
        const testFormats = [
            'audio/webm',
            'audio/mp4',
            'audio/ogg',
            'audio/wav'
        ];
        const supported = testFormats.find(f => MediaRecorder.isTypeSupported(f)) || '';
        log("Checking supported MIME types", { 
            testFormats,
            supported 
        });
        return supported;
    };

    useEffect(() => {
        log(`Connecting to WebSocket at ${url}`);
        const ws = new WebSocket(url);

        ws.onopen = () => {
            log("WebSocket connection established");
            setSocket(ws);
            setCallStatus('waiting');
            
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(() => log("Microphone access granted"))
                .catch(err => log("Microphone access denied", err));
        };

        ws.onmessage = async (event) => {
            if (typeof event.data === 'string') {
                const data = JSON.parse(event.data);
                log("Received text message", data);
                
                if (data.type === (role === 'client' ? 'call_connected' : 'client_connected')) {
                    log("Call connected, starting recording");
                    setCallStatus('connected');
                    await startRecording(ws);
                } else if (data.type === 'call_ended') {
                    log("Call ended, stopping recording");
                    await new Promise(resolve => setTimeout(resolve, 500));
                    stopRecording();
                    setCallStatus('disconnected');
                }
            } else {
                try {
                    log("Received binary data (audio)");
                    const arrayBuffer = await event.data.arrayBuffer();
                    log("Audio chunk received", { 
                        size: arrayBuffer.byteLength,
                        queueLength: audioQueue.length 
                    });
                    
                    setAudioQueue(prev => [...prev, arrayBuffer]);
                    if (!isPlaying) {
                        log("Starting audio queue processing");
                        processAudioQueue();
                    }
                } catch (err) {
                    log("Failed to process audio data", err);
                }
            }
        };

        ws.onerror = (error) => {
            log("WebSocket error", error);
        };

        ws.onclose = () => {
            log("WebSocket connection closed");
            stopRecording();
            setCallStatus('disconnected');
        };

        return () => {
            log("Cleaning up WebSocket connection");
            ws.close();
            stopRecording();
            if (audioContextRef.current) {
                audioContextRef.current.close();
                log("AudioContext closed");
            }
        };
    }, [url, role]);

    return {
        socket,
        callStatus,
        stopRecording,
        endCall: () => {
            log("Manual call termination");
            if (socket) socket.close();
        }
    };
};