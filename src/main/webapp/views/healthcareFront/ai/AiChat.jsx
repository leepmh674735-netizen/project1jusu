import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AiPanel.css';

function parseSseChunk(chunk) {
  let event = 'message';
  const dataLines = [];
  chunk.split('\n').forEach((line) => {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  });
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return { event, data: { raw: dataLines.join('\n') } };
  }
}

function aggregateMonthly(data) {
  const rows = Array.isArray(data) ? data : data?.items;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const byMonth = new Map();
  rows.forEach((row) => {
    const date = row.payDate ?? row.expenseDate ?? row.month;
    const price = Number(row.payPrice ?? row.expensePrice ?? row.total);
    if (!date || Number.isNaN(price)) return;
    const month = String(date).slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + price);
  });
  if (byMonth.size === 0) return null;
  return [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([month, total]) => ({ month, total }));
}

function renderBold(content) {
  const text = String(content ?? '');
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function extractGaugePercent(data) {
  if (!data || typeof data !== 'object') return null;
  const flat = { ...data, ...(typeof data['진단'] === 'object' ? data['진단'] : {}) };
  for (const [key, value] of Object.entries(flat)) {
    const num = Number(value);
    if (Number.isNaN(num)) continue;
    if (/churn|rate|score|확률|위험/i.test(key)) {
      if (num >= 0 && num <= 1) return Math.round(num * 100);
      if (num > 1 && num <= 100) return Math.round(num);
    }
  }
  return null;
}

function AiChat({ onNavigate }) {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [stage, setStage] = useState(null);

  const scrollRef = useRef(null);
  const sendingRef = useRef(false);
  const conversationIdRef = useRef(null);
  const inputRef = useRef(null);
  const stageTimerRef = useRef(null);
  const sessionExpRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, stage]);

  useEffect(() => {
    const onDrawerState = (e) => {
      const { activeKind, collapsed } = e.detail || {};
      if (activeKind === 'ai' && !collapsed) {
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    window.addEventListener('b2b-drawer-state', onDrawerState);
    return () => window.removeEventListener('b2b-drawer-state', onDrawerState);
  }, []);

  useEffect(() => {
    return () => {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    };
  }, []);

  const sendText = useCallback(async (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed || sendingRef.current) return;
    sendingRef.current = true;

    if (sessionExpRef.current != null && Date.now() / 1000 > sessionExpRef.current) {
      conversationIdRef.current = null;
      setConversationId(null);
      sessionExpRef.current = null;
      setMessages([]);
    }

    const token = localStorage.getItem('accessToken');
    if (!conversationIdRef.current && sessionExpRef.current == null && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (typeof payload.exp === 'number') sessionExpRef.current = payload.exp;
      } catch {
      }
    }

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setSending(true);
    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    setStage('thinking');

    let reader = null;

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId: conversationIdRef.current, message: trimmed }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          conversationIdRef.current = null;
          setConversationId(null);
          sessionExpRef.current = null;
        }
        const body = await res.text();
        setMessages((prev) => [
          ...prev,
          { role: 'error', content: body || 'AI비서 처리 중 오류가 발생했어요.' },
        ]);
        return;
      }

      reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx = buffer.indexOf('\n\n');

        while (idx >= 0) {
          const parsed = parseSseChunk(buffer.slice(0, idx));
          buffer = buffer.slice(idx + 2);
          idx = buffer.indexOf('\n\n');
          if (!parsed) continue;

          if (parsed.event === 'start' && parsed.data.conversationId) {
            conversationIdRef.current = parsed.data.conversationId;
            setConversationId(parsed.data.conversationId);
          } else if (parsed.event === 'tool') {
            if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
            setStage('tool');
            stageTimerRef.current = setTimeout(() => setStage('visualizing'), 1300);
          } else if (parsed.event === 'answer') {
            if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: parsed.data.content,
                links: parsed.data.links || [],
                tools: parsed.data.tools || [],
                charts: parsed.data.charts || [],
              },
            ]);
          } else if (parsed.event === 'error') {
            if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
            setMessages((prev) => [
              ...prev,
              { role: 'error', content: parsed.data.message },
            ]);
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: 'AI비서 연결에 실패했어요. 잠시 후 다시 시도해 주세요.' },
      ]);
    } finally {
      if (reader) {
        try {
          await reader.cancel();
        } catch {
        }
      }
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
      sendingRef.current = false;
      setSending(false);
      setStage(null);
    }
  }, []);

  useEffect(() => {
    const onSend = (e) => sendText(e.detail);
    window.addEventListener('ai-chat-send', onSend);
    return () => window.removeEventListener('ai-chat-send', onSend);
  }, [sendText]);

  const sendFromInput = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendText(text);
  };

  const goLink = (to) => {
    if (onNavigate) onNavigate(to);
    else navigate(to);
  };

  const renderChart = (chart, key) => {
    if (chart.type === 'bar') {
      const monthly = aggregateMonthly(chart.data);
      if (!monthly) return null;
      const max = Math.max(...monthly.map((m) => m.total)) || 1;
      return (
        <div key={key} className="ai-chart-card">
          <div className="ai-chart-bars">
            {monthly.map((m) => (
              <div key={m.month} className="ai-chart-col">
                <span className="ai-chart-value">{m.total.toLocaleString()}</span>
                <div
                  className="ai-chart-bar"
                  style={{ height: `${Math.round((m.total / max) * 64)}px` }}
                />
                <span className="ai-chart-month">{m.month.slice(5)}월</span>
              </div>
            ))}
          </div>
          <p className="ai-chart-caption">최근 조회분(최대 20건) 기준 월별 합계</p>
        </div>
      );
    }
    if (chart.type === 'gauge') {
      const percent = extractGaugePercent(chart.data);
      if (percent == null) return null;
      return (
        <div key={key} className="ai-chart-card">
          <div className="ai-gauge">
            <div className="ai-gauge-track">
              <div
                className={`ai-gauge-fill${percent >= 70 ? ' danger' : ''}`}
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
            <span className="ai-gauge-label">이탈 위험 {percent}%</span>
          </div>
        </div>
      );
    }
    if (chart.type === 'list') {
      const items = chart.data?.items;
      if (!Array.isArray(items) || items.length === 0) return null;
      return (
        <div key={key} className="ai-chart-card">
          <ul className="ai-chart-list">
            {items.map((item) => (
              <li key={item.key ?? item.label}>
                <span>{item.label}</span>
                <span className={`ai-chip${item.tone === 'danger' ? ' danger' : ''}`}>
                  {item.count}건
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="ai-chat">
      <div className="ai-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="ai-empty">
            안녕하세요, 사장님!<br />
            매출, 계약, 회원에 대해 무엇이든 물어보세요.
          </div>
        )}
        {messages.map((m, i) => {
          if (m.role === 'user') {
            return <div key={i} className="ai-bubble ai-bubble-user">{m.content}</div>;
          }
          if (m.role === 'error') {
            return <div key={i} className="ai-bubble ai-bubble-warn">⏱ {m.content}</div>;
          }
          return (
            <div key={i} className="ai-bubble ai-bubble-assistant">
              <div className="ai-bubble-content">{renderBold(m.content)}</div>
              {m.charts && m.charts.map((chart, ci) => renderChart(chart, `${i}-${ci}`))}
              {m.links && m.links.length > 0 && (
                <div className="ai-links">
                  {m.links.map((link) => (
                    <button
                      key={link.to}
                      type="button"
                      className="ai-link-btn"
                      onClick={() => goLink(link.to)}
                    >
                      {link.label} →
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {sending && (
          <div className="ai-bubble ai-bubble-assistant ai-bubble-loading">
            {stage === 'tool'
              ? '데이터를 가져오는 중입니다…'
              : stage === 'visualizing'
                ? '데이터를 시각화하는 중입니다…'
                : '생각 중...'}
          </div>
        )}
      </div>

      <div className="ai-inputbar">
        <input
          ref={inputRef}
          type="text"
          value={input}
          placeholder="이어서 물어보세요"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              sendFromInput();
            }
          }}
          disabled={sending}
        />
        <button type="button" onClick={sendFromInput} disabled={sending || !input.trim()}>
          전송
        </button>
      </div>

      <div className="ai-trust">🔒 이 대화는 우리 지점 데이터만 조회해요</div>

      <span hidden>{conversationId ?? ''}</span>
    </div>
  );
}

export default AiChat;