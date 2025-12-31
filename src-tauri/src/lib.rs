mod indexer;
mod search;
mod types;
use std::error::Error;

use crate::types::{DirectoryConfigCmd, SearchFiltersCmd, SearchResponsePayload};
use tauri::menu::{AboutMetadataBuilder, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Manager;
use rust_i18n::t;


// 初始化 i18n
rust_i18n::i18n!("locales", fallback = "zh-CN");

/// 搜索索引: 基于已有索引返回匹配文档
#[tauri::command]
fn search_index(
    app: tauri::AppHandle,
    query: String,
    limit: Option<usize>,
    offset: Option<usize>,
    filters: Option<SearchFiltersCmd>,
) -> Result<SearchResponsePayload, String> {
    crate::search::do_search_index(app, query, limit, offset, filters)
}

/// 重建索引: 前端调用该命令触发索引重建
#[tauri::command]
fn rebuild_index(
    app: tauri::AppHandle,
    directories: Vec<DirectoryConfigCmd>,
) -> Result<(), String> {
    crate::indexer::do_rebuild_index(app, directories)
}

#[tauri::command]
fn update_menu(app: tauri::AppHandle, lang: String) -> Result<(), String> {
    rust_i18n::set_locale(&lang);
    let menu = create_menu(&app).map_err(|e| e.to_string())?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}

fn create_menu<R: tauri::Runtime>(
    app: &impl tauri::Manager<R>,
) -> Result<Menu<R>, Box<dyn Error>> {
    let about = PredefinedMenuItem::about(
        app,
        Some(&t!("menu.app.about").to_string()),
        Some(
            AboutMetadataBuilder::new()
                .version(Some("1.0.0"))
                .authors(Some(vec!["吉森".to_string()]))
                .license(Some("MIT"))
                .website(Some("http://gsein.cn"))
                .build(),
        ),
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let services = PredefinedMenuItem::services(app, Some(&t!("menu.app.services").to_string()))?;
    let hide = PredefinedMenuItem::hide(app, Some(&t!("menu.app.hide").to_string()))?;
    let hide_others = PredefinedMenuItem::hide_others(app, Some(&t!("menu.app.hide_others").to_string()))?;
    let show_all = PredefinedMenuItem::show_all(app, Some(&t!("menu.app.show_all").to_string()))?;
    let quit = PredefinedMenuItem::quit(app, Some(&t!("menu.app.quit").to_string()))?;
    let app_menu = Submenu::with_items(
        app,
        t!("menu.app.name").to_string(),
        true,
        &[
            &about,
            &separator,
            &services,
            &separator,
            &hide,
            &hide_others,
            &show_all,
            &separator,
            &quit,
        ],
    )?;

    // ========================
    // 2. 文件菜单
    // ========================
    let open_item = MenuItem::with_id(app, "open", &t!("menu.file.open").to_string(), true, Some("Cmd+O"))?;
    let close_window_item = PredefinedMenuItem::close_window(app, Some(&t!("menu.file.close_window").to_string()))?;

    let file_menu = Submenu::with_items(
        app,
        t!("menu.file.name").to_string(),
        true,
        &[
            &open_item,
            &separator,
            &close_window_item,
        ],
    )?;

    // ========================
    // 3. 顶层菜单
    // ========================
    let menu = Menu::with_items(app, &[&app_menu, &file_menu])?;
    Ok(menu)
}

fn setup(app: &mut tauri::App) -> Result<(), Box<dyn Error>> {
    let mut lang = "zh-CN".to_string();
    if let Ok(config_dir) = app.path().app_config_dir() {
        let settings_path = config_dir.join("settings.json");
        if let Ok(content) = std::fs::read_to_string(settings_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(l) = json
                    .get("ui")
                    .and_then(|ui| ui.get("language"))
                    .and_then(|v| v.as_str())
                {
                    lang = l.to_string();
                }
            }
        }
    }

    rust_i18n::set_locale(&lang);
    let menu = create_menu(app)?;
    app.set_menu(menu)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            rebuild_index,
            search_index,
            update_menu
        ])
        .setup(setup)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
