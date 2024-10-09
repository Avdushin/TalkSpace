use actix_web::{dev::ServiceRequest, Error};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use actix_web_httpauth::extractors::AuthenticationError;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::{Serialize, Deserialize};
use std::env;

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
}

#[allow(unused)]
pub async fn jwt_middleware(
    req: ServiceRequest,
    credentials: BearerAuth,
) -> Result<ServiceRequest, Error> {
    let token = credentials.token();
    
    let secret_key = env::var("JWT_SECRET_KEY").expect("JWT_SECRET_KEY must be set");

    let decoding_key = DecodingKey::from_secret(secret_key.as_ref());

    let config = actix_web_httpauth::extractors::bearer::Config::default();
    match decode::<Claims>(&token, &decoding_key, &Validation::new(Algorithm::HS256)) {
        Ok(_) => Ok(req),
        Err(_) => Err(AuthenticationError::from(config).into()),
    }
}
