var html = '<h1>Hello from test-element</h1><p>[[prop1]]</p>';
var domHtml = '<dom-module id="test-element"></dom-module>';
//document.head.insertAdjacentHTML('beforeend', domHtml);
//var cModule = document.head.lastChild;
var template1 = document.createElement('template');
template1.innerHTML = html;
//cModule.appendChild(cTemplate);

console.info('Declaring test-element');

var TestElement = function (a) {
    function b() {
        babelHelpers.classCallCheck(this, b);
        var c = babelHelpers.possibleConstructorReturn(this, (b.__proto__ || Object.getPrototypeOf(b)).call(this));
        return console.info(b.is + ': Created'), c.prop1 = 'Created', c
    }
    return babelHelpers.inherits(b, a), babelHelpers.createClass(b, null, [{
        key: 'is',
        get: function () {
            return 'test-element'
        }
    }, {
        key: 'template',
        get: function () {
            return template1;
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

window.customElements.define(TestElement.is, TestElement);