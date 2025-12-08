use serde::Deserialize;
use tantivy::TantivyDocument;
use tantivy::schema::{Value, TextOptions, TextFieldIndexing, IndexRecordOption};
use tantivy::tokenizer::{NgramTokenizer, TextAnalyzer, LowerCaser};
use tantivy::{collector::TopDocs, query::QueryParser};
use std::fs;
use std::path::PathBuf;
use std::thread;
use tauri::Manager;
use tauri::Emitter;

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DirectoryConfigCmd {
    path: String,
    enabled: bool,
    recursive: bool,
    #[allow(dead_code)]
    last_indexed: i64,
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct IndexProgressPayload {
    is_indexing: bool,
    progress: u32,
    total_files: usize,
    indexed_files: usize,
    index_size: u64,
    last_updated: i64,
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SearchResultPayload {
    id: String,
    title: String,
    content: String,
    file_path: String,
    file_type: String,
    modified_time: i64,
    score: f32,
    highlights: Vec<String>,
}

fn byte_to_char_idx(s: &str, byte_idx: usize) -> usize {
    s[..byte_idx].chars().count()
}

fn char_to_byte_idx(s: &str, char_idx: usize) -> usize {
    let mut count = 0usize;
    for (b_idx, _) in s.char_indices() {
        if count == char_idx { return b_idx; }
        count += 1;
    }
    s.len()
}

fn snippet_with_highlight(text: &str, query: &str, pre_chars: usize, post_chars: usize) -> String {
    if text.is_empty() || query.is_empty() { return String::new(); }
    let t_low = text.to_lowercase();
    let q_low = query.to_lowercase();
    if let Some(pos_b) = t_low.find(&q_low) {
        let pos_c = byte_to_char_idx(text, pos_b);
        let q_len_c = query.chars().count();
        let total_c = text.chars().count();
        let start_c = pos_c.saturating_sub(pre_chars);
        let end_c = usize::min(total_c, pos_c + q_len_c + post_chars);
        let start_b = char_to_byte_idx(text, start_c);
        let match_start_b = char_to_byte_idx(text, pos_c);
        let match_end_b = char_to_byte_idx(text, pos_c + q_len_c);
        let end_b = char_to_byte_idx(text, end_c);
        let mut out = String::new();
        out.push_str(&text[start_b..match_start_b]);
        out.push_str("<mark>");
        out.push_str(&text[match_start_b..match_end_b]);
        out.push_str("</mark>");
        out.push_str(&text[match_end_b..end_b]);
        return out;
    }
    // 未命中时返回开头片段
    let take_c = usize::min(text.chars().count(), pre_chars + post_chars);
    let end_b = char_to_byte_idx(text, take_c);
    text[..end_b].to_string()
}

/// 搜索索引: 基于已有索引返回匹配文档
#[tauri::command]
fn search_index(
    app: tauri::AppHandle,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<SearchResultPayload>, String> {
    let limit = limit.unwrap_or(50);

    // 获取索引目录
    let resolver = app.path();
    let base_dir = resolver
        .app_config_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    let index_dir = base_dir.join("indexes").join("default");
    if !index_dir.exists() {
        return Ok(vec![]);
    }

    let index = tantivy::Index::open_in_dir(&index_dir)
        .map_err(|e| format!("open index error: {}", e))?;
    // 注册中文 n-gram 分词器（2-3 字符，大小写归一）
    let analyzer = TextAnalyzer::builder(NgramTokenizer::new(2, 3, false).unwrap())
        .filter(LowerCaser)
        .build();
    index.tokenizers().register("cn_ngram", analyzer);
    let schema = index.schema();
    let title = schema
        .get_field("title").unwrap();
    let content = schema
        .get_field("content").unwrap();
    let file_path = schema
        .get_field("file_path").unwrap();
    let file_type = schema
        .get_field("file_type").unwrap();
    let modified_time = schema
        .get_field("modified_time").unwrap();

    let reader = index
        .reader()
        .map_err(|e| format!("reader error: {}", e))?;
    let searcher = reader.searcher();

    let parser = QueryParser::for_index(&index, vec![title, content]);
    let parsed = parser
        .parse_query(&query)
        .map_err(|e| format!("parse query error: {}", e))?;
    let top_docs = searcher
        .search(&parsed, &TopDocs::with_limit(limit))
        .map_err(|e| format!("search error: {}", e))?;
    if top_docs.is_empty() {
        return Ok(vec![]);
    }
    let max_score = top_docs.first().map(|(s, _)| *s).unwrap_or(1.0);

    let mut results = Vec::new();
    for (score, addr) in top_docs {
        let retrieved: TantivyDocument = searcher
            .doc(addr)
            .map_err(|e| format!("doc read error: {}", e))?;
        let title_val = retrieved
            .get_first(title)
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let content_val = retrieved
            .get_first(content)
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let path_val = retrieved
            .get_first(file_path)
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let type_val = retrieved
            .get_first(file_type)
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let modified_val = retrieved
            .get_first(modified_time)
            .and_then(|v| v.as_i64())
            .unwrap_or(0i64);

        let mut highlights = Vec::new();
        if !content_val.is_empty() {
            let snippet = snippet_with_highlight(&content_val, &query, 60, 140);
            if !snippet.is_empty() {
                highlights.push(snippet);
            }
        }

        results.push(SearchResultPayload {
            id: path_val.clone(),
            title: title_val,
            content: content_val,
            file_path: path_val,
            file_type: type_val,
            modified_time: modified_val,
            score: (score / if max_score > 0.0 { max_score } else { 1.0 }).min(1.0),
            highlights,
        });
    }

    Ok(results)
}

/// 重建索引: 前端调用该命令触发索引重建
#[tauri::command]
fn rebuild_index(
    app: tauri::AppHandle,
    directories: Vec<DirectoryConfigCmd>,
) -> Result<(), String> {
    let app = app.clone();

    // 使用线程池异步执行索引重建任务
    thread::spawn(move || {
        // app.path()获取到的是路径解析器
        let resolver = app.path();

        // 获取应用配置目录，如果不存在则使用当前目录
        let base_dir = resolver
            .app_config_dir()
            .unwrap_or_else(|_| PathBuf::from("."));

        // 确保索引目录存在，不存在则创建
        let index_dir = base_dir.join("indexes").join("default");
        let _ = fs::create_dir_all(&index_dir);

        let mut files: Vec<PathBuf> = Vec::new();
        // 遍历启用索引的目录
        for d in directories.into_iter().filter(|d| d.enabled) {
            let p = PathBuf::from(d.path);
            if d.recursive {
                // 如果是递归索引，遍历目录下所有文件及子目录
                for entry in walkdir::WalkDir::new(&p).into_iter().filter_map(|e| e.ok()) {
                    let meta = entry.metadata().ok();
                    if let Some(m) = meta {
                        if m.is_file() {
                            files.push(entry.path().to_path_buf());
                        }
                    }
                }
            } else {
                // 如果不是递归索引，只遍历目录下一级文件
                if let Ok(read_dir) = fs::read_dir(&p) {
                    for entry in read_dir.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            files.push(path);
                        }
                    }
                }
            }
        }

        let total = files.len();

        // 初始化索引进度事件
        let _ = app.emit(
            "index-progress",
            IndexProgressPayload {
                is_indexing: true,
                progress: 0,
                total_files: total,
                indexed_files: 0,
                index_size: 0,
                last_updated: 0,
            },
        );

        /* 构建索引schema（含中文 n-gram 分词支持） */
        let mut schema_builder = tantivy::schema::SchemaBuilder::default();
        let text_indexing = TextFieldIndexing::default()
            .set_tokenizer("cn_ngram")
            .set_index_option(IndexRecordOption::WithFreqsAndPositions);
        let text_options = TextOptions::default()
            .set_indexing_options(text_indexing)
            .set_stored();
        let title = schema_builder.add_text_field("title", text_options.clone());
        let content = schema_builder.add_text_field("content", text_options.clone());
        let file_path = schema_builder.add_text_field("file_path", tantivy::schema::STORED);
        let file_type = schema_builder.add_text_field("file_type", tantivy::schema::STORED);
        let modified_time = schema_builder.add_i64_field("modified_time", tantivy::schema::STORED);
        let file_size = schema_builder.add_u64_field("file_size", tantivy::schema::STORED);
        let schema = schema_builder.build();

        // 清空并重新创建索引目录，保证索引重建时是一个空索引
        let _ = fs::remove_dir_all(&index_dir);
        let _ = fs::create_dir_all(&index_dir);
        let index = tantivy::Index::create_in_dir(&index_dir, schema.clone()).unwrap();
        // 注册中文 n-gram 分词器（2-3 字符，大小写归一）
        let analyzer = TextAnalyzer::builder(NgramTokenizer::new(2, 3, false).unwrap())
            .filter(LowerCaser)
            .build();
        index.tokenizers().register("cn_ngram", analyzer);
        let mut writer = index.writer(50_000_000).unwrap(); // writer的参数是内存缓冲区大小，单位是字节

        let mut indexed = 0usize;
        // 遍历之前收集的全部文件，创建索引文档
        for path in files.iter() {
            let ext = path
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();
            let meta = fs::metadata(path).ok();
            let mut text = String::new();

            // 认为是文本文件，尝试读取内容
            if matches!(ext.as_str(), "txt" | "md" | "rs" | "js" | "ts" | "json") {
                if let Ok(t) = fs::read_to_string(path) {
                    text = t;
                }
            } 

            // 获取文件名作为标题
            let fname = path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();
            let mut doc = TantivyDocument::default();
            doc.add_text(title, fname);
            if !text.is_empty() {
                doc.add_text(content, text);
            }
            doc.add_text(file_path, path.to_string_lossy());
            doc.add_text(file_type, ext);
            // 从meta信息中解析出修改时间和文件大小
            if let Some(m) = &meta {
                let mt = m
                    .modified()
                    .ok()
                    .and_then(|t| t.elapsed().ok())
                    .map(|e| (chrono::Utc::now().timestamp_millis() - e.as_millis() as i64))
                    .unwrap_or(0);
                doc.add_i64(modified_time, mt);
                doc.add_u64(file_size, m.len());
            }
            let _ = writer.add_document(doc);
            indexed += 1;
            let progress = if total == 0 {
                100
            } else {
                ((indexed as f32 / total as f32) * 100.0).round() as u32
            };

            // 更新索引进度事件
            let _ = app.emit(
                "index-progress",
                IndexProgressPayload {
                    is_indexing: true,
                    progress,
                    total_files: total,
                    indexed_files: indexed,
                    index_size: 0,
                    last_updated: 0,
                },
            );
        }

        let _ = writer.commit();

        let mut size = 0u64;
        if let Ok(rd) = fs::read_dir(&index_dir) {
            for e in rd.flatten() {
                if let Ok(m) = e.metadata() {
                    size += m.len();
                }
            }
        }

        // 完成进度
        let _ = app.emit(
            "index-progress",
            IndexProgressPayload {
                is_indexing: false,
                progress: 100,
                total_files: total,
                indexed_files: indexed,
                index_size: size,
                last_updated: chrono::Utc::now().timestamp_millis(),
            },
        );
    });
    Ok(())
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
