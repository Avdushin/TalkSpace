use actix_web::web;
use crate::handlers::user_handler::{register_user, login_user};
use crate::handlers::voice_channel_handler::{create_voice_channel, join_voice_channel, leave_voice_channel};

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg
        .route("/register", web::post().to(register_user))
        .route("/login", web::post().to(login_user))
        .route("/voice_channel/create", web::post().to(create_voice_channel))
        .route("/voice_channel/join", web::post().to(join_voice_channel))
        .route("/voice_channel/leave", web::post().to(leave_voice_channel));
}
