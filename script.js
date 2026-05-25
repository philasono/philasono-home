// ========================================
// Google Sheets API設定
// ========================================
// APIキーを以下に入力してください
// Google Cloud Console から取得: https://console.cloud.google.com/
const GOOGLE_SHEETS_API_KEY = 'AIzaSyBwMRrKZllpUEr7oAEFwS-G1KZa0yMDUwQ';

// スプレッドシートID
const SHEET_ID = '1-Cuu0ARAlmTy-qgi_1EUG_IHp5kpNPo1Aahp5YM_AXo';

// シート名（スプレッドシート内のタブ名）
const SHEET_NAME = 'シート1';

// ========================================
// ライブ参加履歴のデータ管理
// ========================================
let allLiveData = [];

/**
 * Google Sheetsからデータを取得
 */
async function fetchLiveData() {
    const encodedSheetName = encodeURIComponent(SHEET_NAME);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedSheetName}?key=${GOOGLE_SHEETS_API_KEY}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        const values = data.values;
        
        if (!values || values.length < 2) {
            throw new Error('スプレッドシートにデータがありません');
        }
        
        // ヘッダー行をスキップして、データ行を処理
        const liveData = values.slice(1).map((row, index) => ({
            no: row[0] || index + 1,
            date: row[1] || '',
            title: row[2] || '',
            location: row[3] || ''
        }));
        
        allLiveData = liveData;
        renderTable(allLiveData);
        hideErrorMessage();
        
    } catch (error) {
        console.error('データ取得エラー:', error);
        showErrorMessage(`エラー: ${error.message}。API キーを確認してください。`);
    }
}

/**
 * テーブルをレンダリング
 */
function renderTable(data) {
    const tbody = document.getElementById('liveTableBody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="4">データが見つかりません</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(item => `
        <tr>
            <td class="col-no">${item.no}</td>
            <td class="col-date">${formatDate(item.date)}</td>
            <td class="col-title">${escapeHtml(item.title)}</td>
            <td class="col-location">${escapeHtml(item.location)}</td>
        </tr>
    `).join('');
}

/**
 * 日付フォーマット (表示用)
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    return dateStr;
}

/**
 * スプレッドシート日付文字列を Date に変換
 */
function parseSheetDate(dateStr) {
    if (!dateStr) return null;

    // 年月日形式や ISO 形式に対応
    const normalized = dateStr.trim();
    const isoMatch = normalized.match(/^\d{4}-\d{1,2}-\d{1,2}$/);
    if (isoMatch) {
        return new Date(normalized);
    }

    const jpMatch = normalized.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
    if (jpMatch) {
        const [, year, month, day] = jpMatch;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const altMatch = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (altMatch) {
        const [, year, month, day] = altMatch;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * テーブルをソート
 */
function sortTable(sortType) {
    let sorted = [...allLiveData];
    
    switch(sortType) {
        case 'date-desc':
            sorted.sort((a, b) => {
                const dateA = parseSheetDate(a.date);
                const dateB = parseSheetDate(b.date);
                return (dateB ? dateB.getTime() : 0) - (dateA ? dateA.getTime() : 0);
            });
            break;
        case 'date-asc':
            sorted.sort((a, b) => {
                const dateA = parseSheetDate(a.date);
                const dateB = parseSheetDate(b.date);
                return (dateA ? dateA.getTime() : 0) - (dateB ? dateB.getTime() : 0);
            });
            break;
        case 'title':
            sorted.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
            break;
    }
    
    renderTable(sorted);
}

/**
 * テーブルをフィルタリング
 */
function filterTable(searchText) {
    const query = searchText.toLowerCase();
    
    const filtered = allLiveData.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query)
    );
    
    renderTable(filtered);
}

/**
 * エラーメッセージを表示
 */
function showErrorMessage(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    document.getElementById('liveTableBody').innerHTML = '';
}

/**
 * エラーメッセージを非表示
 */
function hideErrorMessage() {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.style.display = 'none';
}

/**
 * イベントリスナーの設定
 */
function initializeEventListeners() {
    // ソート
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortTable(e.target.value);
        });
    }
    
    // 検索/フィルタリング
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterTable(e.target.value);
        });
    }
}

/**
 * 初期化
 */
document.addEventListener('DOMContentLoaded', () => {
    // 現在のページが music.html かどうか確認
    if (document.body.querySelector('.section-music')) {
        initializeEventListeners();
        fetchLiveData();
    }
});
