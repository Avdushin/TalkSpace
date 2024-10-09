import React, { useEffect, useState, useRef } from 'react';
import { getToken, logout } from '../auth';
import { host } from '../vars';

const VoiceChannel: React.FC = () => {
    const [participants, setParticipants] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedAudioInput, setSelectedAudioInput] = useState<string | null>(null);
    const [selectedAudioOutput, setSelectedAudioOutput] = useState<string | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const socket = useRef<WebSocket | null>(null);

    // Получение доступных устройств
    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then((devices) => {
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
            setAudioInputDevices(audioInputs);
            setAudioOutputDevices(audioOutputs);
        });
    }, []);

    // Обработчик выбора устройств
    const handleAudioInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedAudioInput(e.target.value);
    };

    const handleAudioOutputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedAudioOutput(e.target.value);
    };

    // Присоединение к голосовому чату
    const joinVoiceChannel = () => {
        const token = getToken();
        if (!token) return;

        socket.current = new WebSocket(`${host}/ws/voice_channel/1?token=${token}`);

        socket.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'participant_list') {
                setParticipants(data.participants);
            }
        };

        socket.current.onclose = () => {
            console.log('Disconnected from WebSocket');
        };

        // Инициализация WebRTC
        peerConnection.current = new RTCPeerConnection();

        // Обработка ICE кандидатов
        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate && socket.current) {
                socket.current.send(JSON.stringify({
                    type: 'ice',
                    candidate: event.candidate
                }));
            }
        };

        // Получение удаленного потока
        peerConnection.current.ontrack = (event) => {
            const [remoteStream] = event.streams;
            const audioElement = document.createElement('audio');
            audioElement.srcObject = remoteStream;
            audioElement.autoplay = true;
            if (selectedAudioOutput) {
                audioElement.setSinkId(selectedAudioOutput).catch(console.error);
            }
            document.body.appendChild(audioElement);
        };

        // Получение локального медиа-потока
        const audioConstraints = selectedAudioInput ? { deviceId: { exact: selectedAudioInput } } : true;
        navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
            .then((stream) => {
                setLocalStream(stream);
                stream.getTracks().forEach((track) => {
                    peerConnection.current!.addTrack(track, stream);
                });

                // Создание SDP offer
                peerConnection.current!.createOffer()
                    .then((offer) => {
                        return peerConnection.current!.setLocalDescription(offer);
                    })
                    .then(() => {
                        socket.current!.send(JSON.stringify({
                            type: 'offer',
                            sdp: peerConnection.current!.localDescription
                        }));
                    });

                setIsConnected(true);
            })
            .catch((err) => {
                console.error('Ошибка доступа к аудиоустройствам:', err);
            });

        // Обработка offer/answer
        socket.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'offer') {
                peerConnection.current!.setRemoteDescription(new RTCSessionDescription(data.sdp))
                    .then(() => peerConnection.current!.createAnswer())
                    .then((answer) => peerConnection.current!.setLocalDescription(answer))
                    .then(() => {
                        socket.current!.send(JSON.stringify({
                            type: 'answer',
                            sdp: peerConnection.current!.localDescription
                        }));
                    });
            }

            if (data.type === 'answer') {
                peerConnection.current!.setRemoteDescription(new RTCSessionDescription(data.sdp));
            }

            if (data.type === 'ice') {
                const candidate = new RTCIceCandidate(data.candidate);
                peerConnection.current!.addIceCandidate(candidate).catch(console.error);
            }
        };
    };

    // Отключение от голосового чата
    const leaveVoiceChannel = () => {
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        if (socket.current) {
            socket.current.close();
            socket.current = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        setIsConnected(false);
    };

    // Мьют/анмьют микрофона
    const toggleMute = () => {
        if (localStream) {
            localStream.getTracks().forEach((track) => {
                if (track.kind === 'audio') {
                    track.enabled = !track.enabled;
                    setIsMuted(!track.enabled);
                }
            });
        }
    };

    return (
        <div>
            <h2>Голосовой канал</h2>
            <button onClick={logout}>Выйти</button>

            {!isConnected ? (
                <div>
                    <button onClick={joinVoiceChannel}>Присоединиться к голосовому каналу</button>
                    <div>
                        <label htmlFor="audioInputSelect">Выберите микрофон:</label>
                        <select id="audioInputSelect" onChange={handleAudioInputChange}>
                            {audioInputDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || 'Микрофон'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="audioOutputSelect">Выберите динамик:</label>
                        <select id="audioOutputSelect" onChange={handleAudioOutputChange}>
                            {audioOutputDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || 'Динамик'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            ) : (
                <div>
                    <button onClick={leaveVoiceChannel}>Отключиться от голосового канала</button>
                    <button onClick={toggleMute}>{isMuted ? 'Включить микрофон' : 'Выключить микрофон'}</button>
                </div>
            )}

            <h3>Участники:</h3>
            <ul>
                {participants.length > 0 ? (
                    participants.map((participant) => (
                        <li key={participant}>{participant}</li>
                    ))
                ) : (
                    <li>Нет участников</li>
                )}
            </ul>
        </div>
    );
};

export default VoiceChannel;
