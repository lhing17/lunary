use calamine::{open_workbook_auto, DataType, Reader as CalReader};
use pdf_extract::extract_text;
use quick_xml::events::Event;
use quick_xml::Reader as XmlReader;
use quick_xml::escape::unescape;
use std::{fs, path::PathBuf, thread};
use tantivy::schema::{Field, IndexRecordOption, Schema, TextFieldIndexing, TextOptions};
use tantivy::schema::{FAST, INDEXED, STORED};
use tantivy::tokenizer::{LowerCaser, NgramTokenizer, TextAnalyzer};
use tantivy::TantivyDocument;
use tauri::AppHandle;
use tauri::Emitter;
use tauri::Manager;
use zip::ZipArchive;

use crate::types::{DirectoryConfigCmd, IndexProgressPayload};

/// 获取应用默认索引目录
pub fn app_index_dir(app: &AppHandle) -> PathBuf {
    let resolver = app.path();
    let base_dir = resolver
        .app_config_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    base_dir.join("indexes").join("default")
}

/// 注册中文 n-gram 分词器（标题使用 2-3 字符，内容使用 1-3 字符，大小写归一）
pub fn register_tokenizers_for(index: &tantivy::Index) {
    let analyzer = TextAnalyzer::builder(NgramTokenizer::new(2, 3, false).unwrap())
        .filter(LowerCaser)
        .build();
    let analyzer_small = TextAnalyzer::builder(NgramTokenizer::new(1, 3, false).unwrap())
        .filter(LowerCaser)
        .build();
    index.tokenizers().register("cn_ngram", analyzer);
    index
        .tokenizers()
        .register("cn_ngram_small", analyzer_small);
}

/// 构建索引schema（含中文 n-gram 分词支持），包含标题、内容、文件路径、文件类型、修改时间、文件大小字段
fn build_schema() -> Schema {
    let mut schema_builder = tantivy::schema::SchemaBuilder::default();
    let text_indexing_title = TextFieldIndexing::default()
        .set_tokenizer("cn_ngram_small")
        .set_index_option(IndexRecordOption::WithFreqsAndPositions);
    let text_indexing_content = TextFieldIndexing::default()
        .set_tokenizer("cn_ngram")
        .set_index_option(IndexRecordOption::WithFreqsAndPositions);
    let title_options = TextOptions::default()
        .set_indexing_options(text_indexing_title)
        .set_stored();
    let content_options = TextOptions::default()
        .set_indexing_options(text_indexing_content)
        .set_stored();
    schema_builder.add_text_field("title", title_options);
    schema_builder.add_text_field("content", content_options);
    schema_builder.add_text_field("file_path", STORED);
    // file_type: 作为精确匹配，使用 raw 分词器并存储
    let ft_indexing = TextFieldIndexing::default()
        .set_tokenizer("raw")
        .set_index_option(IndexRecordOption::Basic);
    let ft_options = TextOptions::default()
        .set_indexing_options(ft_indexing)
        .set_stored();
    schema_builder.add_text_field("file_type", ft_options);
    // modified_time：数值字段，默认可用于 RangeQuery，同时存储
    schema_builder.add_i64_field("modified_time", INDEXED | FAST | STORED);
    schema_builder.add_u64_field("file_size", STORED);
    schema_builder.build()
}

/// 获取索引schema中定义的字段（标题、内容、文件路径、文件类型、修改时间、文件大小）
pub fn index_fields(schema: &Schema) -> (Field, Field, Field, Field, Field, Field) {
    let title = schema.get_field("title").unwrap();
    let content = schema.get_field("content").unwrap();
    let file_path = schema.get_field("file_path").unwrap();
    let file_type = schema.get_field("file_type").unwrap();
    let modified_time = schema.get_field("modified_time").unwrap();
    let file_size = schema.get_field("file_size").unwrap();
    (title, content, file_path, file_type, modified_time, file_size)
}

