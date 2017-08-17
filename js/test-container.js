var html = '<h1>Hello from test-container</h1><div style="border: 1px solid red"><test-element></test-element></div>';
var domHtml = '<dom-module id="test-container"></dom-module>';
//document.head.insertAdjacentHTML('beforeend', domHtml);
//var cModule = document.head.lastChild;
var template2 = document.createElement('template');
template2.innerHTML = html;
//cModule.appendChild(cTemplate);

console.info('Declaring test-container');

var TestContainer = function (a) {
    function b() {
        babelHelpers.classCallCheck(this, b);
        var c = babelHelpers.possibleConstructorReturn(this, (b.__proto__ || Object.getPrototypeOf(b)).call(this));
        return console.info(b.is + ': Created'), c.prop1 = 'Created', c
    }
    return babelHelpers.inherits(b, a), babelHelpers.createClass(b, null, [{
        key: 'is',
        get: function () {
            return 'test-container'
        }
    }, {
        key: 'template',
        get: function () {
            return template2;
        }
    }, {
        key: 'properties',
        get: function () {
            return {
                prop1: {
                    type: String,
                    value: 'Not Ready!'
                }
            }
        }
    }]), babelHelpers.createClass(b, [{
        key: 'connectedCallback',
        value: function () {
            babelHelpers.get(b.prototype.__proto__ || Object.getPrototypeOf(b.prototype), 'connectedCallback', this).call(this), console.info(b.is + ': Connected Callback'), this.prop1 = 'Connected Callback'
        }
    }, {
        key: 'ready',
        value: function () {
            babelHelpers.get(b.prototype.__proto__ || Object.getPrototypeOf(b.prototype), 'ready', this).call(this), console.info(b.is + ': Ready'), this.prop1 = 'Ready'
        }
    }]), b
}(Polymer.Element);

window.customElements.define(TestContainer.is, TestContainer);