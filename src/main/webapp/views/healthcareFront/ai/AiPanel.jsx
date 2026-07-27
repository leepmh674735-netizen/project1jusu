import { useEffect, useState } from 'react';
import './AiPanel.css';

function AiPanel() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const aiEligible = !!user
    && ['owner', 'admin', 'trainer'].includes(String(user.role || '').toLowerCase());

  const [fabInput, setFabInput] = useState('');
  const [aiTabActive, setAiTabActive] = useState(false);

  useEffect(() => {
    const onDrawerState = (e) => {
      const { activeKind, collapsed } = e.detail || {};
      setAiTabActive(activeKind === 'ai' && !collapsed);
    };
    window.addEventListener('b2b-drawer-state', onDrawerState);
    return () => window.removeEventListener('b2b-drawer-state', onDrawerState);
  }, []);

  const askAi = (text) => {
    window.dispatchEvent(new CustomEvent('b2b-drawer-open', {
      detail: { kind: 'ai', id: 'assistant', title: 'AI 비서' },
    }));
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ai-chat-send', { detail: trimmed }));
    }, 0);
  };

  useEffect(() => {
    if (!aiEligible) return undefined;
    const onAsk = (e) => askAi(e.detail);
    window.addEventListener('ai-ask', onAsk);
    return () => window.removeEventListener('ai-ask', onAsk);
  }, [aiEligible]);

  const sendFromFab = () => {
    const text = fabInput.trim();
    setFabInput('');
    askAi(text);
  };

  if (!aiEligible || aiTabActive) return null;

  return (
    <div className="ai-fabbar">
      <span className="ai-fabbar-icon" aria-hidden="true">✨</span>
      <input
        type="text"
        value={fabInput}
        placeholder="매출, 계약, 회원에 대해 물어보세요"
        onChange={(e) => setFabInput(e.target.value)}
        onFocus={() => askAi('')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) sendFromFab();
        }}
      />
      <button type="button" title="전송" onClick={sendFromFab}>➤</button>
    </div>
  );
}

export default AiPanel;