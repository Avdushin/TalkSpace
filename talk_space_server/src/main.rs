mod config;
mod db;
mod handlers;
mod models;
mod middleware;
mod routes;
mod cors;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use actix::Addr;
use actix_web::{App, HttpServer, web};
use db::init_db;
use dotenv::dotenv;
use std::env;
use handlers::ws_handler::WsSession;
use cors::configure_cors;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    let pool = init_db().await;

    let server_address = env::var("SERVER_ADDRESS").expect("SERVER_ADDRESS must be set");
    let server_port = env::var("SERVER_PORT").expect("SERVER_PORT must be set");

    let bind_address = format!("{}:{}", server_address, server_port);

    let shared_state = Arc::new(Mutex::new(HashMap::<i32, Vec<Addr<WsSession>>>::new()));

    HttpServer::new(move || {
        App::new()
            .wrap(configure_cors())  // Используем настройки CORS из модуля
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(shared_state.clone()))
            .configure(routes::configure_routes)
    })
    .bind(bind_address)?
    .run()
    .await
}
