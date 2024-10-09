use actix::prelude::*;
use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_web_actors::ws;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

type SharedState = Arc<Mutex<HashMap<i32, Vec<Addr<WsSession>>>>>;

pub async fn ws_connect(
    req: HttpRequest,
    stream: web::Payload,
    path: web::Path<(i32,)>,
    data: web::Data<SharedState>,  // Правильная передача SharedState
) -> Result<HttpResponse, Error> {
    println!("Incoming WebSocket connection for channel: {}", path.0);
    let channel_id = path.into_inner().0;
    let ws_session = WsSession {
        channel_id,
        state: data.get_ref().clone(),  // Клонирование shared state
    };
    
    match ws::start(ws_session, &req, stream) {
        Ok(response) => {
            println!("WebSocket connection established for channel: {}", channel_id);
            Ok(response)
        }
        Err(err) => {
            eprintln!("Error during WebSocket handshake: {:?}", err);
            Err(err)
        }
    }
}

// Делаем структуру публичной
pub struct WsSession {
    channel_id: i32,
    state: SharedState,
}

impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        println!("User joined voice channel {}", self.channel_id);
        let addr = ctx.address();
        let mut state = self.state.lock().unwrap();
        state.entry(self.channel_id).or_insert_with(Vec::new).push(addr.clone());
    }

    fn stopped(&mut self, ctx: &mut Self::Context) {
        println!("User left voice channel {}", self.channel_id);
        let mut state = self.state.lock().unwrap();
        if let Some(sessions) = state.get_mut(&self.channel_id) {
            sessions.retain(|addr| addr != &ctx.address());
            if sessions.is_empty() {
                state.remove(&self.channel_id);
            }
        }
    }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Text(text)) => {
                // Преобразуем ByteString в String
                let text_message = text.to_string();
                
                println!("Received message: {}", text_message); // Логируем сообщение

                // Пересылаем сообщение всем участникам канала, кроме отправителя
                let state = self.state.lock().unwrap();
                if let Some(sessions) = state.get(&self.channel_id) {
                    for session in sessions {
                        if session != &ctx.address() {
                            session.do_send(Message(text_message.clone()));  // Пересылаем сообщение другим
                        }
                    }
                }
            }
            Ok(ws::Message::Binary(bin)) => ctx.binary(bin),
            _ => (),
        }
    }
}

// impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsSession {
//     fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
//         match msg {
//             Ok(ws::Message::Text(text)) => {
//                 // Преобразуем ByteString в String
//                 let text_message = text.to_string();

//                 // Пересылаем сообщение всем участникам канала, кроме отправителя
//                 let state = self.state.lock().unwrap();
//                 if let Some(sessions) = state.get(&self.channel_id) {
//                     for session in sessions {
//                         if session != &ctx.address() {
//                             session.do_send(Message(text_message.clone()));  // Теперь передаем String
//                         }
//                     }
//                 }
//             }
//             Ok(ws::Message::Binary(bin)) => ctx.binary(bin),
//             _ => (),
//         }
//     }
// }

#[derive(Message)]
#[rtype(result = "()")]
struct Message(String);

impl Handler<Message> for WsSession {
    type Result = ();

    fn handle(&mut self, msg: Message, ctx: &mut Self::Context) {
        ctx.text(msg.0);
    }
}
