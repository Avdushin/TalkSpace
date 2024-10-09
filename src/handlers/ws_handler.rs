use actix::prelude::*;
use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_web_actors::ws;

pub async fn ws_connect(
    req: HttpRequest,
    stream: web::Payload,
    path: web::Path<(i32,)>,
) -> Result<HttpResponse, Error> {
    let channel_id = path.into_inner().0;
    let ws_session = WsSession { channel_id };
    ws::start(ws_session, &req, stream)
}

struct WsSession {
    channel_id: i32,
}

impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        println!("User joined voice channel {}", self.channel_id);
    }

    fn stopped(&mut self, ctx: &mut Self::Context) {
        println!("User left voice channel {}", self.channel_id);
    }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Text(text)) => {
                // Здесь будет логика для обработки сигналов WebRTC (например, SDP, ICE-кандидаты)
                println!("Received WebRTC signal: {}", text);
                ctx.text(text);  // Эхо-сообщение (только для тестирования)
            }
            Ok(ws::Message::Binary(bin)) => ctx.binary(bin),
            _ => (),
        }
    }
}
