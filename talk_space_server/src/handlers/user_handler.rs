use actix_web::{web, HttpResponse, Responder};
use sqlx::PgPool;
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, Header, EncodingKey};
use serde::{Serialize, Deserialize};
use std::env;  // Для чтения переменных окружения

use crate::models::user::{RegisterUser, LoginUser};

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
}

pub async fn register_user(
    data: web::Json<RegisterUser>,
    pool: web::Data<PgPool>,
) -> impl Responder {
    let hashed_password = hash(&data.password, DEFAULT_COST).unwrap();

    let result = sqlx::query(
        "INSERT INTO users (username, password) VALUES ($1, $2)"
    )
    .bind(&data.username)
    .bind(&hashed_password)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Ok().body("User registered"),
        Err(_) => HttpResponse::InternalServerError().body("Error registering user"),
    }
}

pub async fn login_user(
    data: web::Json<LoginUser>,
    pool: web::Data<PgPool>,
) -> impl Responder {
    let secret_key = env::var("JWT_SECRET_KEY").expect("JWT_SECRET_KEY must be set");

    let user = sqlx::query!(
        "SELECT * FROM users WHERE username = $1",
        data.username
    )
    .fetch_one(pool.get_ref())
    .await;

    match user {
        Ok(user) => {
            if verify(&data.password, &user.password).unwrap() {
                // Создаем JWT-токен
                let claims = Claims {
                    sub: data.username.to_owned(),
                    exp: 10000000000,
                };

                let token = encode(
                    &Header::default(),
                    &claims,
                    &EncodingKey::from_secret(secret_key.as_ref()),
                ).unwrap();

                HttpResponse::Ok().body(token)
            } else {
                HttpResponse::Unauthorized().body("Invalid password")
            }
        },
        Err(_) => HttpResponse::Unauthorized().body("User not found"),
    }
}
