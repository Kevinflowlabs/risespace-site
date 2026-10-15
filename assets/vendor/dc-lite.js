/* dc-lite: renders a canvas artboard (template + Component class) with React, so the
   standalone site behaves exactly like the canvas: loops, conditionals, holes, events. */
(function () {
  var h = React.createElement;
  var BOOL = { muted: 1, loop: 1, autoplay: 1, playsinline: 1, controls: 1, open: 1, required: 1, checked: 1, disabled: 1, hidden: 1, selected: 1, multiple: 1, readonly: 1, novalidate: 1 };
  var RENAME = { 'class': 'className', 'for': 'htmlFor', tabindex: 'tabIndex', autoplay: 'autoPlay', playsinline: 'playsInline',
    autocomplete: 'autoComplete', readonly: 'readOnly', maxlength: 'maxLength', novalidate: 'noValidate', crossorigin: 'crossOrigin',
    srcset: 'srcSet', checked: 'defaultChecked', enctype: 'encType', spellcheck: 'spellCheck' };
  var EVENTS = { click: 'Click', submit: 'Submit', change: 'Change', input: 'Input', mouseenter: 'MouseEnter', mouseleave: 'MouseLeave',
    keydown: 'KeyDown', keyup: 'KeyUp', focus: 'Focus', blur: 'Blur', pointerdown: 'PointerDown', pointerup: 'PointerUp', toggle: 'Toggle' };
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var VOID = { img: 1, input: 1, br: 1, hr: 1, source: 1, meta: 1, link: 1, area: 1, col: 1, embed: 1, track: 1, wbr: 1 };

  function look(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return parseFloat(path);
    var parts = path.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function interp(str, scope) {
    return str.replace(HOLE, function (m, p) { var v = look(p, scope); return v == null ? '' : String(v); });
  }
  function value(str, scope) {
    var m = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/.exec(str);
    return m ? look(m[1], scope) : (str.indexOf('{{') > -1 ? interp(str, scope) : str);
  }
  function camel(s) { return s.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); }); }
  function styleObj(str) {
    var o = {};
    String(str).split(';').forEach(function (d) {
      var i = d.indexOf(':'); if (i < 0) return;
      var k = d.slice(0, i).trim(), v = d.slice(i + 1).trim(); if (!k) return;
      o[k.indexOf('--') === 0 ? k : camel(k)] = v;
    });
    return o;
  }
  function child(scope, extra) { var s = Object.create(scope); for (var k in extra) s[k] = extra[k]; return s; }

  function kids(node, scope) {
    var out = [];
    for (var i = 0; i < node.childNodes.length; i++) {
      var r = walk(node.childNodes[i], scope, i);
      if (r == null || r === '') continue;
      out.push(r);
    }
    return out;
  }
  function walk(node, scope, key) {
    if (node.nodeType === 3) { var t = node.nodeValue; return t.indexOf('{{') > -1 ? interp(t, scope) : t; }
    if (node.nodeType !== 1) return null;
    var tag = node.localName;
    if (tag === 'sc-for') {
      var list = value(node.getAttribute('list') || '', scope) || [], as = node.getAttribute('as') || 'item';
      return h(React.Fragment, { key: key }, list.map(function (item, i) {
        var s = {}; s[as] = item; s.$index = i;
        return h(React.Fragment, { key: i }, kids(node, child(scope, s)));
      }));
    }
    if (tag === 'sc-if') {
      return value(node.getAttribute('value') || '', scope) ? h(React.Fragment, { key: key }, kids(node, scope)) : null;
    }
    var props = { key: key };
    for (var a = 0; a < node.attributes.length; a++) {
      var at = node.attributes[a], name = at.name, raw = at.value;
      if (name.indexOf('hint-') === 0) continue;
      var v = value(raw, scope);
      if (name === 'style') { props.style = styleObj(v); continue; }
      if (name === 'ref') { props.ref = v; continue; }
      if (name.indexOf('on') === 0 && EVENTS[name.slice(2)]) { if (typeof v === 'function') props['on' + EVENTS[name.slice(2)]] = v; continue; }
      if (BOOL[name] && raw === '') v = true;
      if (RENAME[name]) name = RENAME[name];
      else if (name.indexOf('-') > 0 && name.indexOf('data-') !== 0 && name.indexOf('aria-') !== 0) name = camel(name);
      props[name] = v;
    }
    if (VOID[tag]) return h(tag, props);
    return h.apply(null, [tag, props].concat(kids(node, scope)));
  }

  var TPL = null;
  window.DCLogic = class DCLogic extends React.Component {
    render() { var vals = this.renderVals ? this.renderVals() : {}; return h(React.Fragment, null, kids(TPL, vals)); }
  };
  window.mountArtboard = function (tplId, mountId, Component) {
    TPL = document.getElementById(tplId).content;
    ReactDOM.createRoot(document.getElementById(mountId)).render(h(Component, {}));
  };
})();
