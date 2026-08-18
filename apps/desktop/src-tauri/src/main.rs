// Keeps a console window from opening alongside the app on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::{TcpListener, TcpStream};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::path::BaseDirectory;
use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// How long a sidecar that never starts listening is waited for.
const STARTUP_TIMEOUT: Duration = Duration::from_secs(30);

/// The local API server, held so it can be stopped when the app exits.
struct Sidecar(Mutex<Option<CommandChild>>);

/// Ask the OS for a port nobody is using, then let it go again.
///
/// The server defaults to 3000, which is the port it takes in development and
/// about the most likely one to be occupied on a machine that develops
/// anything at all. There is a gap between letting the port go and the sidecar
/// binding it, but nothing else on a single-user desktop is racing for it.
fn free_port() -> std::io::Result<u16> {
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let port = listener.local_addr()?.port();
    Ok(port)
}

/// The origin the WebView puts on its requests.
///
/// The app is served from Tauri's own scheme rather than from the dev server,
/// so the origin the server allows by default does not apply here.
fn webview_origin() -> &'static str {
    if cfg!(windows) {
        "http://tauri.localhost"
    } else {
        "tauri://localhost"
    }
}

/// Blocks until the sidecar accepts connections, or the timeout passes.
///
/// The window is only created afterwards, so the app's first request cannot
/// arrive before the server is listening. In practice this returns in well
/// under a second; the timeout only bounds how long a broken sidecar is
/// waited for.
fn wait_until_listening(port: u16, timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    false
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let port = free_port()?;
            let server = app.path().resolve("index.js", BaseDirectory::Resource)?;

            // Said plainly rather than left to the spawn: a resource that did
            // not make it into the bundle is a packaging mistake, and the path
            // that was looked for is the only useful thing to report.
            if !server.exists() {
                let missing = server.display();
                return Err(format!("the server bundle is missing: {missing}").into());
            }

            let (mut rx, child) = app
                .shell()
                .sidecar("bun")?
                .args([server.to_string_lossy().to_string()])
                .env("PORT", port.to_string())
                .env("CORS_ORIGIN", webview_origin())
                .spawn()?;

            // The sidecar's output goes to the terminal rather than nowhere:
            // when a packaged build misbehaves, the server's own error is the
            // only thing that says why. Draining also keeps its stdout pipe
            // from filling up and stalling the process.
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) | CommandEvent::Stderr(line) => {
                            let text = String::from_utf8_lossy(&line);
                            println!("[server] {}", text.trim_end());
                        }
                        CommandEvent::Error(message) => {
                            eprintln!("[server] {message}");
                        }
                        CommandEvent::Terminated(payload) => {
                            eprintln!("[server] exited with {:?}", payload.code);
                            break;
                        }
                        _ => {}
                    }
                }
            });

            app.manage(Sidecar(Mutex::new(Some(child))));

            if !wait_until_listening(port, STARTUP_TIMEOUT) {
                return Err("the local server did not start listening".into());
            }

            // The port is only known here, long after the web app was built,
            // so it is handed over as the page loads instead of being baked
            // into the bundle. Reading it is the app's one concession to
            // running inside Tauri; without it the browser build is unchanged.
            WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("nai-desktop-studio")
                .inner_size(1440.0, 960.0)
                .min_inner_size(960.0, 640.0)
                .initialization_script(format!(
                    "window.__NAI_SERVER_URL__ = \"http://localhost:{port}\";"
                ))
                .build()?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to start nai-desktop-studio")
        .run(|app, event| {
            // The sidecar is a separate process and closing the window does
            // not take it with it. Left alone it keeps running and keeps its
            // port, with no window left to stop it from.
            if matches!(event, RunEvent::Exit) {
                if let Some(sidecar) = app.try_state::<Sidecar>() {
                    if let Ok(mut held) = sidecar.0.lock() {
                        if let Some(child) = held.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}
