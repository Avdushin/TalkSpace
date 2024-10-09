CREATE TABLE IF NOT EXISTS voice_channel_members (
    id SERIAL PRIMARY KEY,
    channel_id INT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (channel_id) REFERENCES voice_channels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
