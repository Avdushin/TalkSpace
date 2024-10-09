mod config;
mod db;
mod handlers;
mod models;
mod middleware;
mod routes;

use actix_web::{App, HttpServer, web};
use db::init_db;
use dotenv::dotenv;
use std::env;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    let pool = init_db().await;

    let server_address = env::var("SERVER_ADDRESS").expect("SERVER_ADDRESS must be set");
    let server_port = env::var("SERVER_PORT").expect("SERVER_PORT must be set");

    let bind_address = format!("{}:{}", server_address, server_port);

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .configure(routes::configure_routes)
    })
    .bind(bind_address)?
    .run()
    .await
}
