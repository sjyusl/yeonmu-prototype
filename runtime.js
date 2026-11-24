// 내안의연뮤 프로토타입: .dc.html 템플릿을 브라우저에서 바로 실행하는 경량 런타임 (React 18)
(function () {
  const load = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const ATTR = { class: 'className', for: 'htmlFor', onclick: 'onClick', onchange: 'onChange', onkeydown: 'onKeyDown', onscroll: 'onScroll', onfocus: 'onFocus', onblur: 'onBlur', onmousedown: 'onMouseDown', onmousemove: 'onMouseMove', onmouseup: 'onMouseUp', onmouseleave: 'onMouseLeave', onclickcapture: 'onClickCapture', onpointerdown: 'onPointerDown', onpointermove: 'onPointerMove', onpointerup: 'onPointerUp', onpointercancel: 'onPointerCancel', inputmode: 'inputMode', enterkeyhint: 'enterKeyHint', autocomplete: 'autoComplete', autofocus: 'autoFocus', maxlength: 'maxLength', tabindex: 'tabIndex', readonly: 'readOnly' };
  const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  function lookup(path, scope) {
    path = path.trim();
    if (path === 'true') return true; if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    let v = scope; for (const p of path.split('.')) { if (v == null) return undefined; v = v[p]; } return v;
  }
  function interp(str, scope) {
    const whole = str.match(/^\s*\{\{([^}]+)\}\}\s*$/);
    if (whole) return lookup(whole[1], scope);
    return str.replace(/\{\{([^}]+)\}\}/g, (_, p) => { const v = lookup(p, scope); return v == null ? '' : String(v); });
  }
  function styleObj(str) {
    const o = {};
    str.split(';').forEach((d) => { const i = d.indexOf(':'); if (i < 0) return; const k = d.slice(0, i).trim(); const v = d.slice(i + 1).trim(); if (!k) return; o[k.startsWith('--') ? k : camel(k)] = v; });
    return o;
  }
  function build(node, scope, key) {
    const h = React.createElement;
    if (node.nodeType === 3) { const t = node.nodeValue; return t.includes('{{') ? interp(t, scope) : t; }
    if (node.nodeType !== 1) return null;
    const tag = node.localName;
    const kids = (sc) => Array.from(node.childNodes).map((c, i) => build(c, sc, i));
    if (tag === 'sc-if') { const v = interp(node.getAttribute('value') || '', scope); return v ? h(React.Fragment, { key }, ...kids(scope)) : null; }
    if (tag === 'sc-for') {
      const list = interp(node.getAttribute('list') || '', scope) || []; const as = node.getAttribute('as') || 'item';
      return h(React.Fragment, { key }, ...list.map((it, i) => h(React.Fragment, { key: i }, ...kids(Object.assign({}, scope, { [as]: it, $index: i })))));
    }
    const props = { key };
    for (const a of Array.from(node.attributes)) {
      let n = a.name; if (n.startsWith('hint-')) continue;
      let v = a.value.includes('{{') ? interp(a.value, scope) : a.value;
      if (n === 'style') { props.style = styleObj(String(v)); continue; }
      n = ATTR[n] || (n.startsWith('aria-') || n.startsWith('data-') ? n : (n.includes('-') ? camel(n) : n));
      if (typeof v === 'boolean' && (n.startsWith('aria-'))) v = String(v);
      props[n] = v;
    }
    if ((tag === 'input' || tag === 'textarea') && 'value' in props && !props.onChange) props.readOnly = true;
    const children = (tag === 'input' || tag === 'img') ? [] : kids(scope);
    return h(tag, props, ...children);
  }
  document.addEventListener('DOMContentLoaded', async () => {
    await load('./vendor/react.production.min.js'); await load('./vendor/react-dom.production.min.js');
    const tplEl = document.querySelector('template#dc');
    const xdc = tplEl ? tplEl.content : document.querySelector('x-dc');
    const helmet = xdc.querySelector('helmet');
    if (helmet) { Array.from(helmet.children).forEach((c) => document.head.appendChild(c.cloneNode(true))); helmet.remove(); }
    const tpl = Array.from(xdc.childNodes).filter((n) => n.nodeType === 1);
    const sEl = document.querySelector('script[data-dc-script]');
    window.DCLogic = class extends React.Component {};
    const Component = new Function('React', sEl.textContent + '\n;return Component;')(React);
    class Host extends Component { render() { const v = this.renderVals(); return React.createElement(React.Fragment, null, ...tpl.map((n, i) => build(n, v, i))); } }
    const mount = document.createElement('div'); mount.id = 'root'; if (tplEl) tplEl.replaceWith(mount); else xdc.replaceWith(mount);
    const q = new URLSearchParams(location.search);
    ReactDOM.createRoot(mount).render(React.createElement(Host, { startScreen: q.get('start') || undefined }));
  });
})();
