import { CHAT_SPAM_WIN, CHAT_SPAM_LOSE, randomOf } from './Texts.js';

export class ChatSpam {
  constructor(layerEl) {
    this.layer = layerEl;
  }

  burst(kind) {
    const pool = kind === 'agra-win' ? CHAT_SPAM_LOSE : CHAT_SPAM_WIN;
    // agra-win means chat lost -> sad spam; chat-win means chat won -> hype spam
    const count = 14;
    const width = this.layer.clientWidth || window.innerWidth;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'chat-msg';
        el.textContent = randomOf(pool);
        el.style.left = `${Math.random() * (width - 100)}px`;
        el.style.bottom = `${20 + Math.random() * 40}px`;
        this.layer.appendChild(el);
        setTimeout(() => el.remove(), 1700);
      }, i * 60);
    }
  }
}
