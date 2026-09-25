import {
  DEFAULT_SETTINGS,
  PRESENTATION_PRESETS,
  TONE_OPTIONS,
  applyPresentationPreset,
  makeSegmentLabel,
  normalizeSegment,
} from '../core/SettingsManager.js';

const TONE_LABELS = {
  amber: 'Zlatá',
  violet: 'Fialová',
  blue: 'Modrá',
  red: 'Červená',
  purple: 'Neon fialová',
  green: 'Zelená',
  orange: 'Oranžová',
  cyan: 'Tyrkysová',
  pink: 'Růžová',
  final: 'Finální zlato',
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export class SettingsPanel {
  constructor({ manager, onApply, canOpen = () => true }) {
    this.manager = manager;
    this.onApply = onApply;
    this.canOpen = canOpen;

    this.button = document.querySelector('#settingsButton');
    this.modal = document.querySelector('#settingsModal');
    this.backdrop = document.querySelector('#settingsBackdrop');
    this.closeButton = document.querySelector('#settingsCloseButton');
    this.applyButton = document.querySelector('#settingsApplyButton');
    this.resetButton = document.querySelector('#settingsResetButton');
    this.segmentList = document.querySelector('#segmentEditorList');
    this.addMoneyButton = document.querySelector('#addMoneySegment');
    this.addX2Button = document.querySelector('#addX2Segment');
    this.addX3Button = document.querySelector('#addX3Segment');

    this.startingSpins = document.querySelector('#settingStartingSpins');
    this.spinDuration = document.querySelector('#settingSpinDuration');
    this.spinDurationValue = document.querySelector('#settingSpinDurationValue');
    this.volume = document.querySelector('#settingVolume');
    this.volumeValue = document.querySelector('#settingVolumeValue');
    this.effects = document.querySelector('#settingEffects');
    this.presetButtons = [...document.querySelectorAll('.preset-card[data-preset]')];
    this.ambientMotion = document.querySelector('#settingAmbientMotion');
    this.showHistory = document.querySelector('#settingShowHistory');
    this.error = document.querySelector('#settingsError');

    this.draft = manager.get();
    this.bind();
  }

  bind() {
    this.button?.addEventListener('click', () => this.open());
    this.closeButton?.addEventListener('click', () => this.close());
    this.backdrop?.addEventListener('click', () => this.close());

    this.applyButton?.addEventListener('click', () => this.apply());
    this.resetButton?.addEventListener('click', () => {
      this.draft = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      this.render();
      this.showError('');
    });

    this.spinDuration?.addEventListener('input', () => {
      this.spinDurationValue.textContent = (Number(this.spinDuration.value) / 1000).toFixed(1) + ' s';
    });

    this.volume?.addEventListener('input', () => {
      this.volumeValue.textContent = Math.round(Number(this.volume.value) * 100) + ' %';
    });

    this.addMoneyButton?.addEventListener('click', () => this.addSegment('money', 20));
    this.addX2Button?.addEventListener('click', () => this.addSegment('multiplier', 2));
    this.addX3Button?.addEventListener('click', () => this.addSegment('multiplier', 3));

    this.presetButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const presetId = button.dataset.preset;
        this.draft = applyPresentationPreset(this.collect(), presetId);
        this.renderPresentationOnly();
      });
    });

    this.segmentList?.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-action="remove-segment"]');
      if (!remove) return;

      const row = remove.closest('.segment-editor');
      if (!row) return;

      const rows = [...this.segmentList.querySelectorAll('.segment-editor')];
      if (rows.length <= 6) {
        this.showError('Kolo musí mít alespoň 6 polí.');
        return;
      }

      row.remove();
      this.renumberRows();
    });

    this.segmentList?.addEventListener('change', (event) => {
      const row = event.target.closest('.segment-editor');
      if (!row) return;

      if (event.target.matches('[data-field="type"]')) {
        this.syncRowType(row);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  isOpen() {
    return this.modal?.classList.contains('is-open') ?? false;
  }

  open() {
    if (!this.canOpen()) return;
    this.draft = this.manager.get();
    this.render();
    this.modal?.classList.add('is-open');
    this.modal?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('settings-open');
    this.closeButton?.focus({ preventScroll: true });
  }

  close() {
    this.modal?.classList.remove('is-open');
    this.modal?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('settings-open');
    this.button?.focus({ preventScroll: true });
  }

  render() {
    const settings = this.draft;

    this.startingSpins.value = settings.startingSpins;
    this.spinDuration.value = settings.spinDurationMs;
    this.spinDurationValue.textContent = (settings.spinDurationMs / 1000).toFixed(1) + ' s';
    this.volume.value = settings.masterVolume;
    this.volumeValue.textContent = Math.round(settings.masterVolume * 100) + ' %';
    this.effects.value = settings.effects;
    this.ambientMotion.checked = settings.ambientMotion;
    this.showHistory.checked = settings.showHistory;
    this.renderPresetState(settings.presentationPreset);

    this.segmentList.innerHTML = '';
    settings.segments.forEach((segment, index) => {
      this.segmentList.insertAdjacentHTML('beforeend', this.segmentRowMarkup(segment, index));
    });

    this.renumberRows();
  }

  renderPresetState(presetId) {
    this.presetButtons.forEach((button) => {
      const active = button.dataset.preset === presetId;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  renderPresentationOnly() {
    this.effects.value = this.draft.effects;
    this.ambientMotion.checked = this.draft.ambientMotion;
    this.showHistory.checked = this.draft.showHistory;
    this.renderPresetState(this.draft.presentationPreset);
  }

  segmentRowMarkup(segment, index) {
    const isMultiplier = segment.type === 'multiplier';
    const numberValue = isMultiplier ? segment.multiplier : segment.value;
    const typeOptions = [
      ['money', 'Peníze'],
      ['multiplier', 'Násobič'],
    ].map(([value, label]) =>
      '<option value="' + value + '"' + (segment.type === value ? ' selected' : '') + '>' + label + '</option>',
    ).join('');

    const toneOptions = TONE_OPTIONS.map((tone) =>
      '<option value="' + tone + '"' + (segment.tone === tone ? ' selected' : '') + '>' + escapeHtml(TONE_LABELS[tone] ?? tone) + '</option>',
    ).join('');

    return `
      <div class="segment-editor" data-index="${index}">
        <div class="segment-editor__number">${index + 1}</div>

        <label class="segment-editor__field">
          <span>Typ</span>
          <select data-field="type">${typeOptions}</select>
        </label>

        <label class="segment-editor__field segment-editor__field--value">
          <span data-value-label>${isMultiplier ? 'Násobič' : 'Částka Kč'}</span>
          <input
            data-field="value"
            type="number"
            min="${isMultiplier ? 2 : 0}"
            max="${isMultiplier ? 10 : 100000}"
            step="1"
            value="${numberValue}"
          />
        </label>

        <label class="segment-editor__field">
          <span>Barva</span>
          <select data-field="tone">${toneOptions}</select>
        </label>

        <label class="segment-editor__toggle">
          <input data-field="extraSpins" type="checkbox" ${segment.extraSpins ? 'checked' : ''} />
          <span class="switch"></span>
          <span>+ SPIN</span>
        </label>

        <button
          class="segment-editor__remove"
          data-action="remove-segment"
          type="button"
          aria-label="Odstranit pole ${index + 1}"
          title="Odstranit pole"
        >×</button>
      </div>
    `;
  }

  syncRowType(row) {
    const type = row.querySelector('[data-field="type"]').value;
    const input = row.querySelector('[data-field="value"]');
    const label = row.querySelector('[data-value-label]');

    if (type === 'multiplier') {
      label.textContent = 'Násobič';
      input.min = '2';
      input.max = '10';
      if (Number(input.value) < 2 || Number(input.value) > 10) input.value = '2';
    } else {
      label.textContent = 'Částka Kč';
      input.min = '0';
      input.max = '100000';
      if (Number(input.value) < 0) input.value = '20';
    }
  }

  addSegment(type, value) {
    const count = this.segmentList.querySelectorAll('.segment-editor').length;
    if (count >= 24) {
      this.showError('Maximum je 24 polí.');
      return;
    }

    const segment = normalizeSegment({
      type,
      ...(type === 'multiplier' ? { multiplier: value } : { value }),
      extraSpins: 1,
      tone: TONE_OPTIONS[count % (TONE_OPTIONS.length - 1)],
    }, count);

    this.segmentList.insertAdjacentHTML('beforeend', this.segmentRowMarkup(segment, count));
    this.renumberRows();

    const newest = this.segmentList.lastElementChild;
    newest?.animate?.(
      [
        { opacity: 0, transform: 'translateY(8px) scale(.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ],
      { duration: 220, easing: 'cubic-bezier(.2,.8,.3,1)' },
    );
  }

  renumberRows() {
    [...this.segmentList.querySelectorAll('.segment-editor')].forEach((row, index) => {
      row.dataset.index = index;
      row.querySelector('.segment-editor__number').textContent = index + 1;
      const remove = row.querySelector('[data-action="remove-segment"]');
      remove.setAttribute('aria-label', 'Odstranit pole ' + (index + 1));
      remove.disabled = this.segmentList.children.length <= 6;
    });

    const count = this.segmentList.children.length;
    const countNode = document.querySelector('#segmentCount');
    if (countNode) countNode.textContent = count + ' polí';
  }

  collect() {
    const segments = [...this.segmentList.querySelectorAll('.segment-editor')].map((row, index) => {
      const type = row.querySelector('[data-field="type"]').value;
      const numberValue = Number(row.querySelector('[data-field="value"]').value);
      const extraSpins = row.querySelector('[data-field="extraSpins"]').checked ? 1 : 0;
      const tone = row.querySelector('[data-field="tone"]').value;

      const segment = normalizeSegment({
        type,
        ...(type === 'multiplier' ? { multiplier: numberValue } : { value: numberValue }),
        extraSpins,
        tone,
      }, index);

      segment.label = makeSegmentLabel(segment);
      return segment;
    });

    return {
      segments,
      startingSpins: Number(this.startingSpins.value),
      spinDurationMs: Number(this.spinDuration.value),
      masterVolume: Number(this.volume.value),
      effects: this.effects.value,
      ambientMotion: this.ambientMotion.checked,
      showHistory: this.showHistory.checked,
      presentationPreset: this.presetButtons.find((button) => button.classList.contains('is-active'))?.dataset.preset
        ?? this.draft.presentationPreset
        ?? 'arcade',
    };
  }

  apply() {
    const draft = this.collect();

    if (!draft.segments.some((segment) => segment.extraSpins === 0)) {
      this.showError('Alespoň jedno pole musí být bez +SPIN, jinak hra nikdy neskončí.');
      return;
    }

    const settings = this.manager.save(draft);
    this.showError('');
    this.onApply?.(settings);
    this.close();
  }

  showError(message) {
    if (!this.error) return;
    this.error.textContent = message;
    this.error.classList.toggle('is-visible', Boolean(message));
  }
}
