mod indexer;
mod search;
mod types;
use crate::types::{SearchResultPayload, DirectoryConfigCmd};

/// 搜索索引: 基于已有索引返回匹配文档
#[tauri::command]
fn search_index(
    app: tauri::AppHandle,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<SearchResultPayload>, String> {
    crate::search::do_search_index(app, query, limit)
}

/// 重建索引: 前端调用该命令触发索引重建
#[tauri::command]
fn rebuild_index(
    app: tauri::AppHandle,
    directories: Vec<DirectoryConfigCmd>,
) -> Result<(), String> {
    crate::indexer::do_rebuild_index(app, directories)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![rebuild_index, search_index])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
