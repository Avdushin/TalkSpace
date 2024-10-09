use sqlx::{PgPool, postgres::PgPoolOptions};
use crate::config::get_database_url;

pub async fn init_db() -> PgPool {
    let database_url = get_database_url();

    let pool = PgPoolOptions::new()
        .connect(&database_url)
        .await
        .expect("Failed to create pool.");

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    pool
}
