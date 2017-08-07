'use strict';

(function () {
  'use strict';

  var userPolymer = window.Polymer;
  window.Polymer = function (info) {
    return window.Polymer._polymerFn(info);
  };
  if (userPolymer) {
    Object.assign(Polymer, userPolymer);
  }
  window.Polymer._polymerFn = function (info) {
    throw new Error('Load polymer.html to use the Polymer() function.');
  };
  window.Polymer.version = '2.0.1';
  window.JSCompiler_renameProperty = function (prop, obj) {
    return prop;
  };
})();

(function () {
  'use strict';

  var CSS_URL_RX = /(url\()([^)]*)(\))/g;
  var ABS_URL = /(^\/)|(^#)|(^[\w-\d]*:)/;
  var workingURL = void 0;
  var resolveDoc = void 0;
  function resolveUrl(url, baseURI) {
    if (url && ABS_URL.test(url)) {
      return url;
    }
    if (workingURL === undefined) {
      workingURL = false;
      try {
        var u = new URL('b', 'http://a');
        u.pathname = 'c%20d';
        workingURL = u.href === 'http://a/c%20d';
      } catch (e) {}
    }
    if (!baseURI) {
      baseURI = document.baseURI || window.location.href;
    }
    if (workingURL) {
      return new URL(url, baseURI).href;
    }
    if (!resolveDoc) {
      resolveDoc = document.implementation.createHTMLDocument('temp');
      resolveDoc.base = resolveDoc.createElement('base');
      resolveDoc.head.appendChild(resolveDoc.base);
      resolveDoc.anchor = resolveDoc.createElement('a');
      resolveDoc.body.appendChild(resolveDoc.anchor);
    }
    resolveDoc.base.href = baseURI;
    resolveDoc.anchor.href = url;
    return resolveDoc.anchor.href || url;
  }
  function resolveCss(cssText, baseURI) {
    return cssText.replace(CSS_URL_RX, function (m, pre, url, post) {
      return pre + '\'' + resolveUrl(url.replace(/["']/g, ''), baseURI) + '\'' + post;
    });
  }
  function pathFromUrl(url) {
    return url.substring(0, url.lastIndexOf('/') + 1);
  }
  Polymer.ResolveUrl = {
    resolveCss: resolveCss,
    resolveUrl: resolveUrl,
    pathFromUrl: pathFromUrl
  };
})();

(function () {
  'use strict';

  var settings = Polymer.Settings || {};
  settings.useShadow = !window.ShadyDOM;
  settings.useNativeCSSProperties = Boolean(!window.ShadyCSS || window.ShadyCSS.nativeCss);
  settings.useNativeCustomElements = !window.customElements.polyfillWrapFlushCallback;
  Polymer.Settings = settings;
  var rootPath = Polymer.rootPath || Polymer.ResolveUrl.pathFromUrl(document.baseURI || window.location.href);
  Polymer.rootPath = rootPath;
  Polymer.setRootPath = function (path) {
    Polymer.rootPath = path;
  };
})();

(function () {
  'use strict';

  var dedupeId = 0;
  function MixinFunction() {}
  MixinFunction.prototype.__mixinApplications;
  MixinFunction.prototype.__mixinSet;
  Polymer.dedupingMixin = function (mixin) {
    var mixinApplications = mixin.__mixinApplications;
    if (!mixinApplications) {
      mixinApplications = new WeakMap();
      mixin.__mixinApplications = mixinApplications;
    }
    var mixinDedupeId = dedupeId++;
    function dedupingMixin(base) {
      var baseSet = base.__mixinSet;
      if (baseSet && baseSet[mixinDedupeId]) {
        return base;
      }
      var map = mixinApplications;
      var extended = map.get(base);
      if (!extended) {
        extended = mixin(base);
        map.set(base, extended);
      }
      var mixinSet = Object.create(extended.__mixinSet || baseSet || null);
      mixinSet[mixinDedupeId] = true;
      extended.__mixinSet = mixinSet;
      return extended;
    }
    return dedupingMixin;
  };
})();

(function () {
  'use strict';

  var caseMap = {};
  var DASH_TO_CAMEL = /-[a-z]/g;
  var CAMEL_TO_DASH = /([A-Z])/g;
  var CaseMap = {
    dashToCamelCase: function dashToCamelCase(dash) {
      return caseMap[dash] || (caseMap[dash] = dash.indexOf('-') < 0 ? dash : dash.replace(DASH_TO_CAMEL, function (m) {
        return m[1].toUpperCase();
      }));
    },
    camelToDashCase: function camelToDashCase(camel) {
      return caseMap[camel] || (caseMap[camel] = camel.replace(CAMEL_TO_DASH, '-$1').toLowerCase());
    }
  };
  Polymer.CaseMap = CaseMap;
})();

(function () {
  'use strict';

  var MODULE_STYLE_LINK_SELECTOR = 'link[rel=import][type~=css]';
  var INCLUDE_ATTR = 'include';
  function importModule(moduleId) {
    if (!Polymer.DomModule) {
      return null;
    }
    return Polymer.DomModule.import(moduleId);
  }
  var templateWithAssetPath = void 0;
  var StyleGather = {
    cssFromModules: function cssFromModules(moduleIds) {
      var modules = moduleIds.trim().split(' ');
      var cssText = '';
      for (var i = 0; i < modules.length; i++) {
        cssText += this.cssFromModule(modules[i]);
      }
      return cssText;
    },
    cssFromModule: function cssFromModule(moduleId) {
      var m = importModule(moduleId);
      if (m && m._cssText === undefined) {
        var cssText = '';
        var t = m.querySelector('template');
        if (t) {
          cssText += this.cssFromTemplate(t, m.assetpath);
        }
        cssText += this.cssFromModuleImports(moduleId);
        m._cssText = cssText || null;
      }
      if (!m) {
        console.warn('Could not find style data in module named', moduleId);
      }
      return m && m._cssText || '';
    },
    cssFromTemplate: function cssFromTemplate(template, baseURI) {
      var cssText = '';
      var e$ = template.content.querySelectorAll('style');
      for (var i = 0; i < e$.length; i++) {
        var e = e$[i];
        var include = e.getAttribute(INCLUDE_ATTR);
        if (include) {
          cssText += this.cssFromModules(include);
        }
        e.parentNode.removeChild(e);
        cssText += baseURI ? Polymer.ResolveUrl.resolveCss(e.textContent, baseURI) : e.textContent;
      }
      return cssText;
    },
    cssFromModuleImports: function cssFromModuleImports(moduleId) {
      var cssText = '';
      var m = importModule(moduleId);
      if (!m) {
        return cssText;
      }
      var p$ = m.querySelectorAll(MODULE_STYLE_LINK_SELECTOR);
      for (var i = 0; i < p$.length; i++) {
        var p = p$[i];
        if (p.import) {
          var importDoc = p.import;
          var container = importDoc.body ? importDoc.body : importDoc;
          cssText += Polymer.ResolveUrl.resolveCss(container.textContent, importDoc.baseURI);
        }
      }
      return cssText;
    }
  };
  Polymer.StyleGather = StyleGather;
})();

(function () {
  'use strict';

  var modules = {};
  var lcModules = {};
  function findModule(id) {
    return modules[id] || lcModules[id.toLowerCase()];
  }
  function styleOutsideTemplateCheck(inst) {
    if (inst.querySelector('style')) {
      console.warn('dom-module %s has style outside template', inst.id);
    }
  }

  var DomModule = function (_HTMLElement) {
    babelHelpers.inherits(DomModule, _HTMLElement);

    function DomModule() {
      babelHelpers.classCallCheck(this, DomModule);
      return babelHelpers.possibleConstructorReturn(this, (DomModule.__proto__ || Object.getPrototypeOf(DomModule)).apply(this, arguments));
    }

    babelHelpers.createClass(DomModule, [{
      key: 'attributeChangedCallback',
      value: function attributeChangedCallback(name, old, value) {
        if (old !== value) {
          this.register();
        }
      }
    }, {
      key: 'register',
      value: function register(id) {
        id = id || this.id;
        if (id) {
          this.id = id;
          modules[id] = this;
          lcModules[id.toLowerCase()] = this;
          styleOutsideTemplateCheck(this);
        }
      }
    }, {
      key: 'assetpath',
      get: function get() {
        if (!this.__assetpath) {
          var owner = window.HTMLImports && HTMLImports.importForElement ? HTMLImports.importForElement(this) || document : this.ownerDocument;
          var url = Polymer.ResolveUrl.resolveUrl(this.getAttribute('assetpath') || '', owner.baseURI);
          this.__assetpath = Polymer.ResolveUrl.pathFromUrl(url);
        }
        return this.__assetpath;
      }
    }], [{
      key: 'import',
      value: function _import(id, selector) {
        if (id) {
          var m = findModule(id);
          if (m && selector) {
            return m.querySelector(selector);
          }
          return m;
        }
        return null;
      }
    }, {
      key: 'observedAttributes',
      get: function get() {
        return ['id'];
      }
    }]);
    return DomModule;
  }(HTMLElement);

  DomModule.prototype['modules'] = modules;
  customElements.define('dom-module', DomModule);
  Polymer.DomModule = DomModule;
})();

(function () {
  'use strict';

  var Path = {
    isPath: function isPath(path) {
      return path.indexOf('.') >= 0;
    },
    root: function root(path) {
      var dotIndex = path.indexOf('.');
      if (dotIndex === -1) {
        return path;
      }
      return path.slice(0, dotIndex);
    },
    isAncestor: function isAncestor(base, path) {
      return base.indexOf(path + '.') === 0;
    },
    isDescendant: function isDescendant(base, path) {
      return path.indexOf(base + '.') === 0;
    },
    translate: function translate(base, newBase, path) {
      return newBase + path.slice(base.length);
    },
    matches: function matches(base, path) {
      return base === path || this.isAncestor(base, path) || this.isDescendant(base, path);
    },
    normalize: function normalize(path) {
      if (Array.isArray(path)) {
        var parts = [];
        for (var i = 0; i < path.length; i++) {
          var args = path[i].toString().split('.');
          for (var j = 0; j < args.length; j++) {
            parts.push(args[j]);
          }
        }
        return parts.join('.');
      } else {
        return path;
      }
    },
    split: function split(path) {
      if (Array.isArray(path)) {
        return this.normalize(path).split('.');
      }
      return path.toString().split('.');
    },
    get: function get(root, path, info) {
      var prop = root;
      var parts = this.split(path);
      for (var i = 0; i < parts.length; i++) {
        if (!prop) {
          return;
        }
        var part = parts[i];
        prop = prop[part];
      }
      if (info) {
        info.path = parts.join('.');
      }
      return prop;
    },
    set: function set(root, path, value) {
      var prop = root;
      var parts = this.split(path);
      var last = parts[parts.length - 1];
      if (parts.length > 1) {
        for (var i = 0; i < parts.length - 1; i++) {
          var part = parts[i];
          prop = prop[part];
          if (!prop) {
            return;
          }
        }
        prop[last] = value;
      } else {
        prop[path] = value;
      }
      return parts.join('.');
    }
  };
  Path.isDeep = Path.isPath;
  Polymer.Path = Path;
})();

(function () {
  'use strict';

  var AsyncInterface = void 0;
  var microtaskCurrHandle = 0;
  var microtaskLastHandle = 0;
  var microtaskCallbacks = [];
  var microtaskNodeContent = 0;
  var microtaskNode = document.createTextNode('');
  new window.MutationObserver(microtaskFlush).observe(microtaskNode, { characterData: true });
  function microtaskFlush() {
    var len = microtaskCallbacks.length;
    for (var i = 0; i < len; i++) {
      var cb = microtaskCallbacks[i];
      if (cb) {
        try {
          cb();
        } catch (e) {
          setTimeout(function () {
            throw e;
          });
        }
      }
    }
    microtaskCallbacks.splice(0, len);
    microtaskLastHandle += len;
  }
  Polymer.Async = {
    timeOut: {
      after: function after(delay) {
        return {
          run: function run(fn) {
            return setTimeout(fn, delay);
          },

          cancel: window.clearTimeout.bind(window)
        };
      },

      run: window.setTimeout.bind(window),
      cancel: window.clearTimeout.bind(window)
    },
    animationFrame: {
      run: window.requestAnimationFrame.bind(window),
      cancel: window.cancelAnimationFrame.bind(window)
    },
    idlePeriod: {
      run: function run(fn) {
        return window.requestIdleCallback ? window.requestIdleCallback(fn) : window.setTimeout(fn, 16);
      },
      cancel: function cancel(handle) {
        window.cancelIdleCallback ? window.cancelIdleCallback(handle) : window.clearTimeout(handle);
      }
    },
    microTask: {
      run: function run(callback) {
        microtaskNode.textContent = microtaskNodeContent++;
        microtaskCallbacks.push(callback);
        return microtaskCurrHandle++;
      },
      cancel: function cancel(handle) {
        var idx = handle - microtaskLastHandle;
        if (idx >= 0) {
          if (!microtaskCallbacks[idx]) {
            throw new Error('invalid async handle: ' + handle);
          }
          microtaskCallbacks[idx] = null;
        }
      }
    }
  };
})();

(function () {
  'use strict';

  var caseMap = Polymer.CaseMap;
  var microtask = Polymer.Async.microTask;
  var nativeProperties = {};
  var proto = HTMLElement.prototype;
  while (proto) {
    var props = Object.getOwnPropertyNames(proto);
    for (var i = 0; i < props.length; i++) {
      nativeProperties[props[i]] = true;
    }
    proto = Object.getPrototypeOf(proto);
  }
  function saveAccessorValue(model, property) {
    if (!nativeProperties[property]) {
      var value = model[property];
      if (value !== undefined) {
        if (model.__data) {
          model._setPendingProperty(property, value);
        } else {
          if (!model.__dataProto) {
            model.__dataProto = {};
          } else if (!model.hasOwnProperty(JSCompiler_renameProperty('__dataProto', model))) {
            model.__dataProto = Object.create(model.__dataProto);
          }
          model.__dataProto[property] = value;
        }
      }
    }
  }
  Polymer.PropertyAccessors = Polymer.dedupingMixin(function (superClass) {
    var PropertyAccessors = function (_superClass) {
      babelHelpers.inherits(PropertyAccessors, _superClass);
      babelHelpers.createClass(PropertyAccessors, null, [{
        key: 'createPropertiesForAttributes',
        value: function createPropertiesForAttributes() {
          var a$ = this.observedAttributes;
          for (var _i = 0; _i < a$.length; _i++) {
            this.prototype._createPropertyAccessor(caseMap.dashToCamelCase(a$[_i]));
          }
        }
      }]);

      function PropertyAccessors() {
        babelHelpers.classCallCheck(this, PropertyAccessors);

        var _this2 = babelHelpers.possibleConstructorReturn(this, (PropertyAccessors.__proto__ || Object.getPrototypeOf(PropertyAccessors)).call(this));

        _this2.__serializing;
        _this2.__dataCounter;
        _this2.__dataEnabled;
        _this2.__dataReady;
        _this2.__dataInvalid;
        _this2.__data;
        _this2.__dataPending;
        _this2.__dataOld;
        _this2.__dataProto;
        _this2.__dataHasAccessor;
        _this2.__dataInstanceProps;
        _this2._initializeProperties();
        return _this2;
      }

      babelHelpers.createClass(PropertyAccessors, [{
        key: 'attributeChangedCallback',
        value: function attributeChangedCallback(name, old, value) {
          if (old !== value) {
            this._attributeToProperty(name, value);
          }
        }
      }, {
        key: '_initializeProperties',
        value: function _initializeProperties() {
          this.__serializing = false;
          this.__dataCounter = 0;
          this.__dataEnabled = false;
          this.__dataReady = false;
          this.__dataInvalid = false;
          this.__data = {};
          this.__dataPending = null;
          this.__dataOld = null;
          if (this.__dataProto) {
            this._initializeProtoProperties(this.__dataProto);
            this.__dataProto = null;
          }
          for (var p in this.__dataHasAccessor) {
            if (this.hasOwnProperty(p)) {
              this.__dataInstanceProps = this.__dataInstanceProps || {};
              this.__dataInstanceProps[p] = this[p];
              delete this[p];
            }
          }
        }
      }, {
        key: '_initializeProtoProperties',
        value: function _initializeProtoProperties(props) {
          for (var p in props) {
            this._setProperty(p, props[p]);
          }
        }
      }, {
        key: '_initializeInstanceProperties',
        value: function _initializeInstanceProperties(props) {
          Object.assign(this, props);
        }
      }, {
        key: '_ensureAttribute',
        value: function _ensureAttribute(attribute, value) {
          if (!this.hasAttribute(attribute)) {
            this._valueToNodeAttribute(this, value, attribute);
          }
        }
      }, {
        key: '_attributeToProperty',
        value: function _attributeToProperty(attribute, value, type) {
          if (!this.__serializing) {
            var property = caseMap.dashToCamelCase(attribute);
            this[property] = this._deserializeValue(value, type);
          }
        }
      }, {
        key: '_propertyToAttribute',
        value: function _propertyToAttribute(property, attribute, value) {
          this.__serializing = true;
          value = arguments.length < 3 ? this[property] : value;
          this._valueToNodeAttribute(this, value, attribute || caseMap.camelToDashCase(property));
          this.__serializing = false;
        }
      }, {
        key: '_valueToNodeAttribute',
        value: function _valueToNodeAttribute(node, value, attribute) {
          var str = this._serializeValue(value);
          if (str === undefined) {
            node.removeAttribute(attribute);
          } else {
            node.setAttribute(attribute, str);
          }
        }
      }, {
        key: '_serializeValue',
        value: function _serializeValue(value) {
          switch (typeof value === 'undefined' ? 'undefined' : babelHelpers.typeof(value)) {
            case 'boolean':
              return value ? '' : undefined;
            case 'object':
              if (value instanceof Date) {
                return value.toString();
              } else if (value) {
                try {
                  return JSON.stringify(value);
                } catch (x) {
                  return '';
                }
              }
            default:
              return value != null ? value.toString() : undefined;
          }
        }
      }, {
        key: '_deserializeValue',
        value: function _deserializeValue(value, type) {
          var outValue = void 0;
          switch (type) {
            case Number:
              outValue = Number(value);
              break;
            case Boolean:
              outValue = value !== null;
              break;
            case Object:
              try {
                outValue = JSON.parse(value);
              } catch (x) {}
              break;
            case Array:
              try {
                outValue = JSON.parse(value);
              } catch (x) {
                outValue = null;
                console.warn('Polymer::Attributes: couldn\'t decode Array as JSON: ' + value);
              }
              break;
            case Date:
              outValue = new Date(value);
              break;
            case String:
            default:
              outValue = value;
              break;
          }
          return outValue;
        }
      }, {
        key: '_createPropertyAccessor',
        value: function _createPropertyAccessor(property, readOnly) {
          if (!this.hasOwnProperty('__dataHasAccessor')) {
            this.__dataHasAccessor = Object.assign({}, this.__dataHasAccessor);
          }
          if (!this.__dataHasAccessor[property]) {
            this.__dataHasAccessor[property] = true;
            saveAccessorValue(this, property);
            Object.defineProperty(this, property, {
              get: function get() {
                return this.__data[property];
              },
              set: readOnly ? function () {} : function (value) {
                this._setProperty(property, value);
              }
            });
          }
        }
      }, {
        key: '_hasAccessor',
        value: function _hasAccessor(property) {
          return this.__dataHasAccessor && this.__dataHasAccessor[property];
        }
      }, {
        key: '_setProperty',
        value: function _setProperty(property, value) {
          if (this._setPendingProperty(property, value)) {
            this._invalidateProperties();
          }
        }
      }, {
        key: '_setPendingProperty',
        value: function _setPendingProperty(property, value) {
          var old = this.__data[property];
          var changed = this._shouldPropertyChange(property, value, old);
          if (changed) {
            if (!this.__dataPending) {
              this.__dataPending = {};
              this.__dataOld = {};
            }
            if (this.__dataOld && !(property in this.__dataOld)) {
              this.__dataOld[property] = old;
            }
            this.__data[property] = value;
            this.__dataPending[property] = value;
          }
          return changed;
        }
      }, {
        key: '_isPropertyPending',
        value: function _isPropertyPending(prop) {
          return Boolean(this.__dataPending && prop in this.__dataPending);
        }
      }, {
        key: '_invalidateProperties',
        value: function _invalidateProperties() {
          var _this3 = this;

          if (!this.__dataInvalid && this.__dataReady) {
            this.__dataInvalid = true;
            microtask.run(function () {
              if (_this3.__dataInvalid) {
                _this3.__dataInvalid = false;
                _this3._flushProperties();
              }
            });
          }
        }
      }, {
        key: '_enableProperties',
        value: function _enableProperties() {
          if (!this.__dataEnabled) {
            this.__dataEnabled = true;
            if (this.__dataInstanceProps) {
              this._initializeInstanceProperties(this.__dataInstanceProps);
              this.__dataInstanceProps = null;
            }
            this.ready();
          }
        }
      }, {
        key: '_flushProperties',
        value: function _flushProperties() {
          if (this.__dataPending && this.__dataOld) {
            var changedProps = this.__dataPending;
            this.__dataPending = null;
            this.__dataCounter++;
            this._propertiesChanged(this.__data, changedProps, this.__dataOld);
            this.__dataCounter--;
          }
        }
      }, {
        key: 'ready',
        value: function ready() {
          this.__dataReady = true;
          this._flushProperties();
        }
      }, {
        key: '_propertiesChanged',
        value: function _propertiesChanged(currentProps, changedProps, oldProps) {}
      }, {
        key: '_shouldPropertyChange',
        value: function _shouldPropertyChange(property, value, old) {
          return old !== value && (old === old || value === value);
        }
      }]);
      return PropertyAccessors;
    }(superClass);

    return PropertyAccessors;
  });
})();

(function () {
  'use strict';

  var templateExtensions = {
    'dom-if': true,
    'dom-repeat': true
  };
  function wrapTemplateExtension(node) {
    var is = node.getAttribute('is');
    if (is && templateExtensions[is]) {
      var t = node;
      t.removeAttribute('is');
      node = t.ownerDocument.createElement(is);
      t.parentNode.replaceChild(node, t);
      node.appendChild(t);
      while (t.attributes.length) {
        node.setAttribute(t.attributes[0].name, t.attributes[0].value);
        t.removeAttribute(t.attributes[0].name);
      }
    }
    return node;
  }
  function findTemplateNode(root, nodeInfo) {
    var parent = nodeInfo.parentInfo && findTemplateNode(root, nodeInfo.parentInfo);
    if (parent) {
      for (var n = parent.firstChild, i = 0; n; n = n.nextSibling) {
        if (nodeInfo.parentIndex === i++) {
          return n;
        }
      }
    } else {
      return root;
    }
  }
  function applyIdToMap(inst, map, node, nodeInfo) {
    if (nodeInfo.id) {
      map[nodeInfo.id] = node;
    }
  }
  function applyEventListener(inst, node, nodeInfo) {
    if (nodeInfo.events && nodeInfo.events.length) {
      for (var j = 0, e$ = nodeInfo.events, e; j < e$.length && (e = e$[j]); j++) {
        inst._addMethodEventListenerToNode(node, e.name, e.value, inst);
      }
    }
  }
  function applyTemplateContent(inst, node, nodeInfo) {
    if (nodeInfo.templateInfo) {
      node._templateInfo = nodeInfo.templateInfo;
    }
  }
  function createNodeEventHandler(context, eventName, methodName) {
    context = context._methodHost || context;
    var handler = function handler(e) {
      if (context[methodName]) {
        context[methodName](e, e.detail);
      } else {
        console.warn('listener method `' + methodName + '` not defined');
      }
    };
    return handler;
  }
  Polymer.TemplateStamp = Polymer.dedupingMixin(function (superClass) {
    var TemplateStamp = function (_superClass2) {
      babelHelpers.inherits(TemplateStamp, _superClass2);

      function TemplateStamp() {
        babelHelpers.classCallCheck(this, TemplateStamp);
        return babelHelpers.possibleConstructorReturn(this, (TemplateStamp.__proto__ || Object.getPrototypeOf(TemplateStamp)).apply(this, arguments));
      }

      babelHelpers.createClass(TemplateStamp, [{
        key: '_stampTemplate',
        value: function _stampTemplate(template) {
          if (template && !template.content && window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
            HTMLTemplateElement.decorate(template);
          }
          var templateInfo = this.constructor._parseTemplate(template);
          var nodeInfo = templateInfo.nodeInfoList;
          var content = templateInfo.content || template.content;
          var dom = document.importNode(content, true);
          dom.__noInsertionPoint = !templateInfo.hasInsertionPoint;
          var nodes = dom.nodeList = new Array(nodeInfo.length);
          dom.$ = {};
          for (var i = 0, l = nodeInfo.length, info; i < l && (info = nodeInfo[i]); i++) {
            var node = nodes[i] = findTemplateNode(dom, info);
            applyIdToMap(this, dom.$, node, info);
            applyTemplateContent(this, node, info);
            applyEventListener(this, node, info);
          }
          return dom;
        }
      }, {
        key: '_addMethodEventListenerToNode',
        value: function _addMethodEventListenerToNode(node, eventName, methodName, context) {
          context = context || node;
          var handler = createNodeEventHandler(context, eventName, methodName);
          this._addEventListenerToNode(node, eventName, handler);
          return handler;
        }
      }, {
        key: '_addEventListenerToNode',
        value: function _addEventListenerToNode(node, eventName, handler) {
          node.addEventListener(eventName, handler);
        }
      }, {
        key: '_removeEventListenerFromNode',
        value: function _removeEventListenerFromNode(node, eventName, handler) {
          node.removeEventListener(eventName, handler);
        }
      }], [{
        key: '_parseTemplate',
        value: function _parseTemplate(template, outerTemplateInfo) {
          if (!template._templateInfo) {
            var templateInfo = template._templateInfo = {};
            templateInfo.nodeInfoList = [];
            templateInfo.stripWhiteSpace = outerTemplateInfo && outerTemplateInfo.stripWhiteSpace || template.hasAttribute('strip-whitespace');
            this._parseTemplateContent(template, templateInfo, { parent: null });
          }
          return template._templateInfo;
        }
      }, {
        key: '_parseTemplateContent',
        value: function _parseTemplateContent(template, templateInfo, nodeInfo) {
          return this._parseTemplateNode(template.content, templateInfo, nodeInfo);
        }
      }, {
        key: '_parseTemplateNode',
        value: function _parseTemplateNode(node, templateInfo, nodeInfo) {
          var noted = void 0;
          var element = node;
          if (element.localName == 'template' && !element.hasAttribute('preserve-content')) {
            noted = this._parseTemplateNestedTemplate(element, templateInfo, nodeInfo) || noted;
          } else if (element.localName === 'slot') {
            templateInfo.hasInsertionPoint = true;
          }
          if (element.firstChild) {
            noted = this._parseTemplateChildNodes(element, templateInfo, nodeInfo) || noted;
          }
          if (element.hasAttributes && element.hasAttributes()) {
            noted = this._parseTemplateNodeAttributes(element, templateInfo, nodeInfo) || noted;
          }
          return noted;
        }
      }, {
        key: '_parseTemplateChildNodes',
        value: function _parseTemplateChildNodes(root, templateInfo, nodeInfo) {
          for (var node = root.firstChild, parentIndex = 0, next; node; node = next) {
            if (node.localName == 'template') {
              node = wrapTemplateExtension(node);
            }
            next = node.nextSibling;
            if (node.nodeType === Node.TEXT_NODE) {
              var n = next;
              while (n && n.nodeType === Node.TEXT_NODE) {
                node.textContent += n.textContent;
                next = n.nextSibling;
                root.removeChild(n);
                n = next;
              }
              if (templateInfo.stripWhiteSpace && !node.textContent.trim()) {
                root.removeChild(node);
                continue;
              }
            }
            var childInfo = { parentIndex: parentIndex, parentInfo: nodeInfo };
            if (this._parseTemplateNode(node, templateInfo, childInfo)) {
              childInfo.infoIndex = templateInfo.nodeInfoList.push(childInfo) - 1;
            }
            if (node.parentNode) {
              parentIndex++;
            }
          }
        }
      }, {
        key: '_parseTemplateNestedTemplate',
        value: function _parseTemplateNestedTemplate(node, outerTemplateInfo, nodeInfo) {
          var templateInfo = this._parseTemplate(node, outerTemplateInfo);
          var content = templateInfo.content = node.content.ownerDocument.createDocumentFragment();
          content.appendChild(node.content);
          nodeInfo.templateInfo = templateInfo;
          return true;
        }
      }, {
        key: '_parseTemplateNodeAttributes',
        value: function _parseTemplateNodeAttributes(node, templateInfo, nodeInfo) {
          var noted = false;
          var attrs = Array.from(node.attributes);
          for (var i = attrs.length - 1, a; a = attrs[i]; i--) {
            noted = this._parseTemplateNodeAttribute(node, templateInfo, nodeInfo, a.name, a.value) || noted;
          }
          return noted;
        }
      }, {
        key: '_parseTemplateNodeAttribute',
        value: function _parseTemplateNodeAttribute(node, templateInfo, nodeInfo, name, value) {
          if (name.slice(0, 3) === 'on-') {
            node.removeAttribute(name);
            nodeInfo.events = nodeInfo.events || [];
            nodeInfo.events.push({
              name: name.slice(3),
              value: value
            });
            return true;
          } else if (name === 'id') {
            nodeInfo.id = value;
            return true;
          }
          return false;
        }
      }, {
        key: '_contentForTemplate',
        value: function _contentForTemplate(template) {
          var templateInfo = template._templateInfo;
          return templateInfo && templateInfo.content || template.content;
        }
      }]);
      return TemplateStamp;
    }(superClass);

    return TemplateStamp;
  });
})();

(function () {
  'use strict';

  var CaseMap = Polymer.CaseMap;
  var dedupeId = 0;
  var TYPES = {
    COMPUTE: '__computeEffects',
    REFLECT: '__reflectEffects',
    NOTIFY: '__notifyEffects',
    PROPAGATE: '__propagateEffects',
    OBSERVE: '__observeEffects',
    READ_ONLY: '__readOnly'
  };
  var DataTrigger = void 0;
  var DataEffect = void 0;
  var PropertyEffectsType = void 0;
  function ensureOwnEffectMap(model, type) {
    var effects = model[type];
    if (!effects) {
      effects = model[type] = {};
    } else if (!model.hasOwnProperty(type)) {
      effects = model[type] = Object.create(model[type]);
      for (var p in effects) {
        var protoFx = effects[p];
        var instFx = effects[p] = Array(protoFx.length);
        for (var i = 0; i < protoFx.length; i++) {
          instFx[i] = protoFx[i];
        }
      }
    }
    return effects;
  }
  function runEffects(inst, effects, props, oldProps, hasPaths, extraArgs) {
    if (effects) {
      var ran = false;
      var id = dedupeId++;
      for (var prop in props) {
        if (runEffectsForProperty(inst, effects, id, prop, props, oldProps, hasPaths, extraArgs)) {
          ran = true;
        }
      }
      return ran;
    }
    return false;
  }
  function runEffectsForProperty(inst, effects, dedupeId, prop, props, oldProps, hasPaths, extraArgs) {
    var ran = false;
    var rootProperty = hasPaths ? Polymer.Path.root(prop) : prop;
    var fxs = effects[rootProperty];
    if (fxs) {
      for (var i = 0, l = fxs.length, fx; i < l && (fx = fxs[i]); i++) {
        if ((!fx.info || fx.info.lastRun !== dedupeId) && (!hasPaths || pathMatchesTrigger(prop, fx.trigger))) {
          if (fx.info) {
            fx.info.lastRun = dedupeId;
          }
          fx.fn(inst, prop, props, oldProps, fx.info, hasPaths, extraArgs);
          ran = true;
        }
      }
    }
    return ran;
  }
  function pathMatchesTrigger(path, trigger) {
    if (trigger) {
      var triggerPath = trigger.name;
      return triggerPath == path || trigger.structured && Polymer.Path.isAncestor(triggerPath, path) || trigger.wildcard && Polymer.Path.isDescendant(triggerPath, path);
    } else {
      return true;
    }
  }
  function runObserverEffect(inst, property, props, oldProps, info) {
    var fn = inst[info.methodName];
    var changedProp = info.property;
    if (fn) {
      fn.call(inst, inst.__data[changedProp], oldProps[changedProp]);
    } else if (!info.dynamicFn) {
      console.warn('observer method `' + info.methodName + '` not defined');
    }
  }
  function runNotifyEffects(inst, notifyProps, props, oldProps, hasPaths) {
    var fxs = inst[TYPES.NOTIFY];
    var notified = void 0;
    var id = dedupeId++;
    for (var prop in notifyProps) {
      if (notifyProps[prop]) {
        if (fxs && runEffectsForProperty(inst, fxs, id, prop, props, oldProps, hasPaths)) {
          notified = true;
        } else if (hasPaths && notifyPath(inst, prop, props)) {
          notified = true;
        }
      }
    }
    var host = void 0;
    if (notified && (host = inst.__dataHost) && host._invalidateProperties) {
      host._invalidateProperties();
    }
  }
  function notifyPath(inst, path, props) {
    var rootProperty = Polymer.Path.root(path);
    if (rootProperty !== path) {
      var eventName = Polymer.CaseMap.camelToDashCase(rootProperty) + '-changed';
      dispatchNotifyEvent(inst, eventName, props[path], path);
      return true;
    }
    return false;
  }
  function dispatchNotifyEvent(inst, eventName, value, path) {
    var detail = {
      value: value,
      queueProperty: true
    };
    if (path) {
      detail.path = path;
    }
    inst.dispatchEvent(new CustomEvent(eventName, { detail: detail }));
  }
  function runNotifyEffect(inst, property, props, oldProps, info, hasPaths) {
    var rootProperty = hasPaths ? Polymer.Path.root(property) : property;
    var path = rootProperty != property ? property : null;
    var value = path ? Polymer.Path.get(inst, path) : inst.__data[property];
    if (path && value === undefined) {
      value = props[property];
    }
    dispatchNotifyEvent(inst, info.eventName, value, path);
  }
  function handleNotification(event, inst, fromProp, toPath, negate) {
    var value = void 0;
    var detail = event.detail;
    var fromPath = detail && detail.path;
    if (fromPath) {
      toPath = Polymer.Path.translate(fromProp, toPath, fromPath);
      value = detail && detail.value;
    } else {
      value = event.target[fromProp];
    }
    value = negate ? !value : value;
    if (!inst[TYPES.READ_ONLY] || !inst[TYPES.READ_ONLY][toPath]) {
      if (inst._setPendingPropertyOrPath(toPath, value, true, Boolean(fromPath)) && (!detail || !detail.queueProperty)) {
        inst._invalidateProperties();
      }
    }
  }
  function runReflectEffect(inst, property, props, oldProps, info) {
    var value = inst.__data[property];
    if (Polymer.sanitizeDOMValue) {
      value = Polymer.sanitizeDOMValue(value, info.attrName, 'attribute', inst);
    }
    inst._propertyToAttribute(property, info.attrName, value);
  }
  function runComputedEffects(inst, changedProps, oldProps, hasPaths) {
    var computeEffects = inst[TYPES.COMPUTE];
    if (computeEffects) {
      var inputProps = changedProps;
      while (runEffects(inst, computeEffects, inputProps, oldProps, hasPaths)) {
        Object.assign(oldProps, inst.__dataOld);
        Object.assign(changedProps, inst.__dataPending);
        inputProps = inst.__dataPending;
        inst.__dataPending = null;
      }
    }
  }
  function runComputedEffect(inst, property, props, oldProps, info) {
    var result = runMethodEffect(inst, property, props, oldProps, info);
    var computedProp = info.methodInfo;
    if (inst.__dataHasAccessor && inst.__dataHasAccessor[computedProp]) {
      inst._setPendingProperty(computedProp, result, true);
    } else {
      inst[computedProp] = result;
    }
  }
  function computeLinkedPaths(inst, path, value) {
    var links = inst.__dataLinkedPaths;
    if (links) {
      var link = void 0;
      for (var a in links) {
        var b = links[a];
        if (Polymer.Path.isDescendant(a, path)) {
          link = Polymer.Path.translate(a, b, path);
          inst._setPendingPropertyOrPath(link, value, true, true);
        } else if (Polymer.Path.isDescendant(b, path)) {
          link = Polymer.Path.translate(b, a, path);
          inst._setPendingPropertyOrPath(link, value, true, true);
        }
      }
    }
  }
  function addBinding(constructor, templateInfo, nodeInfo, kind, target, parts, literal) {
    nodeInfo.bindings = nodeInfo.bindings || [];
    var binding = { kind: kind, target: target, parts: parts, literal: literal, isCompound: parts.length !== 1 };
    nodeInfo.bindings.push(binding);
    if (shouldAddListener(binding)) {
      var _binding$parts$ = binding.parts[0],
          event = _binding$parts$.event,
          negate = _binding$parts$.negate;

      binding.listenerEvent = event || CaseMap.camelToDashCase(target) + '-changed';
      binding.listenerNegate = negate;
    }
    var index = templateInfo.nodeInfoList.length;
    for (var i = 0; i < binding.parts.length; i++) {
      var part = binding.parts[i];
      part.compoundIndex = i;
      addEffectForBindingPart(constructor, templateInfo, binding, part, index);
    }
  }
  function addEffectForBindingPart(constructor, templateInfo, binding, part, index) {
    if (!part.literal) {
      if (binding.kind === 'attribute' && binding.target[0] === '-') {
        console.warn('Cannot set attribute ' + binding.target + ' because "-" is not a valid attribute starting character');
      } else {
        var dependencies = part.dependencies;
        var info = { index: index, binding: binding, part: part, evaluator: constructor };
        for (var j = 0; j < dependencies.length; j++) {
          var trigger = dependencies[j];
          if (typeof trigger == 'string') {
            trigger = parseArg(trigger);
            trigger.wildcard = true;
          }
          constructor._addTemplatePropertyEffect(templateInfo, trigger.rootProperty, {
            fn: runBindingEffect,
            info: info, trigger: trigger
          });
        }
      }
    }
  }
  function runBindingEffect(inst, path, props, oldProps, info, hasPaths, nodeList) {
    var node = nodeList[info.index];
    var binding = info.binding;
    var part = info.part;
    if (hasPaths && part.source && path.length > part.source.length && binding.kind == 'property' && !binding.isCompound && node.__dataHasAccessor && node.__dataHasAccessor[binding.target]) {
      var value = props[path];
      path = Polymer.Path.translate(part.source, binding.target, path);
      if (node._setPendingPropertyOrPath(path, value, false, true)) {
        inst._enqueueClient(node);
      }
    } else {
      var _value = info.evaluator._evaluateBinding(inst, part, path, props, oldProps, hasPaths);
      applyBindingValue(inst, node, binding, part, _value);
    }
  }
  function applyBindingValue(inst, node, binding, part, value) {
    value = computeBindingValue(node, value, binding, part);
    if (Polymer.sanitizeDOMValue) {
      value = Polymer.sanitizeDOMValue(value, binding.target, binding.kind, node);
    }
    if (binding.kind == 'attribute') {
      inst._valueToNodeAttribute(node, value, binding.target);
    } else {
      var prop = binding.target;
      if (node.__dataHasAccessor && node.__dataHasAccessor[prop]) {
        if (!node[TYPES.READ_ONLY] || !node[TYPES.READ_ONLY][prop]) {
          if (node._setPendingProperty(prop, value)) {
            inst._enqueueClient(node);
          }
        }
      } else {
        inst._setUnmanagedPropertyToNode(node, prop, value);
      }
    }
  }
  function computeBindingValue(node, value, binding, part) {
    if (binding.isCompound) {
      var storage = node.__dataCompoundStorage[binding.target];
      storage[part.compoundIndex] = value;
      value = storage.join('');
    }
    if (binding.kind !== 'attribute') {
      if (binding.target === 'textContent' || node.localName == 'input' && binding.target == 'value') {
        value = value == undefined ? '' : value;
      }
    }
    return value;
  }
  function shouldAddListener(binding) {
    return Boolean(binding.target) && binding.kind != 'attribute' && binding.kind != 'text' && !binding.isCompound && binding.parts[0].mode === '{';
  }
  function setupBindings(inst, templateInfo) {
    var nodeList = templateInfo.nodeList,
        nodeInfoList = templateInfo.nodeInfoList;

    if (nodeInfoList.length) {
      for (var i = 0; i < nodeInfoList.length; i++) {
        var info = nodeInfoList[i];
        var node = nodeList[i];
        var bindings = info.bindings;
        if (bindings) {
          for (var _i2 = 0; _i2 < bindings.length; _i2++) {
            var binding = bindings[_i2];
            setupCompoundStorage(node, binding);
            addNotifyListener(node, inst, binding);
          }
        }
        node.__dataHost = inst;
      }
    }
  }
  function setupCompoundStorage(node, binding) {
    if (binding.isCompound) {
      var storage = node.__dataCompoundStorage || (node.__dataCompoundStorage = {});
      var parts = binding.parts;
      var literals = new Array(parts.length);
      for (var j = 0; j < parts.length; j++) {
        literals[j] = parts[j].literal;
      }
      var target = binding.target;
      storage[target] = literals;
      if (binding.literal && binding.kind == 'property') {
        node[target] = binding.literal;
      }
    }
  }
  function addNotifyListener(node, inst, binding) {
    if (binding.listenerEvent) {
      var part = binding.parts[0];
      node.addEventListener(binding.listenerEvent, function (e) {
        handleNotification(e, inst, binding.target, part.source, part.negate);
      });
    }
  }
  function createMethodEffect(model, sig, type, effectFn, methodInfo, dynamicFn) {
    dynamicFn = sig.static || dynamicFn && ((typeof dynamicFn === 'undefined' ? 'undefined' : babelHelpers.typeof(dynamicFn)) !== 'object' || dynamicFn[sig.methodName]);
    var info = {
      methodName: sig.methodName,
      args: sig.args,
      methodInfo: methodInfo,
      dynamicFn: dynamicFn
    };
    for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
      if (!arg.literal) {
        model._addPropertyEffect(arg.rootProperty, type, {
          fn: effectFn, info: info, trigger: arg
        });
      }
    }
    if (dynamicFn) {
      model._addPropertyEffect(sig.methodName, type, {
        fn: effectFn, info: info
      });
    }
  }
  function runMethodEffect(inst, property, props, oldProps, info) {
    var context = inst._methodHost || inst;
    var fn = context[info.methodName];
    if (fn) {
      var args = marshalArgs(inst.__data, info.args, property, props);
      return fn.apply(context, args);
    } else if (!info.dynamicFn) {
      console.warn('method `' + info.methodName + '` not defined');
    }
  }
  var emptyArray = [];
  var IDENT = '(?:' + '[a-zA-Z_$][\\w.:$\\-*]*' + ')';
  var NUMBER = '(?:' + '[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?' + ')';
  var SQUOTE_STRING = '(?:' + '\'(?:[^\'\\\\]|\\\\.)*\'' + ')';
  var DQUOTE_STRING = '(?:' + '"(?:[^"\\\\]|\\\\.)*"' + ')';
  var STRING = '(?:' + SQUOTE_STRING + '|' + DQUOTE_STRING + ')';
  var ARGUMENT = '(?:(' + IDENT + '|' + NUMBER + '|' + STRING + ')\\s*' + ')';
  var ARGUMENTS = '(?:' + ARGUMENT + '(?:,\\s*' + ARGUMENT + ')*' + ')';
  var ARGUMENT_LIST = '(?:' + '\\(\\s*' + '(?:' + ARGUMENTS + '?' + ')' + '\\)\\s*' + ')';
  var BINDING = '(' + IDENT + '\\s*' + ARGUMENT_LIST + '?' + ')';
  var OPEN_BRACKET = '(\\[\\[|{{)' + '\\s*';
  var CLOSE_BRACKET = '(?:]]|}})';
  var NEGATE = '(?:(!)\\s*)?';
  var EXPRESSION = OPEN_BRACKET + NEGATE + BINDING + CLOSE_BRACKET;
  var bindingRegex = new RegExp(EXPRESSION, "g");
  function literalFromParts(parts) {
    var s = '';
    for (var i = 0; i < parts.length; i++) {
      var literal = parts[i].literal;
      s += literal || '';
    }
    return s;
  }
  function parseMethod(expression) {
    var m = expression.match(/([^\s]+?)\(([\s\S]*)\)/);
    if (m) {
      var methodName = m[1];
      var sig = { methodName: methodName, static: true, args: emptyArray };
      if (m[2].trim()) {
        var args = m[2].replace(/\\,/g, '&comma;').split(',');
        return parseArgs(args, sig);
      } else {
        return sig;
      }
    }
    return null;
  }
  function parseArgs(argList, sig) {
    sig.args = argList.map(function (rawArg) {
      var arg = parseArg(rawArg);
      if (!arg.literal) {
        sig.static = false;
      }
      return arg;
    }, this);
    return sig;
  }
  function parseArg(rawArg) {
    var arg = rawArg.trim().replace(/&comma;/g, ',').replace(/\\(.)/g, '\$1');
    var a = {
      name: arg,
      value: '',
      literal: false
    };
    var fc = arg[0];
    if (fc === '-') {
      fc = arg[1];
    }
    if (fc >= '0' && fc <= '9') {
      fc = '#';
    }
    switch (fc) {
      case "'":
      case '"':
        a.value = arg.slice(1, -1);
        a.literal = true;
        break;
      case '#':
        a.value = Number(arg);
        a.literal = true;
        break;
    }
    if (!a.literal) {
      a.rootProperty = Polymer.Path.root(arg);
      a.structured = Polymer.Path.isPath(arg);
      if (a.structured) {
        a.wildcard = arg.slice(-2) == '.*';
        if (a.wildcard) {
          a.name = arg.slice(0, -2);
        }
      }
    }
    return a;
  }
  function marshalArgs(data, args, path, props) {
    var values = [];
    for (var i = 0, l = args.length; i < l; i++) {
      var arg = args[i];
      var name = arg.name;
      var v = void 0;
      if (arg.literal) {
        v = arg.value;
      } else {
        if (arg.structured) {
          v = Polymer.Path.get(data, name);
          if (v === undefined) {
            v = props[name];
          }
        } else {
          v = data[name];
        }
      }
      if (arg.wildcard) {
        var baseChanged = name.indexOf(path + '.') === 0;
        var matches = path.indexOf(name) === 0 && !baseChanged;
        values[i] = {
          path: matches ? path : name,
          value: matches ? props[path] : v,
          base: v
        };
      } else {
        values[i] = v;
      }
    }
    return values;
  }
  function _notifySplices(inst, array, path, splices) {
    var splicesPath = path + '.splices';
    inst.notifyPath(splicesPath, { indexSplices: splices });
    inst.notifyPath(path + '.length', array.length);
    inst.__data[splicesPath] = { indexSplices: null };
  }
  function notifySplice(inst, array, path, index, addedCount, removed) {
    _notifySplices(inst, array, path, [{
      index: index,
      addedCount: addedCount,
      removed: removed,
      object: array,
      type: 'splice'
    }]);
  }
  function upper(name) {
    return name[0].toUpperCase() + name.substring(1);
  }
  Polymer.PropertyEffects = Polymer.dedupingMixin(function (superClass) {
    var propertyEffectsBase = Polymer.TemplateStamp(Polymer.PropertyAccessors(superClass));

    var PropertyEffects = function (_propertyEffectsBase) {
      babelHelpers.inherits(PropertyEffects, _propertyEffectsBase);

      function PropertyEffects() {
        babelHelpers.classCallCheck(this, PropertyEffects);

        var _this5 = babelHelpers.possibleConstructorReturn(this, (PropertyEffects.__proto__ || Object.getPrototypeOf(PropertyEffects)).call(this));

        _this5.__dataClientsReady;
        _this5.__dataPendingClients;
        _this5.__dataToNotify;
        _this5.__dataLinkedPaths;
        _this5.__dataHasPaths;
        _this5.__dataCompoundStorage;
        _this5.__dataHost;
        _this5.__dataTemp;
        _this5.__dataClientsInitialized;
        _this5.__data;
        _this5.__dataPending;
        _this5.__dataOld;
        _this5.__computeEffects;
        _this5.__reflectEffects;
        _this5.__notifyEffects;
        _this5.__propagateEffects;
        _this5.__observeEffects;
        _this5.__readOnly;
        _this5.__dataCounter;
        _this5.__templateInfo;
        return _this5;
      }

      babelHelpers.createClass(PropertyEffects, [{
        key: '_initializeProperties',
        value: function _initializeProperties() {
          babelHelpers.get(PropertyEffects.prototype.__proto__ || Object.getPrototypeOf(PropertyEffects.prototype), '_initializeProperties', this).call(this);
          hostStack.registerHost(this);
          this.__dataClientsReady = false;
          this.__dataPendingClients = null;
          this.__dataToNotify = null;
          this.__dataLinkedPaths = null;
          this.__dataHasPaths = false;
          this.__dataCompoundStorage = this.__dataCompoundStorage || null;
          this.__dataHost = this.__dataHost || null;
          this.__dataTemp = {};
          this.__dataClientsInitialized = false;
        }
      }, {
        key: '_initializeProtoProperties',
        value: function _initializeProtoProperties(props) {
          this.__data = Object.create(props);
          this.__dataPending = Object.create(props);
          this.__dataOld = {};
        }
      }, {
        key: '_initializeInstanceProperties',
        value: function _initializeInstanceProperties(props) {
          var readOnly = this[TYPES.READ_ONLY];
          for (var prop in props) {
            if (!readOnly || !readOnly[prop]) {
              this.__dataPending = this.__dataPending || {};
              this.__dataOld = this.__dataOld || {};
              this.__data[prop] = this.__dataPending[prop] = props[prop];
            }
          }
        }
      }, {
        key: '_addPropertyEffect',
        value: function _addPropertyEffect(property, type, effect) {
          this._createPropertyAccessor(property, type == TYPES.READ_ONLY);
          var effects = ensureOwnEffectMap(this, type)[property];
          if (!effects) {
            effects = this[type][property] = [];
          }
          effects.push(effect);
        }
      }, {
        key: '_removePropertyEffect',
        value: function _removePropertyEffect(property, type, effect) {
          var effects = ensureOwnEffectMap(this, type)[property];
          var idx = effects.indexOf(effect);
          if (idx >= 0) {
            effects.splice(idx, 1);
          }
        }
      }, {
        key: '_hasPropertyEffect',
        value: function _hasPropertyEffect(property, type) {
          var effects = this[type];
          return Boolean(effects && effects[property]);
        }
      }, {
        key: '_hasReadOnlyEffect',
        value: function _hasReadOnlyEffect(property) {
          return this._hasPropertyEffect(property, TYPES.READ_ONLY);
        }
      }, {
        key: '_hasNotifyEffect',
        value: function _hasNotifyEffect(property) {
          return this._hasPropertyEffect(property, TYPES.NOTIFY);
        }
      }, {
        key: '_hasReflectEffect',
        value: function _hasReflectEffect(property) {
          return this._hasPropertyEffect(property, TYPES.REFLECT);
        }
      }, {
        key: '_hasComputedEffect',
        value: function _hasComputedEffect(property) {
          return this._hasPropertyEffect(property, TYPES.COMPUTE);
        }
      }, {
        key: '_setPendingPropertyOrPath',
        value: function _setPendingPropertyOrPath(path, value, shouldNotify, isPathNotification) {
          if (isPathNotification || Polymer.Path.root(Array.isArray(path) ? path[0] : path) !== path) {
            if (!isPathNotification) {
              var old = Polymer.Path.get(this, path);
              path = Polymer.Path.set(this, path, value);
              if (!path || !babelHelpers.get(PropertyEffects.prototype.__proto__ || Object.getPrototypeOf(PropertyEffects.prototype), '_shouldPropertyChange', this).call(this, path, value, old)) {
                return false;
              }
            }
            this.__dataHasPaths = true;
            if (this._setPendingProperty(path, value, shouldNotify)) {
              computeLinkedPaths(this, path, value);
              return true;
            }
          } else {
            if (this.__dataHasAccessor && this.__dataHasAccessor[path]) {
              return this._setPendingProperty(path, value, shouldNotify);
            } else {
              this[path] = value;
            }
          }
          return false;
        }
      }, {
        key: '_setUnmanagedPropertyToNode',
        value: function _setUnmanagedPropertyToNode(node, prop, value) {
          if (value !== node[prop] || (typeof value === 'undefined' ? 'undefined' : babelHelpers.typeof(value)) == 'object') {
            node[prop] = value;
          }
        }
      }, {
        key: '_setPendingProperty',
        value: function _setPendingProperty(property, value, shouldNotify) {
          var isPath = this.__dataHasPaths && Polymer.Path.isPath(property);
          var prevProps = isPath ? this.__dataTemp : this.__data;
          if (this._shouldPropertyChange(property, value, prevProps[property])) {
            if (!this.__dataPending) {
              this.__dataPending = {};
              this.__dataOld = {};
            }
            if (!(property in this.__dataOld)) {
              this.__dataOld[property] = this.__data[property];
            }
            if (isPath) {
              this.__dataTemp[property] = value;
            } else {
              this.__data[property] = value;
            }
            this.__dataPending[property] = value;
            if (isPath || this[TYPES.NOTIFY] && this[TYPES.NOTIFY][property]) {
              this.__dataToNotify = this.__dataToNotify || {};
              this.__dataToNotify[property] = shouldNotify;
            }
            return true;
          }
          return false;
        }
      }, {
        key: '_setProperty',
        value: function _setProperty(property, value) {
          if (this._setPendingProperty(property, value, true)) {
            this._invalidateProperties();
          }
        }
      }, {
        key: '_invalidateProperties',
        value: function _invalidateProperties() {
          if (this.__dataReady) {
            this._flushProperties();
          }
        }
      }, {
        key: '_enqueueClient',
        value: function _enqueueClient(client) {
          this.__dataPendingClients = this.__dataPendingClients || [];
          if (client !== this) {
            this.__dataPendingClients.push(client);
          }
        }
      }, {
        key: '_flushClients',
        value: function _flushClients() {
          if (!this.__dataClientsReady) {
            this.__dataClientsReady = true;
            this._readyClients();
            this.__dataReady = true;
          } else {
            this.__enableOrFlushClients();
          }
        }
      }, {
        key: '__enableOrFlushClients',
        value: function __enableOrFlushClients() {
          var clients = this.__dataPendingClients;
          if (clients) {
            this.__dataPendingClients = null;
            for (var i = 0; i < clients.length; i++) {
              var client = clients[i];
              if (!client.__dataEnabled) {
                client._enableProperties();
              } else if (client.__dataPending) {
                client._flushProperties();
              }
            }
          }
        }
      }, {
        key: '_readyClients',
        value: function _readyClients() {
          this.__enableOrFlushClients();
        }
      }, {
        key: 'setProperties',
        value: function setProperties(props, setReadOnly) {
          for (var path in props) {
            if (setReadOnly || !this[TYPES.READ_ONLY] || !this[TYPES.READ_ONLY][path]) {
              this._setPendingPropertyOrPath(path, props[path], true);
            }
          }
          this._invalidateProperties();
        }
      }, {
        key: 'ready',
        value: function ready() {
          this._flushProperties();
          if (!this.__dataClientsReady) {
            this._flushClients();
          }
          if (this.__dataPending) {
            this._flushProperties();
          }
        }
      }, {
        key: '_propertiesChanged',
        value: function _propertiesChanged(currentProps, changedProps, oldProps) {
          var hasPaths = this.__dataHasPaths;
          this.__dataHasPaths = false;
          runComputedEffects(this, changedProps, oldProps, hasPaths);
          var notifyProps = this.__dataToNotify;
          this.__dataToNotify = null;
          this._propagatePropertyChanges(changedProps, oldProps, hasPaths);
          this._flushClients();
          runEffects(this, this[TYPES.REFLECT], changedProps, oldProps, hasPaths);
          runEffects(this, this[TYPES.OBSERVE], changedProps, oldProps, hasPaths);
          if (notifyProps) {
            runNotifyEffects(this, notifyProps, changedProps, oldProps, hasPaths);
          }
          if (this.__dataCounter == 1) {
            this.__dataTemp = {};
          }
        }
      }, {
        key: '_propagatePropertyChanges',
        value: function _propagatePropertyChanges(changedProps, oldProps, hasPaths) {
          if (this[TYPES.PROPAGATE]) {
            runEffects(this, this[TYPES.PROPAGATE], changedProps, oldProps, hasPaths);
          }
          var templateInfo = this.__templateInfo;
          while (templateInfo) {
            runEffects(this, templateInfo.propertyEffects, changedProps, oldProps, hasPaths, templateInfo.nodeList);
            templateInfo = templateInfo.nextTemplateInfo;
          }
        }
      }, {
        key: 'linkPaths',
        value: function linkPaths(to, from) {
          to = Polymer.Path.normalize(to);
          from = Polymer.Path.normalize(from);
          this.__dataLinkedPaths = this.__dataLinkedPaths || {};
          this.__dataLinkedPaths[to] = from;
        }
      }, {
        key: 'unlinkPaths',
        value: function unlinkPaths(path) {
          path = Polymer.Path.normalize(path);
          if (this.__dataLinkedPaths) {
            delete this.__dataLinkedPaths[path];
          }
        }
      }, {
        key: 'notifySplices',
        value: function notifySplices(path, splices) {
          var info = { path: '' };
          var array = Polymer.Path.get(this, path, info);
          _notifySplices(this, array, info.path, splices);
        }
      }, {
        key: 'get',
        value: function get(path, root) {
          return Polymer.Path.get(root || this, path);
        }
      }, {
        key: 'set',
        value: function set(path, value, root) {
          if (root) {
            Polymer.Path.set(root, path, value);
          } else {
            if (!this[TYPES.READ_ONLY] || !this[TYPES.READ_ONLY][path]) {
              if (this._setPendingPropertyOrPath(path, value, true)) {
                this._invalidateProperties();
              }
            }
          }
        }
      }, {
        key: 'push',
        value: function push(path) {
          var info = { path: '' };
          var array = Polymer.Path.get(this, path, info);
          var len = array.length;

          for (var _len = arguments.length, items = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            items[_key - 1] = arguments[_key];
          }

          var ret = array.push.apply(array, items);
          if (items.length) {
            notifySplice(this, array, info.path, len, items.length, []);
          }
          return ret;
        }
      }, {
        key: 'pop',
        value: function pop(path) {
          var info = { path: '' };
          var array = Polymer.Path.get(this, path, info);
          var hadLength = Boolean(array.length);
          var ret = array.pop();
          if (hadLength) {
            notifySplice(this, array, info.path, array.length, 0, [ret]);
          }
          return ret;
        }
      }, {
        key: 'splice',
        value: function splice(path, start, deleteCount) {
          var info = { path: '' };
          var array = Polymer.Path.get(this, path, info);
          if (start < 0) {
            start = array.length - Math.floor(-start);
          } else {
            start = Math.floor(start);
          }
          if (!start) {
            start = 0;
          }

          for (var _len2 = arguments.length, items = Array(_len2 > 3 ? _len2 - 3 : 0), _key2 = 3; _key2 < _len2; _key2++) {
            items[_key2 - 3] = arguments[_key2];
          }

          var ret = array.splice.apply(array, [start, deleteCount].concat(items));
          if (items.length || ret.length) {
            notifySplice(this, array, info.path, start, items.length, ret);
          }
          return ret;
        }
      }, {
        key: 'shift',
        value: function shift(path) {
          var info = { path: '' };
          var array = Polymer.Path.get(this, path, info);
          var hadLength = Boolean(array.length);
          var ret = array.shift();
          if (hadLength) {
            notifySplice(this, array, info.path, 0, 0, [ret]);
          }
          return ret;
        }
      }, {
        key: 'unshift',
        value: function unshift(path) {
          var info = { path: '' };
          var array = Polymer.Path.get(this, path, info);

          for (var _len3 = arguments.length, items = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
            items[_key3 - 1] = arguments[_key3];
          }

          var ret = array.unshift.apply(array, items);
          if (items.length) {
            notifySplice(this, array, info.path, 0, items.length, []);
          }
          return ret;
        }
      }, {
        key: 'notifyPath',
        value: function notifyPath(path, value) {
          var propPath = void 0;
          if (arguments.length == 1) {
            var info = { path: '' };
            value = Polymer.Path.get(this, path, info);
            propPath = info.path;
          } else if (Array.isArray(path)) {
            propPath = Polymer.Path.normalize(path);
          } else {
            propPath = path;
          }
          if (this._setPendingPropertyOrPath(propPath, value, true, true)) {
            this._invalidateProperties();
          }
        }
      }, {
        key: '_createReadOnlyProperty',
        value: function _createReadOnlyProperty(property, protectedSetter) {
          this._addPropertyEffect(property, TYPES.READ_ONLY);
          if (protectedSetter) {
            this['_set' + upper(property)] = function (value) {
              this._setProperty(property, value);
            };
          }
        }
      }, {
        key: '_createPropertyObserver',
        value: function _createPropertyObserver(property, methodName, dynamicFn) {
          var info = { property: property, methodName: methodName, dynamicFn: Boolean(dynamicFn) };
          this._addPropertyEffect(property, TYPES.OBSERVE, {
            fn: runObserverEffect, info: info, trigger: { name: property }
          });
          if (dynamicFn) {
            this._addPropertyEffect(methodName, TYPES.OBSERVE, {
              fn: runObserverEffect, info: info, trigger: { name: methodName }
            });
          }
        }
      }, {
        key: '_createMethodObserver',
        value: function _createMethodObserver(expression, dynamicFn) {
          var sig = parseMethod(expression);
          if (!sig) {
            throw new Error("Malformed observer expression '" + expression + "'");
          }
          createMethodEffect(this, sig, TYPES.OBSERVE, runMethodEffect, null, dynamicFn);
        }
      }, {
        key: '_createNotifyingProperty',
        value: function _createNotifyingProperty(property) {
          this._addPropertyEffect(property, TYPES.NOTIFY, {
            fn: runNotifyEffect,
            info: {
              eventName: CaseMap.camelToDashCase(property) + '-changed',
              property: property
            }
          });
        }
      }, {
        key: '_createReflectedProperty',
        value: function _createReflectedProperty(property) {
          var attr = CaseMap.camelToDashCase(property);
          if (attr[0] === '-') {
            console.warn('Property ' + property + ' cannot be reflected to attribute ' + attr + ' because "-" is not a valid starting attribute name. Use a lowercase first letter for the property thisead.');
          } else {
            this._addPropertyEffect(property, TYPES.REFLECT, {
              fn: runReflectEffect,
              info: {
                attrName: attr
              }
            });
          }
        }
      }, {
        key: '_createComputedProperty',
        value: function _createComputedProperty(property, expression, dynamicFn) {
          var sig = parseMethod(expression);
          if (!sig) {
            throw new Error("Malformed computed expression '" + expression + "'");
          }
          createMethodEffect(this, sig, TYPES.COMPUTE, runComputedEffect, property, dynamicFn);
        }
      }, {
        key: '_bindTemplate',
        value: function _bindTemplate(template, instanceBinding) {
          var templateInfo = this.constructor._parseTemplate(template);
          var wasPreBound = this.__templateInfo == templateInfo;
          if (!wasPreBound) {
            for (var prop in templateInfo.propertyEffects) {
              this._createPropertyAccessor(prop);
            }
          }
          if (instanceBinding) {
            templateInfo = Object.create(templateInfo);
            templateInfo.wasPreBound = wasPreBound;
            if (!wasPreBound && this.__templateInfo) {
              var last = this.__templateInfoLast || this.__templateInfo;
              this.__templateInfoLast = last.nextTemplateInfo = templateInfo;
              templateInfo.previousTemplateInfo = last;
              return templateInfo;
            }
          }
          return this.__templateInfo = templateInfo;
        }
      }, {
        key: '_stampTemplate',
        value: function _stampTemplate(template) {
          hostStack.beginHosting(this);
          var dom = babelHelpers.get(PropertyEffects.prototype.__proto__ || Object.getPrototypeOf(PropertyEffects.prototype), '_stampTemplate', this).call(this, template);
          hostStack.endHosting(this);
          var templateInfo = this._bindTemplate(template, true);
          templateInfo.nodeList = dom.nodeList;
          if (!templateInfo.wasPreBound) {
            var nodes = templateInfo.childNodes = [];
            for (var n = dom.firstChild; n; n = n.nextSibling) {
              nodes.push(n);
            }
          }
          dom.templateInfo = templateInfo;
          setupBindings(this, templateInfo);
          if (this.__dataReady) {
            runEffects(this, templateInfo.propertyEffects, this.__data, null, false, templateInfo.nodeList);
          }
          return dom;
        }
      }, {
        key: '_removeBoundDom',
        value: function _removeBoundDom(dom) {
          var templateInfo = dom.templateInfo;
          if (templateInfo.previousTemplateInfo) {
            templateInfo.previousTemplateInfo.nextTemplateInfo = templateInfo.nextTemplateInfo;
          }
          if (templateInfo.nextTemplateInfo) {
            templateInfo.nextTemplateInfo.previousTemplateInfo = templateInfo.previousTemplateInfo;
          }
          if (this.__templateInfoLast == templateInfo) {
            this.__templateInfoLast = templateInfo.previousTemplateInfo;
          }
          templateInfo.previousTemplateInfo = templateInfo.nextTemplateInfo = null;
          var nodes = templateInfo.childNodes;
          for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            node.parentNode.removeChild(node);
          }
        }
      }, {
        key: 'PROPERTY_EFFECT_TYPES',
        get: function get() {
          return TYPES;
        }
      }], [{
        key: 'addPropertyEffect',
        value: function addPropertyEffect(property, type, effect) {
          this.prototype._addPropertyEffect(property, type, effect);
        }
      }, {
        key: 'createPropertyObserver',
        value: function createPropertyObserver(property, methodName, dynamicFn) {
          this.prototype._createPropertyObserver(property, methodName, dynamicFn);
        }
      }, {
        key: 'createMethodObserver',
        value: function createMethodObserver(expression, dynamicFn) {
          this.prototype._createMethodObserver(expression, dynamicFn);
        }
      }, {
        key: 'createNotifyingProperty',
        value: function createNotifyingProperty(property) {
          this.prototype._createNotifyingProperty(property);
        }
      }, {
        key: 'createReadOnlyProperty',
        value: function createReadOnlyProperty(property, protectedSetter) {
          this.prototype._createReadOnlyProperty(property, protectedSetter);
        }
      }, {
        key: 'createReflectedProperty',
        value: function createReflectedProperty(property) {
          this.prototype._createReflectedProperty(property);
        }
      }, {
        key: 'createComputedProperty',
        value: function createComputedProperty(property, expression, dynamicFn) {
          this.prototype._createComputedProperty(property, expression, dynamicFn);
        }
      }, {
        key: 'bindTemplate',
        value: function bindTemplate(template) {
          return this.prototype._bindTemplate(template);
        }
      }, {
        key: '_addTemplatePropertyEffect',
        value: function _addTemplatePropertyEffect(templateInfo, prop, effect) {
          var hostProps = templateInfo.hostProps = templateInfo.hostProps || {};
          hostProps[prop] = true;
          var effects = templateInfo.propertyEffects = templateInfo.propertyEffects || {};
          var propEffects = effects[prop] = effects[prop] || [];
          propEffects.push(effect);
        }
      }, {
        key: '_parseTemplateNode',
        value: function _parseTemplateNode(node, templateInfo, nodeInfo) {
          var noted = babelHelpers.get(PropertyEffects.__proto__ || Object.getPrototypeOf(PropertyEffects), '_parseTemplateNode', this).call(this, node, templateInfo, nodeInfo);
          if (node.nodeType === Node.TEXT_NODE) {
            var parts = this._parseBindings(node.textContent, templateInfo);
            if (parts) {
              node.textContent = literalFromParts(parts) || ' ';
              addBinding(this, templateInfo, nodeInfo, 'text', 'textContent', parts);
              noted = true;
            }
          }
          return noted;
        }
      }, {
        key: '_parseTemplateNodeAttribute',
        value: function _parseTemplateNodeAttribute(node, templateInfo, nodeInfo, name, value) {
          var parts = this._parseBindings(value, templateInfo);
          if (parts) {
            var origName = name;
            var kind = 'property';
            if (name[name.length - 1] == '$') {
              name = name.slice(0, -1);
              kind = 'attribute';
            }
            var literal = literalFromParts(parts);
            if (literal && kind == 'attribute') {
              node.setAttribute(name, literal);
            }
            if (node.localName === 'input' && origName === 'value') {
              node.setAttribute(origName, '');
            }
            node.removeAttribute(origName);
            if (kind === 'property') {
              name = Polymer.CaseMap.dashToCamelCase(name);
            }
            addBinding(this, templateInfo, nodeInfo, kind, name, parts, literal);
            return true;
          } else {
            return babelHelpers.get(PropertyEffects.__proto__ || Object.getPrototypeOf(PropertyEffects), '_parseTemplateNodeAttribute', this).call(this, node, templateInfo, nodeInfo, name, value);
          }
        }
      }, {
        key: '_parseTemplateNestedTemplate',
        value: function _parseTemplateNestedTemplate(node, templateInfo, nodeInfo) {
          var noted = babelHelpers.get(PropertyEffects.__proto__ || Object.getPrototypeOf(PropertyEffects), '_parseTemplateNestedTemplate', this).call(this, node, templateInfo, nodeInfo);
          var hostProps = nodeInfo.templateInfo.hostProps;
          var mode = '{';
          for (var source in hostProps) {
            var parts = [{ mode: mode, source: source, dependencies: [source] }];
            addBinding(this, templateInfo, nodeInfo, 'property', '_host_' + source, parts);
          }
          return noted;
        }
      }, {
        key: '_parseBindings',
        value: function _parseBindings(text, templateInfo) {
          var parts = [];
          var lastIndex = 0;
          var m = void 0;
          while ((m = bindingRegex.exec(text)) !== null) {
            if (m.index > lastIndex) {
              parts.push({ literal: text.slice(lastIndex, m.index) });
            }
            var mode = m[1][0];
            var negate = Boolean(m[2]);
            var source = m[3].trim();
            var customEvent = false,
                notifyEvent = '',
                colon = -1;
            if (mode == '{' && (colon = source.indexOf('::')) > 0) {
              notifyEvent = source.substring(colon + 2);
              source = source.substring(0, colon);
              customEvent = true;
            }
            var signature = parseMethod(source);
            var dependencies = [];
            if (signature) {
              var args = signature.args,
                  methodName = signature.methodName;

              for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                if (!arg.literal) {
                  dependencies.push(arg);
                }
              }
              var dynamicFns = templateInfo.dynamicFns;
              if (dynamicFns && dynamicFns[methodName] || signature.static) {
                dependencies.push(methodName);
                signature.dynamicFn = true;
              }
            } else {
              dependencies.push(source);
            }
            parts.push({
              source: source, mode: mode, negate: negate, customEvent: customEvent, signature: signature, dependencies: dependencies,
              event: notifyEvent
            });
            lastIndex = bindingRegex.lastIndex;
          }
          if (lastIndex && lastIndex < text.length) {
            var literal = text.substring(lastIndex);
            if (literal) {
              parts.push({
                literal: literal
              });
            }
          }
          if (parts.length) {
            return parts;
          } else {
            return null;
          }
        }
      }, {
        key: '_evaluateBinding',
        value: function _evaluateBinding(inst, part, path, props, oldProps, hasPaths) {
          var value = void 0;
          if (part.signature) {
            value = runMethodEffect(inst, path, props, oldProps, part.signature);
          } else if (path != part.source) {
            value = Polymer.Path.get(inst, part.source);
          } else {
            if (hasPaths && Polymer.Path.isPath(path)) {
              value = Polymer.Path.get(inst, path);
            } else {
              value = inst.__data[path];
            }
          }
          if (part.negate) {
            value = !value;
          }
          return value;
        }
      }]);
      return PropertyEffects;
    }(propertyEffectsBase);

    PropertyEffectsType = PropertyEffects;
    return PropertyEffects;
  });
  var hostStack = {
    stack: [],
    registerHost: function registerHost(inst) {
      if (this.stack.length) {
        var host = this.stack[this.stack.length - 1];
        host._enqueueClient(inst);
      }
    },
    beginHosting: function beginHosting(inst) {
      this.stack.push(inst);
    },
    endHosting: function endHosting(inst) {
      var stackLen = this.stack.length;
      if (stackLen && this.stack[stackLen - 1] == inst) {
        this.stack.pop();
      }
    }
  };
})();

