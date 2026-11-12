import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import bodySrc from '../../../assets/typewriter/typewriter-body.webp';
import carriageSrc from '../../../assets/typewriter/typewriter-carriage.webp';
import paperSrc from '../../../assets/typewriter/typewriter-paper.webp';
import Icon from '../../common/Icon.jsx';
import { PAGE, ROW_STYLE, caretOffset, expandTabs, paginate } from '../../../utils/typewriterPages.js';
import { BODY_SIZE, CAP, KEYS, NAMEPLATE, SPACE, keyForEvent } from './keyLayout.js';

// ---------------------------------------------------------------------------------------------
// The typewriter writing surface.
//
// It edits the SAME Markdown as the document editor: `value` / `onChange` come straight from the
// article form. Keystrokes go into a real (transparent) textarea laid over the paper, so typing,
// pasting, undo, mobile keyboards and screen readers all behave like a normal text field.
// Everything visible (the paper, the carriage, the keys, the stack of pages) is DRAWN from the
// content; the animation can lag behind a large paste, but it never holds back or changes the text.
// ---------------------------------------------------------------------------------------------

// The scene is laid out in its own units and scaled to the width available.
// Wide enough for the carriage's full travel (about 195 units either way of centre). The workspace
// column is at most about 1000px wide, so the scene is shown at up to 1:1 and scaled down below that.
// Vertically there is room above the platen for a WHOLE page (44 margin + 506 of text = 550 units):
// a nearly full sheet keeps its first line in view while the newest line is being typed.
const LAYOUT = { W: 960, H: 1050, machine: { x: 120, y: 552, w: 700 }, carriageW: 560, stack: { x: 880, y: 962, scale: 0.25 }, tableTop: 750 };
const CARRIAGE_IMG = { width: 1600, height: 533, platenTop: 180, ribbon: { x: 530, y: 190, w: 550, h: 260 } };
const PLATEN_TOP = 590; // the paper disappears behind the platen here
const PAPER_LINE = 572; // the row being typed ends here, just above the paper bail (a full page then starts at 22)

function derive(L) {
  const f = L.machine.w / BODY_SIZE.width;
  const cs = L.carriageW / CARRIAGE_IMG.width;
  const printX = L.machine.x + L.machine.w / 2;
  return {
    ...L,
    f,
    cs,
    printX,
    machineH: BODY_SIZE.height * f,
    carriageH: CARRIAGE_IMG.height * cs,
    carriageTop: PLATEN_TOP - CARRIAGE_IMG.platenTop * cs,
    carriageLeft: printX - L.carriageW / 2,
  };
}

// A stack position for each finished page: slightly different, like real sheets dropped one by one.
function slot(L, i) {
  const rot = (((i * 37) % 11) - 5) * 0.85;
  const dx = (((i * 53) % 9) - 4) * 2.4;
  const dy = -Math.min(i, 30) * 1.1;
  return { cx: L.stack.x + dx, cy: L.stack.y + dy, rot };
}

// Browsers pause animations in background tabs. While the tab is hidden, pages go straight onto the
// stack instead of waiting mid-air for the tab to come back.
const usePageHidden = () => {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.visibilityState === 'hidden');
  useEffect(() => {
    const onChange = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return hidden;
};

const usePrefersReducedMotion = () => {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches));
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
};

// ----- Inline Markdown on paper: the marks stay visible (it is what was typed), lightly inked -----
const INLINE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]*\)|\*[^*\s][^*\n]*\*|_[^_\s][^_\n]*_)/g;

