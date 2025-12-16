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
        text = read_docx(path);
    } else if matches!(ext.as_str(), "doc") {
        // 纯rust对旧版DOC支持不好，暂时不支持
        // text = read_doc(path);
    } else if matches!(ext.as_str(), "xls" | "xlsx") {
        // 如果是Excel类型文件，使用calamine库读取内容
        text = read_excel(path);
    } else if ext.as_str() == "pdf" {
        // 如果是PDF类型文件，使用pdf-extract库读取内容
        // 2025.12.16 暂时移除对PDF的支持，读取PDF文本会导致索引时间过长
        // text = read_pdf(path);
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

/// 读取WORD文档内容
fn read_docx(path: &PathBuf) -> String {
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

/// 读取旧版WORD文档内容
#[allow(dead_code)]
fn read_doc(path: &PathBuf) -> String {
    if let Ok(bytes) = fs::read(path) {
        let mut segments: Vec<String> = Vec::new();
        for start in [0usize, 1usize] {
            let mut u16buf: Vec<u16> = Vec::new();
            let mut i = start;
            while i + 1 < bytes.len() {
                let code = u16::from_le_bytes([bytes[i], bytes[i + 1]]);
                let ch = char::from_u32(code as u32);
                let printable = match ch {
                    Some(c) => {
                        !c.is_control()
                            && (c.is_ascii()
                                || (c as u32 >= 0x3400 && c as u32 <= 0x9FFF)
                                || c.is_whitespace())
                    }
                    None => false,
                };
                if printable {
                    u16buf.push(code);
                } else {
                    if u16buf.len() >= 2 {
                        segments.push(String::from_utf16_lossy(&u16buf));
                    }
                    u16buf.clear();
                }
                i += 2;
            }
            if u16buf.len() >= 2 {
                segments.push(String::from_utf16_lossy(&u16buf));
            }
        }
        let mut asciibuf: Vec<u8> = Vec::new();
        for &b in bytes.iter() {
            if (b >= 0x20 && b <= 0x7E) || b == b'\n' || b == b'\r' || b == b'\t' {
                asciibuf.push(b);
            } else {
                if asciibuf.len() >= 4 {
                    segments.push(String::from_utf8_lossy(&asciibuf).to_string());
                }
                asciibuf.clear();
            }
        }
        if asciibuf.len() >= 4 {
            segments.push(String::from_utf8_lossy(&asciibuf).to_string());
        }
        let mut filtered: Vec<String> = Vec::new();
        for s in segments.iter() {
            let t = s.trim();
            if t.is_empty() { continue; }
            let up = t.to_ascii_uppercase();
            if let Some(pos) = up.find("MERGEFORMAT") {
                let pre = t[..pos].trim();
                if !pre.is_empty() { filtered.push(pre.to_string()); }
                continue;
            }
            let mut upper = 0usize;
            let mut alpha = 0usize;
            let mut cjk = 0usize;
            for ch in t.chars() {
                if ch.is_ascii_alphabetic() { alpha += 1; if ch.is_ascii_uppercase() { upper += 1; } }
                let u = ch as u32;
                if (u >= 0x3400 && u <= 0x9FFF) || (u >= 0xF900 && u <= 0xFAFF) { cjk += 1; }
            }
            let ratio = if alpha == 0 { 0.0 } else { upper as f32 / alpha as f32 };
            let noise = up.contains("ROOT ENTRY")
                || up.contains("WORDDOCUMENT")
                || up.contains("SUMMARYINFORMATION")
                || up.contains("DOCUMENTSUMMARYINFORMATION")
                || up.contains("WPS")
                || up.contains("KSOPRODUCTBUILDVER")
                || up.contains("ICV")
                || up.contains("NORMAL.DOT")
                || up.contains("NORMAL.DOTM")
                || up.contains("CALIBRI")
                || up.contains("HELVETICA")
                || up.contains("TABLE")
                || up.contains("DATA");
            let has_field_code = (ratio > 0.7 && (t.contains('*') || t.contains('\\')))
                || (up.contains("PAGE") && up.contains("MERGEFORMAT"))
                || up.contains("HYPERLINK")
                || up.contains("TOC")
                || up.contains("REF ")
                || up.contains("SEQ ")
                || up.contains("DATE")
                || up.contains("TIME");
            if has_field_code || noise { continue; }
            if cjk >= 1 {
                filtered.push(t.to_string());
            } else {
                if ratio < 0.5 && t.len() <= 200 { filtered.push(t.to_string()); }
            }
        }
        let out = if filtered.is_empty() {
            let mut utf16_only: Vec<String> = Vec::new();
            for s in segments.into_iter() {
                let t = s.trim();
                if t.is_empty() { continue; }
                if t.as_bytes().iter().any(|&b| b >= 0x80) { utf16_only.push(t.to_string()); }
            }
            utf16_only.join(" ")
        } else {
            filtered.join(" ")
        };
        return out;
    }
    String::new()
}

/// 读取PDF文档内容
#[allow(dead_code)]
fn read_pdf(path: &PathBuf) -> String {       
    match std::panic::catch_unwind(|| extract_text(path)) {
        Ok(Ok(s)) => s,
        _ => String::new(),
    }

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

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use zip::write::FileOptions;
    use zip::CompressionMethod;

    fn write_docx(path: &PathBuf, text: &str) {
        let file = fs::File::create(path).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        let options = FileOptions::default().compression_method(CompressionMethod::Stored);
        let docxml = format!(
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\
            <w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">\
            <w:body><w:p><w:r><w:t>{}</w:t></w:r></w:p></w:body></w:document>",
            text
        );
        zip.start_file("word/document.xml", options).unwrap();
        zip.write_all(docxml.as_bytes()).unwrap();
        zip.finish().unwrap();
    }

    fn write_xlsx(path: &PathBuf, a: &str, b: &str) {
        let file = fs::File::create(path).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        let options = FileOptions::default().compression_method(CompressionMethod::Stored);
        // [Content_Types].xml
        let content_types = r##"<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>"##;
        zip.start_file("[Content_Types].xml", options).unwrap();
        zip.write_all(content_types.as_bytes()).unwrap();
        // _rels/.rels
        let rels = r##"<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="/xl/workbook.xml"/>
</Relationships>"##;
        zip.start_file("_rels/.rels", options).unwrap();
        zip.write_all(rels.as_bytes()).unwrap();
        // xl/workbook.xml
        let workbook = r##"<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>"##;
        zip.start_file("xl/workbook.xml", options).unwrap();
        zip.write_all(workbook.as_bytes()).unwrap();
        // xl/_rels/workbook.xml.rels
        let wb_rels = r##"<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>"##;
        zip.start_file("xl/_rels/workbook.xml.rels", options).unwrap();
        zip.write_all(wb_rels.as_bytes()).unwrap();
        // xl/worksheets/sheet1.xml with inline strings
        let sheet = format!(
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\
<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\
  <sheetData>\
    <row r=\"1\">\
      <c r=\"A1\" t=\"inlineStr\"><is><t>{}</t></is></c>\
      <c r=\"B1\" t=\"inlineStr\"><is><t>{}</t></is></c>\
    </row>\
  </sheetData>\
</worksheet>", a, b);
        zip.start_file("xl/worksheets/sheet1.xml", options).unwrap();
        zip.write_all(sheet.as_bytes()).unwrap();
        zip.finish().unwrap();
    }

    #[test]
    fn test_read_docx() {
        let tmp = std::env::temp_dir().join("test_docx_read.docx");
        write_docx(&tmp, "Hello 路由器");
        let s = read_docx(&tmp);
        assert!(s.contains("Hello"));
        assert!(s.contains("路由器"));
        println!("{}", s);
        let _ = fs::remove_file(&tmp);
    }

    #[test]
    fn test_read_xlsx() {
        let tmp = std::env::temp_dir().join("test_xlsx_read.xlsx");
        write_xlsx(&tmp, "Hello", "路由器");
        let s = read_excel(&tmp);
        assert!(s.contains("Hello"));
        assert!(s.contains("路由器"));
        println!("{}", s);
        let _ = fs::remove_file(&tmp);
    }

    #[test]
    fn test_read_pdf() {
        let path = PathBuf::from("test.pdf");
        let s = read_pdf(&path);
        println!("{}", s);
    }

    fn write_fake_doc(path: &PathBuf, ascii: &str, unicode: &str) {
        let mut file = fs::File::create(path).unwrap();
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
        bytes.extend_from_slice(ascii.as_bytes());
        for u in unicode.encode_utf16() {
            bytes.extend_from_slice(&u.to_le_bytes());
        }
        file.write_all(&bytes).unwrap();
    }

    #[test]
    fn test_read_doc() {
        let tmp = std::env::temp_dir().join("test_doc_read.doc");
        write_fake_doc(&tmp, "Hello", "路由器");
        let s = read_doc(&tmp);
        assert!(s.contains("Hello"));
        assert!(s.contains("路由器"));
        println!("{}", s);
        let _ = fs::remove_file(&tmp);
    }

    #[test]
    fn test_read_doc_filters_field_codes() {
        let tmp = std::env::temp_dir().join("test_doc_filter.doc");
        let mut file = fs::File::create(&tmp).unwrap();
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
        bytes.extend_from_slice(b"Hello World ");
        bytes.extend_from_slice(b"PAGE  * MERGEFORMAT ");
        bytes.extend_from_slice(&[0, 1, 2, 3, 4, 5, 6, 7]);
        file.write_all(&bytes).unwrap();
        let s = read_doc(&tmp);
        assert!(s.contains("Hello"));
        assert!(!s.to_uppercase().contains("MERGEFORMAT"));
        let _ = fs::remove_file(&tmp);
    }

    #[test]
    fn test_read_doc_chinese_only_filters_noise() {
        let tmp = std::env::temp_dir().join("test_doc_chinese_noise.doc");
        let mut file = fs::File::create(&tmp).unwrap();
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
        bytes.extend_from_slice(b"Root Entry WordDocument SummaryInformation WPS KSOProductBuildVer ");
        for u in "我是一个兵".encode_utf16() { bytes.extend_from_slice(&u.to_le_bytes()); }
        file.write_all(&bytes).unwrap();
        let s = read_doc(&tmp);
        assert!(s.contains("我是一个兵"));
        assert!(!s.to_uppercase().contains("WORDDOCUMENT"));
        assert!(!s.to_uppercase().contains("WPS"));
        let _ = fs::remove_file(&tmp);
    }

    #[test]
    fn test_read_doc_local() {
        let path = PathBuf::from("test.doc");
        let s = read_doc(&path);
        println!("{}", s);
    }
}
