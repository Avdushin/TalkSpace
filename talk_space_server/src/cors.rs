use actix_cors::Cors;

pub fn configure_cors() -> Cors {
    Cors::default()
        .allowed_origin("http://localhost:8080")
        .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
        .allowed_headers(vec!["Content-Type", "Authorization"])
        .supports_credentials()
}
