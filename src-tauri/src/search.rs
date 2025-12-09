use crate::types::SearchResultPayload;
use crate::indexer;
use tantivy::{collector::TopDocs, query::QueryParser, TantivyDocument};
use tantivy::schema::Value;
use tauri::AppHandle;

fn byte_to_char_idx(s: &str, byte_idx: usize) -> usize { s[..byte_idx].chars().count() }
fn char_to_byte_idx(s: &str, char_idx: usize) -> usize {
    let mut count = 0usize;
    for (b_idx, _) in s.char_indices() { if count == char_idx { return b_idx; } count += 1; }
    s.len()
}

/// 生成包含查询高亮的文本片段
///
/// # 参数
///
/// * `text` - 原始文本
/// * `query` - 查询字符串
/// * `pre_chars` - 片段前保留字符数
/// * `post_chars` - 片段后保留字符数
///
/// # 返回值
///
/// 返回包含查询高亮的文本片段字符串
fn snippet_with_highlight(text: &str, query: &str, pre_chars: usize, post_chars: usize) -> String {
    if text.is_empty() || query.is_empty() { return String::new(); }
    let t_low = text.to_lowercase();
    let q_low = query.to_lowercase();

    // 文本高亮的逻辑
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
    let take_c = usize::min(text.chars().count(), pre_chars + post_chars);
    let end_b = char_to_byte_idx(text, take_c);
    text[..end_b].to_string()
}

pub fn do_search_index(app: AppHandle, query: String, limit: Option<usize>) -> Result<Vec<SearchResultPayload>, String> {
    let limit = limit.unwrap_or(50);
    let index_dir = indexer::app_index_dir(&app);
    if !index_dir.exists() { return Ok(vec![]); }

    let index = tantivy::Index::open_in_dir(&index_dir).map_err(|e| format!("open index error: {}", e))?;
    indexer::register_tokenizers_for(&index);
    let schema = index.schema();
    let (title, content, file_path, file_type, modified_time, _) = indexer::index_fields(&schema);
    let reader = index.reader().map_err(|e| format!("reader error: {}", e))?;
    let searcher = reader.searcher();
    let parser = QueryParser::for_index(&index, vec![title, content]);
    let parsed = parser.parse_query(&query).map_err(|e| format!("parse query error: {}", e))?;
    let top_docs = searcher.search(&parsed, &TopDocs::with_limit(limit)).map_err(|e| format!("search error: {}", e))?;
    if top_docs.is_empty() { return Ok(vec![]); }
    let max_score = top_docs.first().map(|(s, _)| *s).unwrap_or(1.0);

    let mut results = Vec::new();
    for (score, addr) in top_docs {
        let retrieved: TantivyDocument = searcher.doc(addr).map_err(|e| format!("doc read error: {}", e))?;
        let title_val = retrieved.get_first(title).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let content_val = retrieved.get_first(content).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let path_val = retrieved.get_first(file_path).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let type_val = retrieved.get_first(file_type).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let modified_val = retrieved.get_first(modified_time).and_then(|v| v.as_i64()).unwrap_or(0i64);
        let mut highlights = Vec::new();
        if !content_val.is_empty() {
            let snippet = snippet_with_highlight(&content_val, &query, 60, 140);
            if !snippet.is_empty() { highlights.push(snippet); }
        }
        results.push(SearchResultPayload { id: path_val.clone(), title: title_val, content: content_val, file_path: path_val, file_type: type_val, modified_time: modified_val, score: (score / if max_score > 0.0 { max_score } else { 1.0 }).min(1.0), highlights });
    }
    Ok(results)
}

