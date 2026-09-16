// Common utilities shared between Guest and Admin portals

// Sao chép văn bản vào clipboard với thông báo tooltip trực quan
function copyToClipboard(text, btnElement) {
  if (!navigator.clipboard) {
    // Fallback cho trình duyệt cũ
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showCopyFeedback(btnElement);
    } catch (err) {
      console.error('Không thể sao chép:', err);
    }
    document.body.removeChild(textArea);
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    showCopyFeedback(btnElement);
  }).catch(err => {
    console.error('Lỗi khi sao chép:', err);
  });
}

function showCopyFeedback(btnElement) {
  if (!btnElement) return;
  const originalHtml = btnElement.innerHTML;
  btnElement.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i> <span class="text-emerald-400">Đã chép</span>';
  btnElement.classList.add('bg-emerald-950/80', 'border-emerald-500');
  setTimeout(() => {
    btnElement.innerHTML = originalHtml;
    btnElement.classList.remove('bg-emerald-950/80', 'border-emerald-500');
  }, 2000);
}

// Trạng thái kết nối Database
async function loadCommonSystemStatus() {
  try {
    const res = await fetch('/api/analytics/system-status');
    const json = await res.json();
    if (json.success) {
      const status = json.data;
      const badge = document.getElementById('dbConnectionBadge');
      if (badge) {
        if (status.connectionMode === 'ASTRA') {
          badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5';
          badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> DataStax Astra DB (Cloud)';
        } else if (status.connectionMode === 'LOCAL') {
          badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5';
          badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span> Cassandra Local Cluster';
        } else {
          badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5';
          badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span> Demo Mock Engine (Hotel.cql)';
        }
      }
    }
  } catch (err) {
    console.error('Lỗi kiểm tra DB status:', err);
  }
}

// CQL Live Inspector Logic
function startCqlPoller() {
  fetchCqlHistory();
  setInterval(fetchCqlHistory, 2500);
}

async function fetchCqlHistory() {
  try {
    const res = await fetch('/api/analytics/cql-history');
    const json = await res.json();
    if (json.success && json.data) {
      renderCqlHistory(json.data);
    }
  } catch (err) {
    // Ignore error in polling
  }
}

function renderCqlHistory(logs) {
  const container = document.getElementById('cqlLogsContainer');
  const countBadge = document.getElementById('cqlLogCount');
  if (!container) return;

  if (countBadge) countBadge.innerText = logs.length;

  if (logs.length === 0) {
    container.innerHTML = '<div class="text-slate-500 text-xs italic">Chưa có câu lệnh CQL nào được gọi...</div>';
    return;
  }

  container.innerHTML = logs.map(l => `
    <div class="mb-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
      <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1">
        <span class="text-emerald-400 font-bold">[${l.timestamp}]</span>
        <span class="text-amber-400">${l.executionTimeMs}ms</span>
      </div>
      <div class="text-sky-300 break-words whitespace-pre-wrap">${escapeHtmlText(l.query)}</div>
      ${l.params && l.params.length > 0 ? `
        <div class="text-[11px] text-slate-400 mt-1 border-t border-slate-800/80 pt-1">
          <span class="text-slate-500">Params:</span> [${l.params.map(p => typeof p === 'string' ? `'${p}'` : p).join(', ')}]
        </div>
      ` : ''}
    </div>
  `).join('');
}

function escapeHtmlText(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toggleCqlDrawer() {
  const panel = document.getElementById('cqlInspectorPanel');
  if (panel) {
    panel.classList.toggle('translate-y-full');
  }
}
