mod indexer;
mod search;
mod types;
use std::error::Error;

use crate::types::{DirectoryConfigCmd, SearchFiltersCmd, SearchResponsePayload};
use tauri::menu::{ AboutMetadataBuilder, Menu, MenuItem, PredefinedMenuItem, Submenu};

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

fn setup(app: &mut tauri::App) -> Result<(), Box<dyn Error>> {
    // ========================
    // 1. App 菜单（macOS 必须）
    // ========================
    let about = PredefinedMenuItem::about(
        app,
        None,
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
    let services = PredefinedMenuItem::services(app, None)?;
    let hide = PredefinedMenuItem::hide(app, None)?;
    let hide_others = PredefinedMenuItem::hide_others(app, None)?;
    let show_all = PredefinedMenuItem::show_all(app, None)?;
    let quit = PredefinedMenuItem::quit(app, None)?;
    let app_menu = Submenu::with_items(
        app,
        "My App",
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
    let open_item = MenuItem::with_id(app, "open", "打开", true, Some("Cmd+O"))?;
    let close_window_item = PredefinedMenuItem::close_window(app, None)?;   

    let file_menu = Submenu::with_items(
        app,
        "文件",
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
    let menu = Menu::with_items(
        app,
        &[
            &app_menu,
            &file_menu,
        ],
    )?;

    // 安装到应用（关键一步）
    app.set_menu(menu)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![rebuild_index, search_index])
        .setup(setup)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
