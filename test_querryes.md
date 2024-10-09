
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