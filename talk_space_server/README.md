# TalkSpace
It's an a Discord alternative made with Rust

## How to start

### Server
You need to install SQLX-CLI:
```bash
cargo install sqlx-cli --no-default-features --features postgres
```
Migrate tables and run the server
```bash
sqlx migrate run
cargo run
```

## API TEST QUERRYES
[API QUERRYES LIST](./test_querryes.md)