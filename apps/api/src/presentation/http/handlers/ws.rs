use axum::{extract::{ws::{Message, WebSocketUpgrade}, State}, response::IntoResponse};
use crate::presentation::http::state::AppState;
use futures_util::{SinkExt, StreamExt};

pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(|socket| async move {
        let (mut sender, _) = socket.split();
        let mut rx = state.ws_broadcaster.subscribe();
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg.into())).await.is_err() { break; }
        }
    })
}