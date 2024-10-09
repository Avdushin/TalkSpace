use actix_web::{web, HttpResponse, Responder};
use sqlx::PgPool;

use crate::models::voice_channel::{CreateVoiceChannel, JoinVoiceChannel};

pub async fn create_voice_channel(
    data: web::Json<CreateVoiceChannel>,
    pool: web::Data<PgPool>,
) -> impl Responder {
    let result = sqlx::query!(
        "INSERT INTO voice_channels (name) VALUES ($1)",
        data.name
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Ok().body("Voice channel created"),
        Err(_) => HttpResponse::InternalServerError().body("Error creating voice channel"),
    }
}

pub async fn join_voice_channel(
    data: web::Json<JoinVoiceChannel>,
    pool: web::Data<PgPool>,
) -> impl Responder {
    let result = sqlx::query!(
        "INSERT INTO voice_channel_members (channel_id, user_id) VALUES ($1, $2)",
        data.channel_id,
        data.user_id
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Ok().body("User joined voice channel"),
        Err(_) => HttpResponse::InternalServerError().body("Error joining voice channel"),
    }
}

pub async fn leave_voice_channel(
    data: web::Json<JoinVoiceChannel>,
    pool: web::Data<PgPool>,
) -> impl Responder {
    let result = sqlx::query!(
        "DELETE FROM voice_channel_members WHERE channel_id = $1 AND user_id = $2",
        data.channel_id,
        data.user_id
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => HttpResponse::Ok().body("User left voice channel"),
        Err(_) => HttpResponse::InternalServerError().body("Error leaving voice channel"),
    }
}
