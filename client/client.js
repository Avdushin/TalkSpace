import { logout, getToken } from './auth.js';

// Функция рендера для голосового канала
export function renderVoiceChannel(container) {
    container.innerHTML = `
        <h2>Voice Channel</h2>
        <div id="status">
            <p><strong>Status:</strong> <span id="connection-status">Not connected</span></p>
            <p><strong>Microphone:</strong> <span id="mic-status">Not muted</span></p>
        </div>
        <div id="devices">
            <label for="audioInputSelect">Select Microphone:</label>
            <select id="audioInputSelect"></select>
            <label for="audioOutputSelect">Select Speaker:</label>
            <select id="audioOutputSelect"></select>
        </div>
        <div id="participants">
            <h3>Participants:</h3>
            <ul id="participant-list">
                <!-- Список участников будет добавлен динамически -->
            </ul>
        </div>
        <button id="connect">Connect to Voice Channel</button>
        <button id="disconnect">Disconnect from Voice Channel</button>
        <button id="mute">Mute</button>
        <button id="unmute">Unmute</button>
        <button id="logout">Logout</button>
    `;

    // Вызов функций для управления голосовым каналом
    initializeVoiceChannel();
}

function initializeVoiceChannel() {
    let socket;
    let peerConnection;
    let localStream;
    let iceCandidateQueue = [];

    const connectButton = document.getElementById('connect');
    const disconnectButton = document.getElementById('disconnect');
    const muteButton = document.getElementById('mute');
    const unmuteButton = document.getElementById('unmute');
    const connectionStatus = document.getElementById('connection-status');
    const micStatus = document.getElementById('mic-status');
    const participantList = document.getElementById('participant-list');
    const audioInputSelect = document.getElementById('audioInputSelect');
    const audioOutputSelect = document.getElementById('audioOutputSelect');
    const logoutButton = document.getElementById('logout');

    let selectedAudioInput = null;
    let selectedAudioOutput = null;

    // Перечисляем устройства ввода и вывода звука
    navigator.mediaDevices.enumerateDevices().then(devices => {
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `${device.kind} ${device.deviceId}`;
            if (device.kind === 'audioinput') {
                audioInputSelect.appendChild(option);
            } else if (device.kind === 'audiooutput') {
                audioOutputSelect.appendChild(option);
            }
        });
    });

    // Изменение выбранного микрофона
    audioInputSelect.onchange = () => {
        selectedAudioInput = audioInputSelect.value;
        getUserMediaWithConstraints();
    };

    // Изменение выбранного динамика
    audioOutputSelect.onchange = () => {
        selectedAudioOutput = audioOutputSelect.value;
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
            if (typeof audio.setSinkId !== 'undefined') {
                audio.setSinkId(selectedAudioOutput)
                    .then(() => console.log(`Audio output device attached: ${selectedAudioOutput}`))
                    .catch(error => console.error('Error attaching audio output device:', error));
            }
        });
    };

    // Подключение к WebSocket
    function connectWebSocket() {
        const token = getToken();
        if (!token) {
            console.error("User is not authenticated. Cannot connect to WebSocket.");
            return;
        }

        socket = new WebSocket(`ws://127.0.0.1:8080/ws/voice_channel/1?token=${token}`);

        socket.onopen = () => {
            console.log("Connected to WebSocket server");
            connectionStatus.innerText = 'Connected';
            initializeWebRTC();
        };

        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);

            // Обработка offer
            if (message.type === 'offer') {
                if (peerConnection.signalingState === 'stable') {
                    peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp))
                        .then(() => peerConnection.createAnswer())
                        .then(answer => peerConnection.setLocalDescription(answer))
                        .then(() => sendMessage({ type: 'answer', sdp: peerConnection.localDescription }))
                        .then(() => {
                            iceCandidateQueue.forEach(candidate => {
                                peerConnection.addIceCandidate(candidate)
                                    .catch(error => console.error("Error adding queued ICE candidate:", error));
                            });
                            iceCandidateQueue = [];
                        })
                        .catch(error => console.error("Error during answer creation:", error));
                } else {
                    console.warn("Cannot set offer, invalid signaling state:", peerConnection.signalingState);
                }
            }

            // Обработка ICE кандидатов
            if (message.type === 'ice') {
                if (peerConnection.remoteDescription) {
                    peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate))
                        .catch(error => console.error("Error adding ICE candidate:", error));
                } else {
                    iceCandidateQueue.push(new RTCIceCandidate(message.candidate));
                }
            }

            // Обработка списка участников
            if (message.type === 'participant_list') {
                updateParticipantList(message.participants);
            }
        };

        socket.onclose = () => {
            console.log("WebSocket connection closed");
            connectionStatus.innerText = 'Disconnected';
            setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = (error) => {
            console.error("WebSocket Error:", error);
        };
    }

    // Инициализация WebRTC
    function initializeWebRTC() {
        peerConnection = new RTCPeerConnection();
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                sendMessage({ type: 'ice', candidate: event.candidate });
            }
        };

        peerConnection.ontrack = (event) => {
            const [remoteStream] = event.streams;
            const audioElement = document.createElement('audio');
            audioElement.srcObject = remoteStream;
            audioElement.autoplay = true;
            document.body.appendChild(audioElement);

            if (selectedAudioOutput) {
                audioElement.setSinkId(selectedAudioOutput)
                    .then(() => console.log(`Set audio output to: ${selectedAudioOutput}`))
                    .catch(err => console.error('Error setting audio output device: ', err));
            }
        };

        getUserMediaWithConstraints();
    }

    // Получение медиа
    function getUserMediaWithConstraints() {
        const audioConstraints = selectedAudioInput ? { deviceId: { exact: selectedAudioInput } } : true;
        navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
            .then(stream => {
                localStream = stream;
                peerConnection.addTrack(localStream.getAudioTracks()[0], localStream);
            })
            .catch(error => console.error('Error accessing media devices:', error));
    }

    // Управление микрофоном
    muteButton.addEventListener('click', () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.enabled = false);
            micStatus.innerText = 'Muted';
        }
    });

    unmuteButton.addEventListener('click', () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.enabled = true);
            micStatus.innerText = 'Not muted';
        }
    });

    // Подключение к каналу
    connectButton.addEventListener('click', connectWebSocket);

    // Отключение от канала
    disconnectButton.addEventListener('click', () => {
        if (peerConnection) {
            peerConnection.close();
        }
        if (socket) {
            socket.close();
        }
        connectionStatus.innerText = 'Disconnected';
    });

    // Выход из аккаунта
    logoutButton.addEventListener('click', () => {
        logout();
    });

    // Функция для обновления списка участников
    function updateParticipantList(participants) {
        participantList.innerHTML = '';
        participants.forEach(participant => {
            const li = document.createElement('li');
            li.innerText = participant;
            participantList.appendChild(li);
        });
    }

    // Функция отправки сообщений WebSocket
    function sendMessage(message) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }
}
