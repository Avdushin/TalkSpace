# Документация для проверки запросов:

## Auth
### Registration
```bash
curl -X POST http://127.0.0.1:8080/register \
-H "Content-Type: application/json" \
-d '{"username": "testuser", "password": "123"}'
```

### Login
```bash
curl -X POST http://127.0.0.1:8080/login \
-H "Content-Type: application/json" \
-d '{"username": "testuser", "password": "123"}'
```

## Voice Channels

### Create Voice Channel
```bash
curl -X POST http://127.0.0.1:8080/voice_channel/create \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <your_jwt_token>" \
-d '{"name": "General"}'
```

### Join Voice Channel
```bash
curl -X POST http://127.0.0.1:8080/voice_channel/join \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <your_jwt_token>" \
-d '{"channel_id": 1, "user_id": 1}'
```

### Leave Voice Channel
```bash
curl -X POST http://127.0.0.1:8080/voice_channel/leave \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <your_jwt_token>" \
-d '{"channel_id": 1, "user_id": 1}'
```
