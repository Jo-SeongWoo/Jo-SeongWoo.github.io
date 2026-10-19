(function() {
  "use strict";
  const IN_FRAME = function() {
    try {
      return window.self !== window.top;
    } catch (_) {
      return true;
    }
  }();
  const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  let toastTimer = null;
  function demoToast(text) {
    const el = document.getElementById("copyToast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout((() => el.classList.remove("show")), 2200);
  }
  window.__ctDemoToast = demoToast;
  const MSG_NO_QUERY = "체험판에서는 실제 조회를 하지 않습니다";
  const MSG_NO_OPEN = "체험판에서는 실제 전산 페이지를 열지 않습니다";
  const changeListeners = [];
  function makeArea(areaName) {
    const store = Object.create(null);
    function pick(keys) {
      const out = {};
      if (keys == null) {
        for (const k in store) out[k] = clone(store[k]);
        return out;
      }
      if (typeof keys === "string") keys = [ keys ];
      if (Array.isArray(keys)) {
        for (const k of keys) if (k in store) out[k] = clone(store[k]);
        return out;
      }
      if (typeof keys === "object") {
        for (const k in keys) out[k] = k in store ? clone(store[k]) : clone(keys[k]);
      }
      return out;
    }
    function fire(changes) {
      if (!Object.keys(changes).length) return;
      setTimeout((() => {
        for (const fn of changeListeners.slice()) {
          try {
            fn(clone(changes), areaName);
          } catch (e) {
            console.error(e);
          }
        }
      }), 0);
    }
    function finish(cb, value) {
      if (typeof cb === "function") {
        setTimeout((() => cb(value)), 0);
        return undefined;
      }
      return Promise.resolve(value);
    }
    return {
      get(keys, cb) {
        return finish(cb, pick(keys));
      },
      set(items, cb) {
        const ch = {};
        for (const k in items || {}) {
          const nv = clone(items[k]);
          ch[k] = {
            oldValue: clone(store[k]),
            newValue: clone(nv)
          };
          store[k] = nv;
        }
        fire(ch);
        return finish(cb, undefined);
      },
      remove(keys, cb) {
        const ch = {};
        for (const k of Array.isArray(keys) ? keys : [ keys ]) {
          if (k in store) {
            ch[k] = {
              oldValue: clone(store[k])
            };
            delete store[k];
          }
        }
        fire(ch);
        return finish(cb, undefined);
      },
      clear(cb) {
        const ch = {};
        for (const k in store) {
          ch[k] = {
            oldValue: clone(store[k])
          };
          delete store[k];
        }
        fire(ch);
        return finish(cb, undefined);
      },
      getBytesInUse(_k, cb) {
        return finish(cb, 0);
      }
    };
  }
  function makeEvent() {
    const arr = [];
    return {
      _list: arr,
      addListener(fn) {
        if (typeof fn === "function" && !arr.includes(fn)) arr.push(fn);
      },
      removeListener(fn) {
        const i = arr.indexOf(fn);
        if (i >= 0) arr.splice(i, 1);
      },
      hasListener(fn) {
        return arr.includes(fn);
      }
    };
  }
  const onMessage = makeEvent();
  function sendMessage(a, b, c) {
    const msg = typeof a === "string" && b && typeof b === "object" ? b : a;
    const cb = [ a, b, c ].find((x => typeof x === "function"));
    const p = new Promise((resolve => {
      Promise.resolve().then((() => {
        let settled = false;
        let waits = false;
        const respond = v => {
          if (!settled) {
            settled = true;
            resolve(clone(v));
          }
        };
        for (const fn of onMessage._list.slice()) {
          let ret;
          try {
            ret = fn(clone(msg), {
              id: "crosstrack-demo"
            }, respond);
          } catch (e) {
            console.error(e);
          }
          if (ret === true) waits = true;
          if (settled) return;
        }
        if (!waits) respond(undefined);
      }));
    }));
    if (cb) {
      p.then(cb);
      return undefined;
    }
    return p;
  }
  const fakeChrome = {
    runtime: {
      id: "crosstrack-demo",
      lastError: undefined,
      getManifest: () => ({
        manifest_version: 3,
        name: "CrossTrack 체험판",
        version: "4.15.0"
      }),
      getURL: p => new URL(p, location.href).href,
      sendMessage: sendMessage,
      onMessage: onMessage,
      onInstalled: makeEvent(),
      onStartup: makeEvent()
    },
    storage: {
      local: makeArea("local"),
      session: makeArea("session"),
      sync: makeArea("sync"),
      onChanged: {
        addListener(fn) {
          if (typeof fn === "function") changeListeners.push(fn);
        },
        removeListener(fn) {
          const i = changeListeners.indexOf(fn);
          if (i >= 0) changeListeners.splice(i, 1);
        },
        hasListener(fn) {
          return changeListeners.includes(fn);
        }
      }
    },
    tabs: {
      create(opts) {
        const url = opts && opts.url;
        const w = typeof window.__ctOpenTrace === "function" && url ? window.__ctOpenTrace(url) : null;
        if (!w) demoToast("새 탭을 열지 못했습니다 — 브라우저의 팝업 차단을 확인해 주세요");
        return Promise.resolve({
          id: -1,
          active: false
        });
      },
      query() {
        return Promise.resolve([]);
      }
    },
    action: {
      setBadgeText() {
        return Promise.resolve();
      },
      setBadgeBackgroundColor() {
        return Promise.resolve();
      }
    },
    sidePanel: {
      setPanelBehavior() {
        return Promise.resolve();
      },
      open() {
        return Promise.resolve();
      }
    }
  };
  try {
    Object.defineProperty(window, "chrome", {
      value: fakeChrome,
      configurable: true,
      writable: true,
      enumerable: true
    });
  } catch (_) {
    window.chrome = fakeChrome;
  }
  if (window.chrome !== fakeChrome) console.error("[체험판] chrome 흉내 객체를 붙이지 못했습니다");
  const blockedLog = [];
  window.__ctBlockedRequests = blockedLog;
  function blockedError(kind, url) {
    blockedLog.push({
      kind: kind,
      url: String(url)
    });
    return new TypeError("체험판: 바깥 요청을 막았습니다 (" + kind + ") " + url);
  }
  window.fetch = function(input) {
    const url = typeof input === "string" ? input : input && input.url || String(input);
    return Promise.reject(blockedError("fetch", url));
  };
  function BlockedXHR() {
    this.readyState = 0;
    this.status = 0;
    this.response = null;
    this.responseText = "";
    this._listeners = {};
  }
  BlockedXHR.prototype.open = function(m, u) {
    this._url = u;
    this.readyState = 1;
  };
  BlockedXHR.prototype.setRequestHeader = function() {};
  BlockedXHR.prototype.getAllResponseHeaders = function() {
    return "";
  };
  BlockedXHR.prototype.getResponseHeader = function() {
    return null;
  };
  BlockedXHR.prototype.overrideMimeType = function() {};
  BlockedXHR.prototype.abort = function() {};
  BlockedXHR.prototype.addEventListener = function(t, fn) {
    (this._listeners[t] = this._listeners[t] || []).push(fn);
  };
  BlockedXHR.prototype.removeEventListener = function(t, fn) {
    const a = this._listeners[t] || [];
    const i = a.indexOf(fn);
    if (i >= 0) a.splice(i, 1);
  };
  BlockedXHR.prototype.send = function() {
    blockedError("xhr", this._url);
    const self = this;
    setTimeout((() => {
      self.readyState = 4;
      [ "readystatechange", "error", "loadend" ].forEach((t => {
        const ev = {
          type: t,
          target: self
        };
        const h = self["on" + t];
        if (typeof h === "function") {
          try {
            h.call(self, ev);
          } catch (e) {
            console.error(e);
          }
        }
        (self._listeners[t] || []).forEach((fn => {
          try {
            fn.call(self, ev);
          } catch (e) {
            console.error(e);
          }
        }));
      }));
    }), 0);
  };
  BlockedXHR.UNSENT = 0;
  BlockedXHR.OPENED = 1;
  BlockedXHR.HEADERS_RECEIVED = 2;
  BlockedXHR.LOADING = 3;
  BlockedXHR.DONE = 4;
  window.XMLHttpRequest = BlockedXHR;
  window.WebSocket = function(url) {
    throw blockedError("websocket", url);
  };
  window.EventSource = function(url) {
    throw blockedError("eventsource", url);
  };
  try {
    Object.defineProperty(navigator, "sendBeacon", {
      value: function(url) {
        blockedError("beacon", url);
        return false;
      },
      configurable: true
    });
  } catch (_) {}
  const realOpen = window.open ? window.open.bind(window) : null;
  window.__ctOpenLocal = function(path) {
    if (!realOpen || !/^trace\.html#/.test(String(path))) return null;
    return realOpen(path, "_blank") || null;
  };
  window.open = function(url) {
    blockedError("window.open", url);
    demoToast(MSG_NO_OPEN);
    return null;
  };
  window.close = function() {};
  if (IN_FRAME) {
    const origFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function(opts) {
      if (!document.hasFocus()) return;
      return origFocus.call(this, Object.assign({
        preventScroll: true
      }, opts || {}));
    };
    Element.prototype.scrollIntoView = function(arg) {
      const o = arg && typeof arg === "object" ? arg : {};
      const block = o.block || (arg === false ? "end" : "start");
      let p = this.parentElement;
      while (p && p !== document.body && p !== document.documentElement) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight) break;
        p = p.parentElement;
      }
      const isDoc = !p || p === document.body || p === document.documentElement;
      const sc = isDoc ? document.scrollingElement || document.documentElement : p;
      const er = this.getBoundingClientRect();
      const pr = isDoc ? {
        top: 0,
        bottom: window.innerHeight,
        height: window.innerHeight
      } : sc.getBoundingClientRect();
      let delta;
      if (block === "center") delta = er.top + er.height / 2 - (pr.top + pr.height / 2); else if (block === "end") delta = er.bottom - pr.bottom; else if (block === "nearest") delta = er.top < pr.top ? er.top - pr.top : er.bottom > pr.bottom ? er.bottom - pr.bottom : 0; else delta = er.top - pr.top;
      sc.scrollTo({
        top: sc.scrollTop + delta,
        behavior: o.behavior === "smooth" ? "smooth" : "auto"
      });
    };
  }
  window.__ctDemoMessages = {
    MSG_NO_QUERY: MSG_NO_QUERY,
    MSG_NO_OPEN: MSG_NO_OPEN
  };
})();
