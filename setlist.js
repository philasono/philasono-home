// ========================================
// Google Sheets API設定
// ========================================
// APIキーを以下に入力してください
// Google Cloud Console から取得: https://console.cloud.google.com/
const GOOGLE_SHEETS_API_KEY = 'AIzaSyBwMRrKZllpUEr7oAEFwS-G1KZa0yMDUwQ';

// 秋山黄色セットリスト分析用スプレッドシートID
const SETLIST_SHEET_ID = '1WGnIKVmJz6sUXMPo_Nuo27UE3S1m-ysbAFj20ogyJ2w';

// シート名（スプレッドシート内のタブ名）
const SETLIST_SHEET_NAME = 'シート1';

// ========================================
// セットリストデータ管理
// ========================================
let allSetlistData = [];

/**
 * Google Sheetsからセットリストデータを取得
 */
async function fetchSetlistData() {
    const encodedSheetName = encodeURIComponent(SETLIST_SHEET_NAME);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SETLIST_SHEET_ID}/values/${encodedSheetName}?key=${GOOGLE_SHEETS_API_KEY}`;

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

        const liveData = values.slice(1).map((row, index) => ({
            no: row[0] || index + 1,
            date: row[1] || '',
            title: row[2] || '',
            song: row[3] || ''
        }));

        allSetlistData = liveData;
        renderTable(allSetlistData);
        hideErrorMessage();

    } catch (error) {
        console.error('データ取得エラー:', error);
        showErrorMessage(`エラー: ${error.message}。API キーとスプレッドシート ID を確認してください。`);
    }
}

/**
 * テーブルをレンダリング
 */
function renderTable(data) {
    const tbody = document.getElementById('liveTableBody');

    if (data.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="2">データが見つかりません</td></tr>';
        return;
    }

    const grouped = groupByLive(data);
    tbody.innerHTML = grouped.map(group => {
        const header = `
            <tr class="group-row">
                <td colspan="2">
                    <div class="group-header">
                        <span class="group-date">${formatDate(group.date)}</span>
                        <strong class="group-title">${escapeHtml(group.title)}</strong>
                    </div>
                </td>
            </tr>
        `;

        const rows = group.songs.map(item => `
            <tr>
                <td class="col-no">${item.no}</td>
                <td class="col-song">${escapeHtml(item.song)}</td>
            </tr>
        `).join('');

        return header + rows;
    }).join('');
}

function groupByLive(data) {
    const groups = [];
    const map = new Map();

    data.forEach(item => {
        const key = `${item.date}||${item.title}`;
        if (!map.has(key)) {
            map.set(key, {
                date: item.date,
                title: item.title,
                songs: []
            });
            groups.push(map.get(key));
        }
        map.get(key).songs.push(item);
    });

    return groups;
}

/**
 * 日付フォーマット
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    return dateStr;
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
    let sorted = [...allSetlistData];

    switch (sortType) {
        case 'date-desc':
            sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'date-asc':
            sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'title':
            sorted.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
            break;
        case 'song':
            sorted.sort((a, b) => a.song.localeCompare(b.song, 'ja'));
            break;
    }

    renderTable(sorted);
}

/**
 * テーブルをフィルタリング
 */
function filterTable(searchText) {
    const query = searchText.toLowerCase();

    const filtered = allSetlistData.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.song.toLowerCase().includes(query)
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
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortTable(e.target.value);
        });
    }

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
    if (document.body.querySelector('.section-music')) {
        initializeEventListeners();
        fetchSetlistData();
    }
});
