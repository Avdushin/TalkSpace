let socket;
let peerConnection;
let localStream;
let iceCandidateQueue = []; // Очередь для ICE кандидатов, которые нужно добавить после установки remoteDescription

const connectButton = document.getElementById('connect');
const disconnectButton = document.getElementById('disconnect');
const muteButton = document.getElementById('mute');
const unmuteButton = document.getElementById('unmute');
const connectionStatus = document.getElementById('connection-status');
const micStatus = document.getElementById('mic-status');
const participantList = document.getElementById('participant-list');
const audioInputSelect = document.getElementById('audioInputSelect');
const audioOutputSelect = document.getElementById('audioOutputSelect');

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
    // Здесь мы можем назначить динамик для аудиоэлементов
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        if (typeof audio.setSinkId !== 'undefined') {
            audio.setSinkId(selectedAudioOutput)
                .then(() => console.log(`Success, audio output device attached: ${selectedAudioOutput}`))
                .catch(error => console.error('Error attaching audio output device: ', error));
        }
    });
};

// Получение медиа с выбранным микрофоном
function getUserMediaWithConstraints() {
    const audioConstraints = selectedAudioInput ? { deviceId: { exact: selectedAudioInput } } : true;
    navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
        .then(stream => {
            localStream = stream;
            peerConnection.addTrack(localStream.getAudioTracks()[0], localStream);
            console.log('Got stream with constraints:', audioConstraints);
        })
        .catch(error => console.error('Error accessing media devices:', error));
}

// Функция отправки сообщения только если WebSocket соединение открыто
function sendMessage(message) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
    } else {
        console.error("WebSocket is not open. Cannot send message.");
    }
}

// WebSocket инициализация и соединение
function connectWebSocket() {
    socket = new WebSocket('ws://127.0.0.1:8080/ws/voice_channel/1'); // URL WebSocket сервера

    socket.onopen = () => {
        console.log("Connected to WebSocket server");
        connectionStatus.innerText = 'Connected'; // Обновляем статус
        initializeWebRTC();
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);

        // Обработка сообщения offer
        if (message.type === 'offer') {
            if (peerConnection.signalingState === 'stable') {
                peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp))
                    .then(() => peerConnection.createAnswer())
                    .then((answer) => peerConnection.setLocalDescription(answer))
                    .then(() => sendMessage(JSON.stringify({ type: 'answer', sdp: peerConnection.localDescription })))
                    .then(() => {
                        iceCandidateQueue.forEach(candidate => {
                            peerConnection.addIceCandidate(candidate)
                                .catch(error => console.error("Error adding queued ICE candidate:", error));
                        });
                        iceCandidateQueue = []; // Очищаем очередь
                    })
                    .catch(error => console.error("Error during answer creation:", error));
            } else {
                console.warn("Cannot set offer, invalid signaling state:", peerConnection.signalingState);
            }
        }

        // Обработка сообщения answer
        if (message.type === 'answer') {
            if (peerConnection.signalingState === 'have-local-offer') {
                peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp))
                    .catch(error => console.error("Error setting remote description for answer:", error));
            } else {
                console.warn("Cannot set answer, invalid signaling state:", peerConnection.signalingState);
            }
        }

        // Обработка ICE кандидатов
        if (message.type === 'ice') {
            if (peerConnection.remoteDescription) {
                peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate))
                    .catch(error => console.error("Error adding received ICE candidate:", error));
            } else {
                iceCandidateQueue.push(new RTCIceCandidate(message.candidate));
            }
        }

        // Обработка события подключения нового участника
        if (message.type === 'participant_list') {
            updateParticipantList(message.participants);
        }
    };

    socket.onclose = () => {
        console.log("WebSocket connection closed");
        connectionStatus.innerText = 'Disconnected'; // Обновляем статус

        setTimeout(() => {
            console.log("Attempting to reconnect...");
            connectWebSocket(); // Повторное подключение
        }, 3000);
    };

    socket.onerror = (error) => {
        console.error("WebSocket Error:", error);
    };
}

// Инициализация WebRTC
function initializeWebRTC() {
    peerConnection = new RTCPeerConnection();

    // Обработка ICE кандидатов
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendMessage(JSON.stringify({ type: 'ice', candidate: event.candidate }));
        }
    };

    // Обработка входящих аудиопотоков от других участников
    peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        console.log("Received remote stream:", remoteStream);

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

// Управление микрофоном
muteButton.addEventListener('click', () => {
    if (localStream) {
        localStream.getTracks().forEach(track => {
            if (track.kind === 'audio') {
                track.enabled = false;
            }
        });
        micStatus.innerText = 'Muted'; // Обновляем статус микрофона
    } else {
        console.error("No local stream found to mute.");
    }
});

unmuteButton.addEventListener('click', () => {
    if (localStream) {
        localStream.getTracks().forEach(track => {
            if (track.kind === 'audio') {
                track.enabled = true;
            }
        });
        micStatus.innerText = 'Not muted'; // Обновляем статус микрофона
    } else {
        console.error("No local stream found to unmute.");
    }
});

// Подключение к голосовому каналу
connectButton.addEventListener('click', () => {
    connectWebSocket();
});

// Отключение от голосового канала
disconnectButton.addEventListener('click', () => {
    if (peerConnection) {
        peerConnection.close();
    }
    if (socket) {
        socket.close();
    }
    console.log("Disconnected from voice channel");
    connectionStatus.innerText = 'Disconnected'; // Обновляем статус
});

// Функция для обновления списка участников
function updateParticipantList(participants) {
    participantList.innerHTML = ''; // Очищаем список
    participants.forEach(participant => {
        const li = document.createElement('li');
        li.innerText = participant;
        participantList.appendChild(li);
    });
}
