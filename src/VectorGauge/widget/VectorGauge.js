/*global logger, Snap, html, domStyle */
/*
    VectorGauge
    ========================

    @file      : VectorGauge.js
    @version   : 1.0.0
    @author    : Rob Duits
    @date      : 1/28/2016
    @copyright : Incentro 2016
    @license   : Apache 2

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",

    "VectorGauge/lib/jquery-1.11.2",
    "VectorGauge/lib/snap.svg",
    "dojo/text!VectorGauge/widget/template/VectorGauge.html"
], function(declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, _jQuery, snap, widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true);

    // Declare widget's prototype.
    return declare("VectorGauge.widget.VectorGauge", [ _WidgetBase, _TemplatedMixin ], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements
        svgGauge: null,
        gaugeArc: null,
        gaugeNeedle: null,
        _i: 0,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function() {
            // Uncomment the following line to enable debug messages
            logger.level(logger.DEBUG);
            logger.debug(this.id + ".constructor");
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function() {
            logger.debug(this.id + ".postCreate");
            //this._updateRendering();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function(obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering();

            if (typeof callback !== "undefined") {
              callback();
            }
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function() {
          logger.debug(this.id + ".enable");
        },

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function() {
          logger.debug(this.id + ".disable");
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function(box) {
          logger.debug(this.id + ".resize");
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function() {
          logger.debug(this.id + ".uninitialize");
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.

            logger.debug("need to redraw SVG");
            this._resetSVG();
            // this._drawSVG();
        },

        // Attach events to HTML dom elements
        _setupEvents: function() {
            //logger.debug(this.id + "._setupEvents");
        },

        _customColor: function(arcBG, arc, needle) {
          logger.debug(this.id + "._customColor");

          var color = this._contextObj ? this._contextObj.get(this.ColorPrimaryAttr) : "";

          arcBG.attr({
            stroke: color,
            opacity: 0.25
          });

          arc.attr({
            stroke: color
          });

          needle.select("polygon:nth-child(1)").attr({
            fill: color,
            stroke: "rgba(0, 0, 0, .5)"
          });
          needle.select("polygon:nth-child(2)").attr({
            fill: "#000000",
            opacity: 0.15
          });
          needle.select("circle").attr({
            fill: color,
            stroke: "rgba(0, 0, 0, .5)"
          });
        },

        _drawSVG: function() {
          logger.debug(this.id + "._drawSVG");

          // Widget configured variables
          var value = this._contextObj ? this._contextObj.get(this.valueAttr) : "";

          // Variable SVG elements
          var newId = "#" + this.id;
          var gaugeArc = newId + " #" + this.gaugeArc.id;
          var gaugeNeedle = newId + " #" + this.gaugeNeedle.id;
          var gaugeArcBackground = newId + " #" + this.gaugeArcBackground.id;


          // give elements a unique id
          $(gaugeArc).attr("id", this.id + "_" + this.gaugeArc.id);
          $(gaugeNeedle).attr("id", this.id + "_" + this.gaugeNeedle.id);
          $(gaugeArcBackground).attr("id", this.id + "_" + this.gaugeArcBackground.id);

          // Attach variable to existing SVG and select SVG elements
          var s = new Snap(newId);
          var arc = Snap.select("#" + this.gaugeArc.id);
          var needle = Snap.select("#" + this.gaugeNeedle.id);
          var arcBG = Snap.select(" #" + this.gaugeArcBackground.id);

          // Color customisations configured within the Widget
          this._customColor(arcBG, arc, needle);

          // Calculate the arc rotation in % between 0 - 100
          var arcLength = arc.getTotalLength();
          var arcString = arc.attr("d");
          var archValue = (arcLength / 100) * value;
          var rotationValue = (270 / 100) * value;
          arc.attr({ d: ""});

          // Animate rotatable elements
          needle.animate({
            transform: "r" + rotationValue + ", 160, 160"
          }, 1000);

          Snap.animate(0, archValue, function (val) {
            var arcSubPath = Snap.path.getSubpath(arcString, 0, val);
            arc.attr({
                d: arcSubPath
            });
          }, 1000);

          var f = s.filter(Snap.filter.blur(5, 10)),
          //var f = svg.paper.filter(Snap.filter.hueRotate(45));
          c = arc.attr({
            filter: f
          });

          // Increase this value to make every SVG use unique ID's
          this.counter.innerHTML = ++this._i;
        },

        _resetSVG: function () {
          logger.debug(this.id + "._resetSVG");
        },

        // Rerender the interface.
        _updateRendering: function() {
            logger.debug(this.id + "._updateRendering");

            // Draw or reload.
            if (this._contextObj !== null) {
              this._drawSVG();
            } else {
                // Hide widget dom node.
                dojoStyle.set(this.domNode, "display", "none");
            }

            // Important to clear all validations!
            this._clearValidations();
        },

        // Handle validations.
        _handleValidation: function (_validations) {
            this._clearValidations();

            var _validation = _validations[0],
                _message = _validation.getReasonByAttribute(this.jsonDataSource);

            if (this.readOnly) {
                _validation.removeAttribute(this.jsonDataSource);
            } else {
                if (_message) {
                    this._addValidation(_message);
                    _validation.removeAttribute(this.jsonDataSource);
                }
            }
        },

        // Clear validations.
        _clearValidations: function () {
            dojoConstruct.destroy(this._alertdiv);
            this._alertdiv = null;
        },

        // Show an error message.
        _showError: function (message) {
            console.log("[" + this.id + "] ERROR " + message);
            if (this._alertDiv !== null) {
                html.set(this._alertDiv, message);
                return true;
            }
            this._alertDiv = dojoConstruct.create("div", {
                "class": "alert alert-danger",
                "innerHTML": message
            });
            dojoConstruct.place(this.domNode, this._alertdiv);
        },

        // Add a validation.
        _addValidation: function (message) {
            this._showError(message);
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");

            var _objectHandle = null,
                _attrHandle = null,
                _validationHandle = null;

            // Release handles on previous object, if any.
            if (this._handles) {
                dojoArray.forEach(this._handles, function (handle, i) {
                    mx.data.unsubscribe(handle);
                });
                this._handles = [];
            }

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                _objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });

                _attrHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.jsonDataSource,
                    callback: dojoLang.hitch(this, function (guid, attr, attrValue) {
                        this._updateRendering();
                    })
                });

                _validationHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: dojoLang.hitch(this, this._handleValidation)
                });

                this._handles = [_objectHandle, _attrHandle, _validationHandle];
            }
        }
    });
});

require(["VectorGauge/widget/VectorGauge"], function() {
    "use strict";
});