(function () {
  'use strict';

  Polymer.ElementMixin = Polymer.dedupingMixin(function (base) {
    var polymerElementBase = Polymer.PropertyEffects(base);
    var caseMap = Polymer.CaseMap;
    function ownPropertiesForClass(klass) {
      if (!klass.hasOwnProperty(JSCompiler_renameProperty('__ownProperties', klass))) {
        klass.__ownProperties = klass.hasOwnProperty(JSCompiler_renameProperty('properties', klass)) ? klass.properties : {};
      }
      return klass.__ownProperties;
    }
    function ownObserversForClass(klass) {
      if (!klass.hasOwnProperty(JSCompiler_renameProperty('__ownObservers', klass))) {
        klass.__ownObservers = klass.hasOwnProperty(JSCompiler_renameProperty('observers', klass)) ? klass.observers : [];
      }
      return klass.__ownObservers;
    }
    function flattenProperties(flattenedProps, props) {
      for (var p in props) {
        var o = props[p];
        if (typeof o == 'function') {
          o = { type: o };
        }
        flattenedProps[p] = o;
      }
      return flattenedProps;
    }
    function propertiesForClass(klass) {
      if (!klass.hasOwnProperty(JSCompiler_renameProperty('__classProperties', klass))) {
        klass.__classProperties = flattenProperties({}, ownPropertiesForClass(klass));
        var superCtor = Object.getPrototypeOf(klass.prototype).constructor;
        if (superCtor.prototype instanceof PolymerElement) {
          klass.__classProperties = Object.assign(Object.create(propertiesForClass(superCtor)), klass.__classProperties);
        }
      }
      return klass.__classProperties;
    }
    function propertyDefaultsForClass(klass) {
      if (!klass.hasOwnProperty(JSCompiler_renameProperty('__classPropertyDefaults', klass))) {
        klass.__classPropertyDefaults = null;
        var props = propertiesForClass(klass);
        for (var p in props) {
          var info = props[p];
          if ('value' in info) {
            klass.__classPropertyDefaults = klass.__classPropertyDefaults || {};
            klass.__classPropertyDefaults[p] = info;
          }
        }
      }
      return klass.__classPropertyDefaults;
    }
    function hasClassFinalized(klass) {
      return klass.hasOwnProperty(JSCompiler_renameProperty('__finalized', klass));
    }
    function finalizeClassAndSuper(klass) {
      var proto = klass.prototype;
      var superCtor = Object.getPrototypeOf(proto).constructor;
      if (superCtor.prototype instanceof PolymerElement) {
        superCtor.finalize();
      }
      finalizeClass(klass);
    }
    function finalizeClass(klass) {
      klass.__finalized = true;
      var proto = klass.prototype;
      if (klass.hasOwnProperty(JSCompiler_renameProperty('is', klass)) && klass.is) {
        Polymer.telemetry.register(proto);
      }
      var props = ownPropertiesForClass(klass);
      if (props) {
        finalizeProperties(proto, props);
      }
      var observers = ownObserversForClass(klass);
      if (observers) {
        finalizeObservers(proto, observers, props);
      }
      var template = klass.template;
      if (template) {
        if (typeof template === 'string') {
          var t = document.createElement('template');
          t.innerHTML = template;
          template = t;
        } else {
          template = template.cloneNode(true);
        }
        proto._template = template;
      }
    }
    function finalizeProperties(proto, properties) {
      for (var p in properties) {
        createPropertyFromConfig(proto, p, properties[p], properties);
      }
    }
    function finalizeObservers(proto, observers, dynamicFns) {
      for (var i = 0; i < observers.length; i++) {
        proto._createMethodObserver(observers[i], dynamicFns);
      }
    }
    function createPropertyFromConfig(proto, name, info, allProps) {
      if (info.computed) {
        info.readOnly = true;
      }
      if (info.computed && !proto._hasReadOnlyEffect(name)) {
        proto._createComputedProperty(name, info.computed, allProps);
      }
      if (info.readOnly && !proto._hasReadOnlyEffect(name)) {
        proto._createReadOnlyProperty(name, !info.computed);
      }
      if (info.reflectToAttribute && !proto._hasReflectEffect(name)) {
        proto._createReflectedProperty(name);
      }
      if (info.notify && !proto._hasNotifyEffect(name)) {
        proto._createNotifyingProperty(name);
      }
      if (info.observer) {
        proto._createPropertyObserver(name, info.observer, allProps[info.observer]);
      }
    }
    function finalizeTemplate(proto, template, baseURI, is, ext) {
      var cssText = Polymer.StyleGather.cssFromTemplate(template, baseURI) + Polymer.StyleGather.cssFromModuleImports(is);
      if (cssText) {
        var style = document.createElement('style');
        style.textContent = cssText;
        template.content.insertBefore(style, template.content.firstChild);
      }
      if (window.ShadyCSS) {
        window.ShadyCSS.prepareTemplate(template, is, ext);
      }
      proto._bindTemplate(template);
    }

    var PolymerElement = function (_polymerElementBase) {
      babelHelpers.inherits(PolymerElement, _polymerElementBase);

      function PolymerElement() {
        babelHelpers.classCallCheck(this, PolymerElement);
        return babelHelpers.possibleConstructorReturn(this, (PolymerElement.__proto__ || Object.getPrototypeOf(PolymerElement)).apply(this, arguments));
      }

      babelHelpers.createClass(PolymerElement, [{
        key: '_initializeProperties',
        value: function _initializeProperties() {
          Polymer.telemetry.instanceCount++;
          this.constructor.finalize();
          var importPath = this.constructor.importPath;
          if (this._template && !this._template.__polymerFinalized) {
            this._template.__polymerFinalized = true;
            var baseURI = importPath ? Polymer.ResolveUrl.resolveUrl(importPath) : '';
            finalizeTemplate(this.__proto__, this._template, baseURI, this.localName);
          }
          babelHelpers.get(PolymerElement.prototype.__proto__ || Object.getPrototypeOf(PolymerElement.prototype), '_initializeProperties', this).call(this);
          this.rootPath = Polymer.rootPath;
          this.importPath = importPath;
          var p$ = propertyDefaultsForClass(this.constructor);
          if (!p$) {
            return;
          }
          for (var p in p$) {
            var info = p$[p];
            if (!this.hasOwnProperty(p)) {
              var value = typeof info.value == 'function' ? info.value.call(this) : info.value;
              if (this._hasAccessor(p)) {
                this._setPendingProperty(p, value, true);
              } else {
                this[p] = value;
              }
            }
          }
        }
      }, {
        key: 'connectedCallback',
        value: function connectedCallback() {
          if (window.ShadyCSS && this._template) {
            window.ShadyCSS.styleElement(this);
          }
          this._enableProperties();
        }
      }, {
        key: 'disconnectedCallback',
        value: function disconnectedCallback() {}
      }, {
        key: 'ready',
        value: function ready() {
          if (this._template) {
            this.root = this._stampTemplate(this._template);
            this.$ = this.root.$;
          }
          babelHelpers.get(PolymerElement.prototype.__proto__ || Object.getPrototypeOf(PolymerElement.prototype), 'ready', this).call(this);
        }
      }, {
        key: '_readyClients',
        value: function _readyClients() {
          if (this._template) {
            this.root = this._attachDom(this.root);
          }
          babelHelpers.get(PolymerElement.prototype.__proto__ || Object.getPrototypeOf(PolymerElement.prototype), '_readyClients', this).call(this);
        }
      }, {
        key: '_attachDom',
        value: function _attachDom(dom) {
          if (this.attachShadow) {
            if (dom) {
              if (!this.shadowRoot) {
                this.attachShadow({ mode: 'open' });
              }
              this.shadowRoot.appendChild(dom);
              return this.shadowRoot;
            }
            return null;
          } else {
            throw new Error('ShadowDOM not available. ' + 'Polymer.Element can create dom as children instead of in ' + 'ShadowDOM by setting `this.root = this;\` before \`ready\`.');
          }
        }
      }, {
        key: 'attributeChangedCallback',
        value: function attributeChangedCallback(name, old, value) {
          if (old !== value) {
            var property = caseMap.dashToCamelCase(name);
            var type = propertiesForClass(this.constructor)[property].type;
            if (!this._hasReadOnlyEffect(property)) {
              this._attributeToProperty(name, value, type);
            }
          }
        }
      }, {
        key: 'updateStyles',
        value: function updateStyles(properties) {
          if (window.ShadyCSS) {
            window.ShadyCSS.styleSubtree(this, properties);
          }
        }
      }, {
        key: 'resolveUrl',
        value: function resolveUrl(url, base) {
          if (!base && this.importPath) {
            base = Polymer.ResolveUrl.resolveUrl(this.importPath);
          }
          return Polymer.ResolveUrl.resolveUrl(url, base);
        }
      }], [{
        key: 'finalize',
        value: function finalize() {
          if (!hasClassFinalized(this)) {
            finalizeClassAndSuper(this);
          }
        }
      }, {
        key: '_parseTemplateContent',
        value: function _parseTemplateContent(template, templateInfo, nodeInfo) {
          templateInfo.dynamicFns = templateInfo.dynamicFns || propertiesForClass(this);
          return babelHelpers.get(PolymerElement.__proto__ || Object.getPrototypeOf(PolymerElement), '_parseTemplateContent', this).call(this, template, templateInfo, nodeInfo);
        }
      }, {
        key: 'observedAttributes',
        get: function get() {
          if (!this.hasOwnProperty(JSCompiler_renameProperty('__observedAttributes', this))) {
            var list = [];
            var properties = propertiesForClass(this);
            for (var prop in properties) {
              list.push(Polymer.CaseMap.camelToDashCase(prop));
            }
            this.__observedAttributes = list;
          }
          return this.__observedAttributes;
        }
      }, {
        key: 'template',
        get: function get() {
          if (!this.hasOwnProperty(JSCompiler_renameProperty('_template', this))) {
            this._template = Polymer.DomModule && Polymer.DomModule.import(this.is, 'template') || Object.getPrototypeOf(this.prototype).constructor.template;
          }
          return this._template;
        }
      }, {
        key: 'importPath',
        get: function get() {
          if (!this.hasOwnProperty(JSCompiler_renameProperty('_importPath', this))) {
            var module = Polymer.DomModule && Polymer.DomModule.import(this.is);
            this._importPath = module ? module.assetpath : '' || Object.getPrototypeOf(this.prototype).constructor.importPath;
          }
          return this._importPath;
        }
      }]);
      return PolymerElement;
    }(polymerElementBase);

    return PolymerElement;
  });
  Polymer.telemetry = {
    instanceCount: 0,
    registrations: [],
    _regLog: function _regLog(prototype) {
      console.log('[' + prototype.is + ']: registered');
    },
    register: function register(prototype) {
      this.registrations.push(prototype);
      Polymer.log && this._regLog(prototype);
    },
    dumpRegistrations: function dumpRegistrations() {
      this.registrations.forEach(this._regLog);
    }
  };
  Polymer.updateStyles = function (props) {
    if (window.ShadyCSS) {
      window.ShadyCSS.styleDocument(props);
    }
  };
})();

(function () {
  'use strict';

  var Element = Polymer.ElementMixin(HTMLElement);
  Polymer.Element = Element;
})();
//# sourceMappingURL=polymer.js.map