function inline(text) {
  const out = [];
  let last = 0;
  let k = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const t = match[0];
    if (t.startsWith('**') || t.startsWith('__')) {
      out.push(<span key={k++} className="tdk-mk">{t.slice(0, 2)}</span>, <strong key={k++}>{t.slice(2, -2)}</strong>, <span key={k++} className="tdk-mk">{t.slice(-2)}</span>);
    } else if (t.startsWith('`')) {
      out.push(<span key={k++} className="tdk-inline-code">{t}</span>);
    } else if (t.startsWith('[')) {
      const close = t.indexOf('](');
      out.push(<span key={k++} className="tdk-mk">[</span>, <span key={k++} className="tdk-link">{t.slice(1, close)}</span>, <span key={k++} className="tdk-mk">{t.slice(close)}</span>);
    } else {
      out.push(<span key={k++} className="tdk-mk">{t[0]}</span>, <em key={k++}>{t.slice(1, -1)}</em>, <span key={k++} className="tdk-mk">{t.slice(-1)}</span>);
    }
    last = match.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function rowContent(row) {
  if (row.kind === 'code' || row.kind === 'fence' || row.kind === 'cont') return expandTabs(row.text);
  if (row.kind.startsWith('h') && row.part === 0) {
    const marks = /^ {0,3}#{1,6}\s/.exec(row.text)?.[0] ?? '';
    return [<span key="m" className="tdk-mk">{marks}</span>, ...inline(row.text.slice(marks.length))];
  }
  if (row.kind === 'li' && row.part === 0) {
    const marker = /^\s*([-*+]|\d{1,9}[.)])\s+/.exec(row.text)?.[0] ?? '';
    return [<span key="m" className="tdk-bullet">{marker}</span>, ...inline(row.text.slice(marker.length))];
  }
  return inline(row.text);
}

const Row = memo(function Row({ row, caret }) {
  const style = ROW_STYLE[row.kind];
  return (
    <div className={`tdk-row tdk-${row.kind}${row.wrapped ? ' is-wrapped' : ''}`} style={{ height: style.height, fontSize: style.size, paddingLeft: row.indent ? `${row.indent}ch` : undefined }}>
      {rowContent(row)}
      {caret && <span className="tdk-caret" />}
    </div>
  );
});

// One sheet of paper with its typed rows.
const Sheet = memo(function Sheet({ page, caret = false, blank = false }) {
  const rows = page?.rows ?? [];
  return (
    <div className="tdk-sheet" style={{ width: PAGE.width, height: PAGE.height, backgroundImage: `url(${paperSrc})` }}>
      {!blank && (
        <div className="tdk-sheet-text" style={{ paddingTop: PAGE.marginTop, paddingLeft: PAGE.marginLeft }}>
          {rows.map((row, i) => (
            <Row key={i} row={row} caret={caret && i === rows.length - 1} />
          ))}
          {caret && rows.length === 0 && <Row row={{ kind: 'p', text: '', indent: 0, part: 0 }} caret />}
        </div>
      )}
    </div>
  );
});

export default function TypewriterDesk({ value, onChange, onSave, onReview, invalid, describedBy }) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const capRefs = useRef(new Map());
  const ribbonRef = useRef(null);
  const paperRef = useRef(null);
  const flyerRef = useRef(null);
  const lastTyped = useRef(0);
  const prevCarX = useRef(null);
  const reduced = usePrefersReducedMotion();
  const pageHidden = usePageHidden();

  const [box, setBox] = useState({ width: 1100 });
  const L = useMemo(() => derive(LAYOUT), []);
  const scale = Math.min(box.width / L.W, 1);

  // character width of the paper's monospace face, as a fraction of its size (measured once fonts load)
  const [charRatio, setCharRatio] = useState(0.6);
  const measureRef = useRef(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = measureRef.current;
      if (el && el.offsetWidth) setCharRatio(el.offsetWidth / 100 / 100);
    };
    measure();
    document.fonts?.ready.then(measure);
  }, []);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => setBox({ width: el.clientWidth || 1100 });
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ----- Pages: a pure function of the content -----
  const pages = useMemo(() => paginate(value), [value]);
  const last = pages.length - 1;
  // Finished pages on the table. Opening the typewriter restores the stack at once (no replay).
  const [stack, setStack] = useState(last);
  const [flying, setFlying] = useState(null); // { index, from: { left, top, hidden }, pace }
  const [leaving, setLeaving] = useState(false);

  const paperIndex = Math.min(flying ? flying.index + 1 : stack, last);
  const paperPage = pages[paperIndex];

  const carXFor = useCallback((page) => PAGE.width / 2 - PAGE.marginLeft - caretOffset(page, charRatio), [charRatio]);
  const paperTopFor = (page) => PAPER_LINE - PAGE.marginTop - page.used;

  const carX = carXFor(paperPage);
  const paperTop = paperTopFor(paperPage);
  // A carriage return (moving back to the right) is slow and smooth; each character is a short step.
  const returning = prevCarX.current !== null && carX - prevCarX.current > 24;
  useEffect(() => {
    prevCarX.current = carX;
  }, [carX]);

  // ----- Page ejection: one page at a time, as long as the content has more pages than the table -----
  useEffect(() => {
    if (flying) return undefined;
    if (stack > last) {
      setStack(last); // text was removed: those pages are no longer finished
      return undefined;
    }
    if (stack === last) return undefined;
    if (reduced || pageHidden) {
      setStack(last); // no flight (reduced motion, or a background tab): the pages are simply on the stack
      return undefined;
    }
    const backlog = last - stack;
    const pace = backlog > 6 ? 0.45 : backlog > 2 ? 0.7 : 1;
    const page = pages[stack];
    const timer = setTimeout(
      () =>
        setFlying({
          index: stack,
          pace,
          from: { left: L.printX - PAGE.width / 2 + carXFor(page), top: paperTopFor(page), hidden: Math.max(0, PAGE.height - (PLATEN_TOP + 2 - paperTopFor(page))) },
        }),
      // give a page that just filled up a moment to be seen full
      420 * pace
    );
    return () => clearTimeout(timer);
  }, [flying, stack, last, reduced, pageHidden, pages, L.printX, carXFor]);

  // The flight itself: out of the machine, across, and down onto the stack.
  useLayoutEffect(() => {
    const el = flyerRef.current;
    if (!flying || !el) return undefined;
    const { from, index, pace } = flying;
    if (typeof el.animate !== 'function') {
      // no Web Animations support: the page simply joins the stack
      setStack(index + 1);
      setFlying(null);
      return undefined;
    }
    const s = slot(L, index);
    const S = L.stack.scale;
    const startCx = from.left + PAGE.width / 2;
    const startCy = from.top + PAGE.height / 2;
    const rise = from.hidden + 36;
    const endX = s.cx - startCx;
    const endY = s.cy - startCy;
    const midX = endX * 0.72;
    const midY = -rise - 70;
    const t = (x, y, r, sc) => `translate(${x}px, ${y}px) rotate(${r}deg) scale(${sc})`;
    const anim = el.animate(
      [
        { offset: 0, transform: t(0, 0, 0, 1), clipPath: `inset(0 0 ${from.hidden}px 0)`, zIndex: 3, easing: 'cubic-bezier(0.3, 0, 0.2, 1)' },
        { offset: 0.26, transform: t(0, -rise, -1.5, 0.97), clipPath: 'inset(0 0 0px 0)', zIndex: 3 },
        { offset: 0.27, transform: t(0, -rise, -1.5, 0.97), clipPath: 'inset(0 0 0px 0)', zIndex: 9, easing: 'cubic-bezier(0.4, 0, 0.3, 1)' },
        { offset: 0.6, transform: t(midX, midY, s.rot * 0.4 + 4, (1 + S) / 2), clipPath: 'inset(0 0 0px 0)', zIndex: 9, easing: 'cubic-bezier(0.5, 0, 0.75, 0.6)' },
        { offset: 0.9, transform: t(endX, endY - 5, s.rot, S), clipPath: 'inset(0 0 0px 0)', zIndex: 9, easing: 'cubic-bezier(0.2, 0.6, 0.3, 1)' },
        { offset: 1, transform: t(endX, endY, s.rot, S), clipPath: 'inset(0 0 0px 0)', zIndex: 9 },
      ],
      { duration: 1700 * pace, fill: 'forwards' }
    );
    // The next sheet feeds in from behind the platen while this one flies.
    paperRef.current?.animate?.([{ transform: 'translateY(150px)' }, { transform: 'translateY(0)' }], { duration: 700 * pace, delay: 450 * pace, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'backwards' });
    let cancelled = false;
    // the tab went to the background mid-flight: land the page now rather than leave it in the air
    const onHide = () => document.visibilityState === 'hidden' && anim.finish();
    document.addEventListener('visibilitychange', onHide);
    anim.finished
      .then(() => {
        if (cancelled) return;
        setStack(index + 1);
        setFlying(null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onHide);
      anim.cancel();
    };
  }, [flying, L]);

  // ----- Keys -----
  const press = useCallback(
    (id, depth = 1) => {
      if (reduced || !id) return;
      const el = capRefs.current.get(id);
      if (!el || typeof el.animate !== 'function') return;
      const d = 2.2 + Math.random() * 1.4;
      el.animate(
        [
          { transform: 'translateY(0) scale(1)', filter: 'brightness(1)' },
          { transform: `translateY(${d * depth}px) scale(${1 - 0.03 * depth})`, filter: `brightness(${1 - 0.18 * depth})`, offset: 0.35 },
          { transform: 'translateY(0) scale(1)', filter: 'brightness(1)' },
        ],
        { duration: 120 + Math.random() * 70, easing: 'cubic-bezier(0.3, 0, 0.3, 1)' }
      );
    },
    [reduced]
  );
  const strike = useCallback(() => {
    if (reduced) return;
    ribbonRef.current?.animate?.([{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)', offset: 0.4 }, { transform: 'translateY(0)' }], { duration: 110, easing: 'ease-out' });
  }, [reduced]);

  // Now and then, while nobody types, one key settles a little: the machine is not a still image.
  useEffect(() => {
    if (reduced) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible' || Date.now() - lastTyped.current < 9000) return;
      const letters = KEYS.filter((k) => k.chars);
      press(letters[Math.floor(Math.random() * letters.length)].id, 0.35);
    }, 11000);
    return () => clearInterval(timer);
  }, [press, reduced]);

  // ----- Input -----
  const caretToEnd = () => {
    const el = inputRef.current;
    if (el) el.setSelectionRange(el.value.length, el.value.length);
  };

  const handleKeyDown = (event) => {
    const mod = event.metaKey || event.ctrlKey;
    if (mod && !event.altKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      onSave?.();
      return;
    }
    if (mod) return; // undo, select all, copy, paste: the textarea's own behaviour
    // A typewriter writes forward. Earlier text is edited in the document view.
    if (/^(Arrow|Home$|End$|Page)/.test(event.key)) {
      event.preventDefault();
      caretToEnd();
      return;
    }
    lastTyped.current = Date.now();
    if (event.key === 'Enter') return; // the carriage return follows from the new line
    const id = keyForEvent(event);
    if (event.shiftKey && event.key.length === 1) press('shift', 0.7);
    press(id);
    if (event.key.length === 1 && event.key !== ' ') strike();
  };

  const review = () => {
    if (reduced) {
      onReview();
      return;
    }
    setLeaving(true);
    setTimeout(onReview, 380);
  };

  const finished = Math.min(stack, last);
  const S = L.stack.scale;
  const firstShown = Math.max(0, finished - 12);

  return (
    <div className={`tdk-desk${leaving ? ' is-leaving' : ''}${invalid ? ' is-invalid' : ''}`} ref={wrapRef}>
      <div className="tdk-bar">
        <p className="tdk-bar-status" aria-live="polite">
          Page {paperIndex + 1} of {pages.length}
          {finished > 0 && <span> · {finished === 1 ? '1 finished page' : `${finished} finished pages`}</span>}
        </p>
        <button type="button" className="btn btn-secondary tdk-review" onClick={review}>
          <Icon name="file-text" size={16} />
          Review full article
        </button>
      </div>

      <div className="tdk-viewport" style={{ height: L.H * scale }}>
        <div className="tdk-scene" style={{ width: L.W, height: L.H, transform: `scale(${scale})` }}>
          <div className="tdk-wall" />
          <div className="tdk-table" style={{ top: L.tableTop }} />
          <span className="tdk-measure" ref={measureRef} aria-hidden="true">
            {'0'.repeat(100)}
          </span>

          {/* finished pages, lying on the table */}
          {finished === 0 && (
            <p className="tdk-stack-hint" style={{ left: L.stack.x, top: L.stack.y }} aria-hidden="true">
              Finished pages land here
            </p>
          )}
          {Array.from({ length: finished - firstShown }, (_, n) => {
            const i = firstShown + n;
            const s = slot(L, i);
            return (
              <div
                key={i}
                className="tdk-stack-sheet"
                style={{ left: s.cx - PAGE.width / 2, top: s.cy - PAGE.height / 2, transform: `rotate(${s.rot}deg) scale(${S})` }}
                aria-hidden="true"
              >
                <Sheet page={pages[i]} blank={i < finished - 1} />
              </div>
            );
          })}

          {/* the sheet in the machine: only the part above the platen is visible */}
          <div className="tdk-paper-window" style={{ height: PLATEN_TOP + 2 }} aria-hidden="true">
            <div className={`tdk-paper-slide${returning ? ' is-returning' : ''}`} style={{ transform: `translateX(${carX}px)` }}>
              <div key={paperIndex} ref={paperRef} className="tdk-paper" style={{ left: L.printX - PAGE.width / 2, top: paperTop }}>
                <Sheet page={paperPage} caret />
              </div>
            </div>
          </div>

          {flying && (
            <div ref={flyerRef} className="tdk-flyer" style={{ left: flying.from.left, top: flying.from.top }} aria-hidden="true">
              <Sheet page={pages[flying.index]} />
            </div>
          )}

          <div className="tdk-machine-shadow" style={{ left: L.machine.x + 30, top: L.machine.y + L.machineH - 60, width: L.machine.w - 60 }} />

          <img
            className={`tdk-carriage${returning ? ' is-returning' : ''}`}
            src={carriageSrc}
            alt=""
            draggable="false"
            style={{ left: L.carriageLeft, top: L.carriageTop, width: L.carriageW, transform: `translateX(${carX}px)` }}
          />

          <div className="tdk-machine" style={{ left: L.machine.x, top: L.machine.y, width: L.machine.w, height: L.machineH }}>
            <img className="tdk-body" src={bodySrc} alt="" draggable="false" />
            <span
              className="tdk-nameplate"
              style={{ left: NAMEPLATE.x0 * L.f, top: NAMEPLATE.y0 * L.f, width: (NAMEPLATE.x1 - NAMEPLATE.x0) * L.f, height: (NAMEPLATE.y1 - NAMEPLATE.y0) * L.f, fontSize: 30 * L.f }}
            >
              DEVPRESS
            </span>
            {KEYS.map((key) => {
              const rx = key.rx ?? CAP.rx;
              const ry = key.ry ?? CAP.ry;
              const box = { left: (key.x - rx) * L.f, top: (key.y - ry) * L.f, width: rx * 2 * L.f, height: ry * 2 * L.f };
              return (
                <span key={key.id}>
                  <span className="tdk-key-well" style={box} />
                  <span
                    className="tdk-key"
                    ref={(el) => (el ? capRefs.current.set(key.id, el) : capRefs.current.delete(key.id))}
                    style={{
                      ...box,
                      backgroundImage: `url(${bodySrc})`,
                      backgroundSize: `${L.machine.w}px ${L.machineH}px`,
                      backgroundPosition: `${-box.left}px ${-box.top}px`,
                    }}
                  />
                </span>
              );
            })}
            {(() => {
              const box = { left: SPACE.x0 * L.f, top: SPACE.y0 * L.f, width: (SPACE.x1 - SPACE.x0) * L.f, height: (SPACE.y1 - SPACE.y0) * L.f };
              return (
                <>
                  <span className="tdk-key-well tdk-space-well" style={box} />
                  <span
                    className="tdk-key tdk-space"
                    ref={(el) => (el ? capRefs.current.set('space', el) : capRefs.current.delete('space'))}
                    style={{ ...box, backgroundImage: `url(${bodySrc})`, backgroundSize: `${L.machine.w}px ${L.machineH}px`, backgroundPosition: `${-box.left}px ${-box.top}px` }}
                  />
                </>
              );
            })()}
          </div>

          {/* the ribbon guide stays at the printing point while the carriage moves behind it */}
          <span
            ref={ribbonRef}
            className="tdk-ribbon"
            style={{
              left: L.carriageLeft + CARRIAGE_IMG.ribbon.x * L.cs,
              top: L.carriageTop + CARRIAGE_IMG.ribbon.y * L.cs,
              width: CARRIAGE_IMG.ribbon.w * L.cs,
              height: CARRIAGE_IMG.ribbon.h * L.cs,
              backgroundImage: `url(${carriageSrc})`,
              backgroundSize: `${L.carriageW}px ${L.carriageH}px`,
              backgroundPosition: `${-CARRIAGE_IMG.ribbon.x * L.cs}px ${-CARRIAGE_IMG.ribbon.y * L.cs}px`,
            }}
            aria-hidden="true"
          />

          {/* the stack is a button: it opens the whole article */}
          <button
            type="button"
            className="tdk-stack-button"
            style={{ left: L.stack.x - (PAGE.width * S) / 2 - 24, top: L.stack.y - (PAGE.height * S) / 2 - 40, width: PAGE.width * S + 48, height: PAGE.height * S + 64 }}
            onClick={review}
            aria-label={`Review the full article${finished ? ` (${finished === 1 ? '1 finished page' : `${finished} finished pages`})` : ''}`}
          />

          {/* the real text field: transparent, over the paper */}
          <label htmlFor="post-content" className="visually-hidden">
            Article content (Markdown), typed on the typewriter
          </label>
          <textarea
            id="post-content"
            name="content"
            ref={inputRef}
            className="tdk-input"
            style={{ left: L.printX - 300, width: 600, height: PLATEN_TOP }}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setTimeout(caretToEnd, 0)}
            onMouseDown={(event) => {
              event.preventDefault();
              inputRef.current?.focus();
              caretToEnd();
            }}
            spellCheck="false"
            autoCapitalize="sentences"
            aria-invalid={invalid ? 'true' : 'false'}
            aria-describedby={['tdk-help', describedBy].filter(Boolean).join(' ')}
          />
        </div>
      </div>
      <p className="tdk-help" id="tdk-help">
        Click the paper and type, or paste a whole article: it is accepted at once and the pages catch up. The typewriter writes forward; to change earlier text, open the full article.
      </p>
    </div>
  );
}
