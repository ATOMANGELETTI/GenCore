pub mod pinned_store_api;
pub mod pinned_store_error;

pub use pinned_store_api::{
    DEFAULT_PINNED_TABS_JSON, PINNED_TABS_FILE_NAME, PINNED_TABS_JSON_MAX_BYTES,
    SavePinnedTabsArgs, load_pinned_tabs, pinned_tabs_path, read_pinned_tabs_file,
    save_pinned_tabs, write_pinned_tabs_file,
};
pub use pinned_store_error::PinnedStoreError;
