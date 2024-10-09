use sqlx::{PgPool, postgres::PgPoolOptions};
use crate::config::get_database_url;

pub async fn init_db() -> PgPool {
    let database_url = get_database_url();

    // Подключение к базе данных
    let pool = PgPoolOptions::new()
        .connect(&database_url)
        .await
        .expect("Failed to create pool.");

    // Выполним миграции (создание таблиц, если их нет)
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    pool
}
