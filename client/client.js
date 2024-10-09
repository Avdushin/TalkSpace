let socket;
let peerConnection;
let localStream;
let iceCandidateQueue = [];  // Очередь для ICE кандидатов, которые нужно добавить после установки remoteDescription
let isWebSocketReady = false;

const connectButton = document.getElementById('connect');
const disconnectButton = document.getElementById('disconnect');
const muteButton = document.getElementById('mute');
const unmuteButton = document.getElementById('unmute');
const connectionStatus = document.getElementById('connection-status');
const micStatus = document.getElementById('mic-status');
const participantList = document.getElementById('participant-list');

// WebSocket инициализация и соединение
function connectWebSocket() {
    socket = new WebSocket('ws://localhost:8080/ws/voice_channel/1');  // URL WebSocket сервера

    socket.onopen = () => {
        console.log("Connected to WebSocket server");
        connectionStatus.innerText = 'Connected';  // Обновляем статус
        isWebSocketReady = true;
        initializeWebRTC();  // Инициализируем WebRTC только после установления WebSocket соединения

        // Если есть кандидаты в очереди, отправляем их
        iceCandidateQueue.forEach(candidate => {
            socket.send(JSON.stringify({ type: 'ice', candidate }));
        });
        iceCandidateQueue = [];  // Очищаем очередь
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
    
        // Обработка сообщения offer
        if (message.type === 'offer') {
            if (peerConnection.signalingState === 'stable') {
                peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp))
                .then(() => peerConnection.createAnswer())
                .then((answer) => peerConnection.setLocalDescription(answer))
                .then(() => {
                    socket.send(JSON.stringify({ type: 'answer', sdp: peerConnection.localDescription }));
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
                // Если remoteDescription еще не установлено, сохраняем ICE кандидаты в очередь
                iceCandidateQueue.push(new RTCIceCandidate(message.candidate));
            }
        }

        // Обработка события подключения нового участника
        if (message.type === 'participant') {
            addParticipantToList(message.name);  // Добавляем участника в список
        }
    };

    socket.onclose = () => {
        console.log("WebSocket connection closed");
        connectionStatus.innerText = 'Disconnected';  // Обновляем статус
        isWebSocketReady = false;
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
            if (isWebSocketReady) {
                socket.send(JSON.stringify({ type: 'ice', candidate: event.candidate }));
            } else {
                // Если WebSocket ещё не готов, сохраняем ICE кандидаты в очередь
                iceCandidateQueue.push(event.candidate);
            }
        }
    };

    // Обработка входящих аудиопотоков от других участников
    peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        console.log("Received remote stream:", remoteStream);

        // Создаём элемент audio для воспроизведения звука
        const audioElement = document.createElement('audio');
        audioElement.srcObject = remoteStream;
        audioElement.autoplay = true;
        document.body.appendChild(audioElement);  // Добавляем элемент на страницу
    };

    // Получение аудио потока
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            localStream = stream;
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

            // Создание предложения только если соединение в состоянии 'stable'
            if (peerConnection.signalingState === 'stable') {
                peerConnection.createOffer().then((offer) => {
                    peerConnection.setLocalDescription(offer);
                    if (isWebSocketReady) {
                        socket.send(JSON.stringify({ type: 'offer', sdp: offer }));
                    }
                });
            }
        })
        .catch(error => console.error('Error accessing microphone:', error));
}

// Управление микрофоном
muteButton.addEventListener('click', () => {
    if (localStream) {
        localStream.getTracks().forEach(track => {
            if (track.kind === 'audio') {
                track.enabled = false;
            }
        });
        micStatus.innerText = 'Muted';  // Обновляем статус микрофона
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
        micStatus.innerText = 'Not muted';  // Обновляем статус микрофона
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
    connectionStatus.innerText = 'Disconnected';  // Обновляем статус
});

// Функция для добавления участника в список
function addParticipantToList(name) {
    const li = document.createElement('li');
    li.innerText = name;
    participantList.appendChild(li);
}
