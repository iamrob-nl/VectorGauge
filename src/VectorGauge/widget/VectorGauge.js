/*global logger*/
/*
    VectorGauge
    ========================

    @file      : VectorGauge.js
    @version   : 1.0.1
    @author    : Rob Duits
    @date      : 2018-8-16
    @copyright : Incentro 2018
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
    "dojo/text!VectorGauge/widget/template/VectorGauge.html",

    "VectorGauge/lib/velocity"
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, _jQuery, widgetTemplate) {
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

        // Parameters configured in the Modeler.
        mfToExecute: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,
        _readOnly: false,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            logger.debug(this.id + ".constructor");
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            logger.debug(this.id + ".postCreate");

            if (this.readOnly || this.get("disabled") || this.readonly) {
              this._readOnly = true;
            }

            this._updateRendering();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering(callback); // We're passing the callback to updateRendering to be called after DOM-manipulation
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {
          logger.debug(this.id + ".enable");
        },

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function () {
          logger.debug(this.id + ".disable");
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {
          logger.debug(this.id + ".resize");
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
          logger.debug(this.id + ".uninitialize");
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function (e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        // Attach events to HTML dom elements
        _setupEvents: function () {
            logger.debug(this.id + "._setupEvents");
            this.connect(this.colorSelectNode, "change", function (e) {
                // Function from mendix object to set an attribute.
                this._contextObj.set(this.backgroundColor, this.colorSelectNode.value);
            });

            this.connect(this.infoTextNode, "click", function (e) {
                // Only on mobile stop event bubbling!
                this._stopBubblingEventOnMobile(e);

                // If a microflow has been set execute the microflow on a click.
                if (this.mfToExecute !== "") {
                    this._execMf(this.mfToExecute, this._contextObj.getGuid());
                }
            });
        },

        _execMf: function (mf, guid, cb) {
            logger.debug(this.id + "._execMf");
            if (mf && guid) {
                mx.ui.action(mf, {
                    params: {
                        applyto: "selection",
                        guids: [guid]
                    },
                    callback: dojoLang.hitch(this, function (objs) {
                        if (cb && typeof cb === "function") {
                            cb(objs);
                        }
                    }),
                    error: function (error) {
                        console.debug(error.description);
                    }
                }, this);
            }
        },

        _customColor: function (gaugeArcBackground, gaugeArc, gaugeNeedle) {
            logger.debug(this.id + "._customColor");

            var color = this._contextObj ? this._contextObj.get(this.ColorPrimaryAttr) : "";

            $(gaugeArcBackground).attr({
                stroke: color,
                opacity: 0.25
            });

            $(gaugeArc).attr({
                stroke: color
            });

            $(gaugeNeedle + " polygon:nth-child(1)").attr({
                fill: color,
                stroke: "rgba(0, 0, 0, .5)"
            });

            $(gaugeNeedle + " polygon:nth-child(2)").attr({
                fill: "#000000",
                opacity: 0.15
            });

            $(gaugeNeedle + " circle").attr({
                fill: color,
                stroke: "rgba(0, 0, 0, .5)"
            });
        },

        _showVariable: function (value, widgetId) {
            if (this.showValueAttr === true) {
                var valueTxt = widgetId + " #" + this.valueTxt.id;
                $(valueTxt).text(value);
            }
        },

        _drawSVG: function () {
            logger.debug(this.id + "._drawSVG");

            // Widget configured variables
            var value = this._contextObj ? Number(this._contextObj.get(this.valueAttr)) : 0;
            var minValue = this._contextObj ? Number(this._contextObj.get(this.minValueAttr)) : 0;
            var maxValue = this._contextObj ? Number(this._contextObj.get(this.maxValueAttr)) : 100;

            // Variable SVG elements
            var widgetId = "#" + this.id;
            var gaugeArc = widgetId + " #" + this.gaugeArc.id;
            var gaugeNeedle = widgetId + " #" + this.gaugeNeedle.id;
            var gaugeArcBackground = widgetId + " #" + this.gaugeArcBackground.id;

            // display minimum and maximum values
            var minValueTxt = widgetId + " #" + this.minValueTxt.id;
            $(minValueTxt).text(minValue);

            var maxValueTxt = widgetId + " #" + this.maxValueTxt.id;
            $(maxValueTxt).text(maxValue);

            if (value >= maxValue) {
                value = maxValue;
            } else if (value <= minValue) {
                value = minValue;
            }

            // show the current variable in the gauge
            this._showVariable(value, widgetId);

            // Color customisations configured within the Widget
            this._customColor(gaugeArcBackground, gaugeArc, gaugeNeedle);

            // Calculate the arc rotation in % between 0 - 100
            var arcLength = $(widgetId + " #" + this.gaugeArc.id).get(0).getTotalLength();
            var arcString = $(widgetId + " #" + this.gaugeArc.id).attr("d");
            var archValue = arcLength - ((arcLength / maxValue) * value);
            var rotationValue = (270 / maxValue) * value;

            // animate the needle
            $(gaugeNeedle).velocity({
                rotateZ: rotationValue
            }, { duration: 1800, delay: 400 });

            $(gaugeArc)
                .velocity({
                    "stroke-dashoffset": arcLength,
                    "stroke-dasharray": arcLength
                }, 0)
                .velocity({
                    "stroke-dashoffset": archValue
                }, { duration: 1800, delay: 400 });

            // Increase this value to make every SVG use unique ID's
            this.counter.innerHTML = ++this._i;
        },

        _resetSVG: function () {
            logger.debug(this.id + "._resetSVG");
        },


        // Rerender the interface.
        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");

            // Draw or reload.
            if (this._contextObj !== null) {
                this._drawSVG();
            } else {
                // dojoStyle.set(this.domNode, "display", "none");
                this._drawSVG();
                // console.info('redraw');
            }

            // Important to clear all validations!
            this._clearValidations();

            // The callback, coming from update, needs to be executed, to let the page know it finished rendering
            this._executeCallback(callback, "_updateRendering");
        },


        // Handle validations.
        _handleValidation: function (validations) {
            logger.debug(this.id + "._handleValidation");
            this._clearValidations();

            var validation = validations[0],
                message = validation.getReasonByAttribute(this.backgroundColor);

            if (this._readOnly) {
                validation.removeAttribute(this.backgroundColor);
            } else if (message) {
                this._addValidation(message);
                validation.removeAttribute(this.backgroundColor);
            }
        },

        // Clear validations.
        _clearValidations: function () {
            logger.debug(this.id + "._clearValidations");
            dojoConstruct.destroy(this._alertDiv);
            this._alertDiv = null;
        },

        // Show an error message.
        _showError: function (message) {
            logger.debug(this.id + "._showError");
            if (this._alertDiv !== null) {
                dojoHtml.set(this._alertDiv, message);
                return true;
            }
            this._alertDiv = dojoConstruct.create("div", {
                "class": "alert alert-danger",
                "innerHTML": message
            });
            dojoConstruct.place(this._alertDiv, this.domNode);
        },

        // Add a validation.
        _addValidation: function (message) {
            logger.debug(this.id + "._addValidation");
            this._showError(message);
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            this.unsubscribeAll();

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });

                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.backgroundColor,
                    callback: dojoLang.hitch(this, function (guid, attr, attrValue) {
                        this._updateRendering();
                    })
                });

                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: dojoLang.hitch(this, this._handleValidation)
                });
            }
        },

        _executeCallback: function (cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["VectorGauge/widget/VectorGauge"]);
