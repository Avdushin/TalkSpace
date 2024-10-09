use serde::Deserialize;

#[derive(Deserialize)]
pub struct CreateVoiceChannel {
    pub name: String,
}

#[derive(Deserialize)]
pub struct JoinVoiceChannel {
    pub channel_id: i32,
    pub user_id: i32,
}
