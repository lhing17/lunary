use serde::{Deserialize, Serialize};

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryConfigCmd {
    pub path: String,
    pub enabled: bool,
    pub recursive: bool,
    #[allow(dead_code)]
    pub last_indexed: i64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IndexProgressPayload {
    pub is_indexing: bool,
    pub progress: u32,
    pub total_files: usize,
    pub indexed_files: usize,
    pub index_size: u64,
    pub last_updated: i64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultPayload {
    pub id: String,
    pub title: String,
    pub content: String,
    pub file_path: String,
    pub file_type: String,
    pub modified_time: i64,
    pub score: f32,
    pub highlights: Vec<String>,
}

