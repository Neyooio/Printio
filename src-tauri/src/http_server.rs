use axum::{
    extract::{ConnectInfo, State},
    http::{header, Request, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Redirect, Response},
    routing::get,
    Router,
};
use std::net::SocketAddr;
use std::path::PathBuf;
use tower_http::cors::{Any, CorsLayer};

use crate::upload;

/// Shared application state for the HTTP server.
/// This is the single state type used by all route handlers.
#[derive(Clone)]
pub struct AppState {
    pub upload_state: upload::UploadState,
    pub portal_dir: PathBuf,
    pub gateway_ip: String,
}

/// Start the captive portal HTTP server on port 80.
pub async fn start_http_server(
    state: AppState,
    mut shutdown: tokio::sync::watch::Receiver<bool>,
) -> anyhow::Result<()> {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
        .expose_headers(Any);

    // Upload routes use UploadState — nest them with state extraction
    let upload_routes = upload::upload_router()
        .with_state(state.upload_state.clone());

    // Build combined router: captive portal probes + static portal + upload API
    let app = Router::new()
        // ─── Captive Portal Probe Endpoints ───
        .route("/generate_204", get(handle_android_probe))
        .route("/gen_204", get(handle_android_probe))
        .route("/hotspot-detect.html", get(handle_ios_probe))
        .route("/library/test/success.html", get(handle_ios_probe))
        .route("/ncsi.txt", get(handle_windows_probe))
        .route("/connecttest.txt", get(handle_windows_probe))
        .route("/redirect", get(handle_windows_redirect))
        .route("/success.txt", get(handle_firefox_probe))
        // ─── Portal Static Files ───
        .route("/", get(handle_portal_index))
        .route("/style.css", get(handle_portal_css))
        .route("/upload.js", get(handle_portal_js))
        .route("/logo.png", get(handle_portal_logo_png))
        .route("/logo.svg", get(handle_portal_logo_svg))
        // ─── Upload API (pre-built with UploadState) ───
        .merge(upload_routes)
        // ─── Catch-all: redirect unknown paths to portal ───
        .fallback(get(handle_fallback))
        // ─── Middleware ───
        .layer(middleware::from_fn(inject_client_ip))
        .layer(cors)
        .with_state(state.clone());

    let addr = SocketAddr::from(([0, 0, 0, 0], 80));
    let listener = tokio::net::TcpListener::bind(addr).await.map_err(|e| {
        log::error!(
            "Failed to bind TCP :80 — ensure no other service is using port 80. Error: {}",
            e
        );
        e
    })?;

    log::info!("HTTP captive portal server listening on {}", addr);

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(async move {
        let _ = shutdown.changed().await;
        log::info!("HTTP server shutting down");
    })
    .await?;

    Ok(())
}

// ───────────────── Client IP Injection Middleware ─────────────────

/// Middleware that injects the real client IP into the X-Real-IP header
/// so upload handlers can identify session ownership.
async fn inject_client_ip(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    mut request: Request<axum::body::Body>,
    next: Next,
) -> Response {
    request
        .headers_mut()
        .insert("x-real-ip", addr.ip().to_string().parse().unwrap());
    next.run(request).await
}

// ───────────────── Captive Portal Probe Handlers ─────────────────

/// Android: expects 204, getting 302 triggers captive portal UI.
async fn handle_android_probe(State(state): State<AppState>) -> impl IntoResponse {
    Redirect::temporary(&format!("http://{}/", state.gateway_ip))
}

/// iOS/macOS: expects "Success" body, redirect triggers portal sheet.
async fn handle_ios_probe(State(state): State<AppState>) -> impl IntoResponse {
    Redirect::temporary(&format!("http://{}/", state.gateway_ip))
}

/// Windows NCSI: expects "Microsoft NCSI", redirect triggers portal.
async fn handle_windows_probe(State(state): State<AppState>) -> impl IntoResponse {
    Redirect::temporary(&format!("http://{}/", state.gateway_ip))
}

/// Windows 11 redirect endpoint.
async fn handle_windows_redirect(State(state): State<AppState>) -> impl IntoResponse {
    Redirect::temporary(&format!("http://{}/", state.gateway_ip))
}

/// Firefox: expects "success\n", redirect triggers portal.
async fn handle_firefox_probe(State(state): State<AppState>) -> impl IntoResponse {
    Redirect::temporary(&format!("http://{}/", state.gateway_ip))
}

// ───────────────── Portal Static File Handlers ─────────────────

async fn handle_portal_index(State(state): State<AppState>) -> impl IntoResponse {
    serve_portal_file(&state.portal_dir, "index.html", "text/html").await
}

async fn handle_portal_css(State(state): State<AppState>) -> impl IntoResponse {
    serve_portal_file(&state.portal_dir, "style.css", "text/css").await
}

async fn handle_portal_js(State(state): State<AppState>) -> impl IntoResponse {
    serve_portal_file(&state.portal_dir, "upload.js", "application/javascript").await
}

async fn handle_portal_logo_png(State(state): State<AppState>) -> impl IntoResponse {
    serve_portal_file(&state.portal_dir, "logo.png", "image/png").await
}

async fn handle_portal_logo_svg(State(state): State<AppState>) -> impl IntoResponse {
    serve_portal_file(&state.portal_dir, "logo.svg", "image/svg+xml").await
}

/// Serve a static file from the portal directory.
async fn serve_portal_file(
    portal_dir: &PathBuf,
    filename: &str,
    content_type: &str,
) -> Response {
    let path = portal_dir.join(filename);

    match tokio::fs::read(&path).await {
        Ok(contents) => (
            StatusCode::OK,
            [(header::CONTENT_TYPE, content_type)],
            contents,
        )
            .into_response(),
        Err(e) => {
            log::error!("Failed to read portal file {}: {}", path.display(), e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Portal file not found").into_response()
        }
    }
}

/// Catch-all: redirect any unknown path to the portal root.
async fn handle_fallback(State(state): State<AppState>) -> impl IntoResponse {
    Redirect::temporary(&format!("http://{}/", state.gateway_ip))
}