/// 从目录配置中递归或非递归收集所有文件路径，是否递归取决于配置
fn collect_files_from_dirs(directories: Vec<DirectoryConfigCmd>) -> Vec<PathBuf> {
    let mut files: Vec<PathBuf> = Vec::new();
    for d in directories.into_iter().filter(|d| d.enabled) {
        let p = PathBuf::from(d.path);
        if d.recursive {
            for entry in walkdir::WalkDir::new(&p).into_iter().filter_map(|e| e.ok()) {
                let meta = entry.metadata().ok();
                if let Some(m) = meta {
                    if m.is_file() {
                        files.push(entry.path().to_path_buf());
                    }
                }
            }
        } else {
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
    files
}

/// 向前端发送索引进度更新事件
fn emit_index_progress(
    app: &AppHandle,
    is_indexing: bool,
    progress: u32,
    total: usize,
    indexed: usize,
    size: u64,
    last_updated: i64,
) {
    let _ = app.emit(
        "index-progress",
        IndexProgressPayload {
            is_indexing,
            progress,
            total_files: total,
            indexed_files: indexed,
            index_size: size,
            last_updated,
        },
    );
}

/// 从文件路径构建tantivy文档，包含标题、内容、文件路径、文件类型、修改时间、文件大小字段
fn make_doc(
    path: &PathBuf,
    title: Field,
    content: Field,
    file_path: Field,
    file_type: Field,
    modified_time: Field,
    file_size: Field,
) -> TantivyDocument {
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    let meta = fs::metadata(path).ok();
    let mut text = String::new();

    if matches!(ext.as_str(), "txt" | "md" | "rs" | "js" | "ts" | "json") {
        // 如果是文本类型文件，直接读取内容
        if let Ok(t) = fs::read_to_string(path) {
            text = t;
        }
    } else if matches!(ext.as_str(), "docx") {
        // 如果是文档类型文件，使用quick-xml库读取内容
        text = read_doc(path);
    } else if matches!(ext.as_str(), "doc") {
        // 暂不支持DOC文件
    } else if matches!(ext.as_str(), "xls" | "xlsx") {
        // 如果是Excel类型文件，使用calamine库读取内容
        text = read_excel(path);
    } else if ext.as_str() == "pdf" {
        // 如果是PDF类型文件，使用pdf-extract库读取内容
        if let Ok(s) = extract_text(path) {
            text = s;
        }
    }
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
    if let Some(m) = &meta {
        let mt = m
            .modified()
            .ok()
            .and_then(|t| t.elapsed().ok())
            .map(|e| chrono::Utc::now().timestamp_millis() - e.as_millis() as i64)
            .unwrap_or(0);
        doc.add_i64(modified_time, mt);
        doc.add_u64(file_size, m.len());
    }
    doc
}

/// 读取Excel文件内容
fn read_excel(path: &PathBuf) -> String {  
    if let Ok(mut wb) = open_workbook_auto(path.to_string_lossy().to_string()) {
        let mut out = String::new();
        for sheet_name in wb.sheet_names().to_vec() {
            if let Some(Ok(range)) = wb.worksheet_range(&sheet_name) {
                for row in range.rows() {
                    for c in row {
                        match c {
                            DataType::String(s) => {
                                out.push_str(s);
                                out.push(' ');
                            }
                            DataType::Float(f) => {
                                out.push_str(&format!("{}", f));
                                out.push(' ');
                            }
                            DataType::Int(i) => {
                                out.push_str(&format!("{}", i));
                                out.push(' ');
                            }
                            DataType::Bool(b) => {
                                out.push_str(&format!("{}", b));
                                out.push(' ');
                            }
                            _ => {}
                        }
                    }
                    out.push('\n');
                }
            }
        }
        return out;
    }
    String::new()
}

/// 读取WORD文档
fn read_doc(path: &PathBuf) -> String {
    if let Ok(f) = fs::File::open(path) {
        if let Ok(mut zip) = ZipArchive::new(f) {
            if let Ok(mut file) = zip.by_name("word/document.xml") {
                use std::io::Read;
                let mut xml = String::new();
                let _ = file.read_to_string(&mut xml);
                let mut r = XmlReader::from_str(&xml);
                r.config_mut().trim_text(true);
                let mut buf = Vec::new();
                let mut out = String::new();
                loop {
                    match r.read_event_into(&mut buf) {
                        Ok(Event::Start(e)) => if e.name().as_ref() == b"w:t" {},
                        Ok(Event::Text(t)) => {
                             // 1. 先用 reader 解码字节 → &str
                            let decoded = r
                                .decoder()
                                .decode(t.as_ref())
                                .unwrap_or_default();

                            // 2. 再做 XML 实体反转义
                            let text = unescape(&decoded)
                                .unwrap_or_default();
                            out.push_str(&text);
                            out.push(' ');
                        }
                        Ok(Event::Eof) => break,
                        _ => {}
                    }
                    buf.clear();
                }
                return out;
            }
        }
    }
    String::new()
}

pub fn do_rebuild_index(
    app: AppHandle,
    directories: Vec<DirectoryConfigCmd>,
) -> Result<(), String> {
    let app = app.clone();
    thread::spawn(move || {
        let index_dir = app_index_dir(&app);
        let _ = fs::create_dir_all(&index_dir);
        let files = collect_files_from_dirs(directories);
        let total = files.len();
        emit_index_progress(&app, true, 0, total, 0, 0, 0);

        let schema = build_schema();
        let _ = fs::remove_dir_all(&index_dir);
        let _ = fs::create_dir_all(&index_dir);
        let index = tantivy::Index::create_in_dir(&index_dir, schema.clone()).unwrap();
        register_tokenizers_for(&index);
        let mut writer = index.writer(50_000_000).unwrap();
        let (title, content, file_path, file_type, modified_time, file_size) =
            index_fields(&schema);
        let mut indexed = 0usize;
        for path in files.iter() {
            let doc = make_doc(
                path,
                title,
                content,
                file_path,
                file_type,
                modified_time,
                file_size,
            );
            let _ = writer.add_document(doc);
            indexed += 1;
            let progress = if total == 0 {
                100
            } else {
                ((indexed as f32 / total as f32) * 100.0).round() as u32
            };
            emit_index_progress(&app, true, progress, total, indexed, 0, 0);
        }
        let _ = writer.commit();
        let size = compute_dir_size(&index_dir);
        emit_index_progress(
            &app,
            false,
            100,
            total,
            indexed,
            size,
            chrono::Utc::now().timestamp_millis(),
        );
    });
    Ok(())
}

/// 递归计算目录大小（单位：字节）
fn compute_dir_size(dir: &PathBuf) -> u64 {
    let mut size = 0u64;
    if let Ok(rd) = fs::read_dir(dir) {
        for e in rd.flatten() {
            if let Ok(m) = e.metadata() {
                size += m.len();
            }
        }
    }
    size
}
