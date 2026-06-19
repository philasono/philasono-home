// ========================================
// Google Sheets API設定
// ========================================
// APIキーを以下に入力してください
// Google Cloud Console から取得: https://console.cloud.google.com/
const GOOGLE_SHEETS_API_KEY = 'AIzaSyBwMRrKZllpUEr7oAEFwS-G1KZa0yMDUwQ';

// 米津玄師セットリスト分析用スプレッドシートID
// 実際のシートIDをここに入力してください
const SETLIST_SHEET_ID = '16pEZMzrAbl4tbqMeD2O2RI2_n1QchxvkYD5f7dK7RNE';

// シート名（スプレッドシート内のタブ名）
const SETLIST_SHEET_NAME = 'シート1';

// ========================================
// セットリストデータ管理
// ========================================
let allSetlistData = [];
let currentState = {
    sortType: 'date-desc',
    searchQuery: '',
    yearFilter: 'all'
};

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
        populateYearFilter(allSetlistData);
        applyFiltersAndSort();
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
 * 検索結果件数を表示
 */
function renderResultCount(count) {
    const countElement = document.getElementById('resultCount');
    if (!countElement) return;
    const label = count === 0 ? 'データが見つかりません' : `検索結果：${count}件`;
    countElement.textContent = label;
}

/**
 * 曲名ランキングTOP10を表示
 */
function renderTopRanking(data) {
    const rankingElement = document.getElementById('topRankingList');
    if (!rankingElement) return;

    const counts = data.reduce((acc, item) => {
        const song = item.song || '不明';
        acc[song] = (acc[song] || 0) + 1;
        return acc;
    }, {});

    const ranking = Object.entries(counts)
        .map(([song, count]) => ({ song, count }))
        .sort((a, b) => b.count - a.count || a.song.localeCompare(b.song, 'ja'));

    const grouped = ranking.reduce((acc, item) => {
        if (!acc.length || acc[acc.length - 1].count !== item.count) {
            acc.push({ count: item.count, songs: [item.song] });
        } else {
            acc[acc.length - 1].songs.push(item.song);
        }
        return acc;
    }, []);

    const displayed = grouped.slice(0, 10);

    if (displayed.length === 0) {
        rankingElement.innerHTML = '<li>データを読み込み中...</li>';
        return;
    }

    rankingElement.innerHTML = displayed.map((group, index) => `
        <li>
            <div class="ranking-left">
                <span class="ranking-position">${index + 1}</span>
                <div class="ranking-count-wrap">
                    <span class="ranking-count-number">${group.count}</span>
                    <span class="ranking-count-label">回</span>
                </div>
            </div>
            <div class="ranking-right">
                ${group.songs.map(song => `<div class="ranking-song-item">${escapeHtml(song)}</div>`).join('')}
            </div>
        </li>
    `).join('');
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
    currentState.sortType = sortType;
    applyFiltersAndSort();
}

function filterTable(searchText) {
    currentState.searchQuery = searchText.toLowerCase();
    applyFiltersAndSort();
}

function setYearFilter(year) {
    currentState.yearFilter = year;
    applyFiltersAndSort();
}

function applyFiltersAndSort() {
    let result = [...allSetlistData];

    if (currentState.searchQuery) {
        result = result.filter(item =>
            item.title.toLowerCase().includes(currentState.searchQuery) ||
            item.song.toLowerCase().includes(currentState.searchQuery)
        );
    }

    if (currentState.yearFilter !== 'all') {
        result = result.filter(item => getYearFromDate(item.date) === currentState.yearFilter);
    }

    switch (currentState.sortType) {
        case 'date-desc':
            result.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'date-asc':
            result.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'title':
            result.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
            break;
        case 'song':
            result.sort((a, b) => a.song.localeCompare(b.song, 'ja'));
            break;
    }

    renderResultCount(result.length);
    renderTable(result);
    renderTopRanking(allSetlistData);
}

function populateYearFilter(data) {
    const yearSelect = document.getElementById('yearFilterSelect');
    if (!yearSelect) return;

    const years = Array.from(new Set(
        data.map(item => getYearFromDate(item.date)).filter(Boolean)
    )).sort((a, b) => Number(b) - Number(a));

    const options = ['<option value="all">すべて</option>'];
    years.forEach(year => {
        options.push(`<option value="${year}">${year}</option>`);
    });
    yearSelect.innerHTML = options.join('');
}

function getYearFromDate(dateStr) {
    if (!dateStr) return '';
    const match = dateStr.match(/\d{4}/);
    return match ? match[0] : '';
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

function hideErrorMessage() {
    const errorDiv = document.getElementById('errorMessage');
    if (!errorDiv) return;
    errorDiv.style.display = 'none';
}

window.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const yearFilterSelect = document.getElementById('yearFilterSelect');

    if (searchInput) {
        searchInput.addEventListener('input', (event) => filterTable(event.target.value));
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', (event) => sortTable(event.target.value));
    }
    if (yearFilterSelect) {
        yearFilterSelect.addEventListener('change', (event) => setYearFilter(event.target.value));
    }

    fetchSetlistData();
});
