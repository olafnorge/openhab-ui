;var Openhab = (function ($, window, document, undefined) {
    // have an own namespace inside of the scope
    if (!$.openhab) {
        $.openhab = {};
    }

    /**
     *
     * @param oldWidgets
     * @param newWidgets
     * @param widgetStack
     */
    var cleanWidgetStack = function (oldWidgets, newWidgets, widgetStack) {
        if (oldWidgets instanceof Array) {
            $.each(oldWidgets, function () {
                //noinspection JSUnresolvedVariable
                var widgetId = this.widgetId;
                var found = false;

                if (newWidgets instanceof Array) {
                    for (var index = 0; index < newWidgets.length; index++) {
                        //noinspection JSUnresolvedVariable
                        if (widgetId === newWidgets[index].widgetId) {
                            found = true;
                            break;
                        }
                    }
                } else if (newWidgets instanceof Object) {
                    //noinspection JSUnresolvedVariable
                    found = widgetId === newWidgets.widgetId;
                }

                if (!found && typeof widgetStack[widgetId] !== "undefined") {
                    delete widgetStack[widgetId];
                }
            });
        } else if (oldWidgets instanceof Object) {
            //noinspection JSUnresolvedVariable
            var widgetId = oldWidgets.widgetId;
            var found = false;

            if (newWidgets instanceof Array) {
                for (var index = 0; index < newWidgets.length; index++) {
                    //noinspection JSUnresolvedVariable
                    if (widgetId === newWidgets[index].widgetId) {
                        found = true;
                        break;
                    }
                }
            } else if (newWidgets instanceof Object) {
                //noinspection JSUnresolvedVariable
                found = widgetId === newWidgets.widgetId;
            }

            if (!found && typeof widgetStack[widgetId] !== "undefined") {
                delete widgetStack[widgetId];
            }
        }
    };

    var get = function (url, callback) {
        $.ajax({
            accepts: {
                "jsonp": "application/x-javascript"
            },
            cache: false,
            contentType: "text/plain",
            crossDomain: true,
            type: "GET",
            url: url,
            jsonpCallback: 'callback',
            dataType: "json",
            success: function (json) {
                callback && callback(json);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error({
                    "jqXHR": jqXHR,
                    "textStatus": textStatus,
                    "errorThrown": errorThrown
                });
            }
        });
    };

    var post = function (url, data, callback) {
        $.ajax({
            accepts: {
                "text": "application/x-javascript"
            },
            contentType: "text/plain",
            crossDomain: true,
            data: data.toString(),
            processData: false,
            type: "POST",
            url: url,
            jsonpCallback: 'callback',
            dataType: "text",
            success: function (json) {
                callback && callback(json);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error({
                    "jqXHR": jqXHR,
                    "textStatus": textStatus,
                    "errorThrown": errorThrown
                });
            }
        });
    };

    var load = function (link, callback) {
        get(link, function (json) {
            new $.openhab.Sitemap(json);
            callback && callback();
        });
    };

    var render = function () {
        window.scrollTo(0, 0);

        var sitemap = "default";

        if ($.openhab.hash !== '' && typeof window.sitemaps[$.openhab.hash] !== 'undefined') {
            sitemap = $.openhab.hash;
            $.openhab.hash = sitemap;
        } else {
            history.replaceState("", document.title, window.location.pathname + window.location.search);
            $.openhab.hash = sitemap;
        }

        $.each(window.sitemaps, function () {
            if (this.polling instanceof Object && typeof this.polling.abort === 'function') {
                if (this.definition.id !== $.openhab.hash) {
                    this.polling.abort();
                }
            }
        });

        if (window.sitemaps[sitemap] !== 'undefined' && window.sitemaps[sitemap] instanceof $.openhab.Sitemap) {
            window.sitemaps[sitemap].render();
        }
    };

    var renderLabel = function (label, id) {
        var labelText = label.labelText();
        var labelValue = label.labelValue();

        var container = $('<span></span>', {
            "id": id
        });

        if (labelValue) {
            container.text(labelText);
            $(container).append($("<span></span>", {
                "style": "color: #ff7200; float: right",
                "text": labelValue,
                "class": "label-value",
                "id": id + "-value"
            }));

            return container;
        }

        container.text(labelText);
        return container;
    };

    var elementReady = function (element, callback) {
        var node = $(element.get(0));
        var observer = new MutationObserver(function (mutations) {
            mutations.some(function (mutation) {
                if ($(mutation.addedNodes).find("#" + node.attr("id"))) {
                    observer.disconnect();
                    observer.takeRecords();
                    callback(node);
                }

                return true;
            }.bind(node));
        }.bind(node));

        observer.observe(document, {
            attributes: false,
            characterData: false,
            childList: true,
            subtree: true
        });

        return true;
    };

    $.openhab.Openhab = function (base) {
        $.openhab.this = this;
        $.openhab.base = base ? base : "http://demo.openhab.org:8080";
        $.openhab.hash = location.hash.substr(1);

        $(window).on({
            "hashchange": function () {
                $.openhab.hash = location.hash.substr(1);
                render();
            },
            "openhab:sitemap:ready": function () {
                if (--window.sitemapCount === 0) {
                    render();
                }
            }
        });

        // prepare containers on the page
        $("body").append($("<div></div>", {
            "id": "navigation"
        })).append($("<div></div>", {
            "class": "container-fluid",
            "id": "content"
        }));
        $("#navigation").append($("<nav></nav>", {
            "class": "navbar navbar-default navbar-fixed-top",
            "id": "navigation-navbar"
        }));
        $("#navigation-navbar").append($("<div></div>", {
            "class": "container-fluid",
            "id": "navigation-navbar-container-fluid"
        }));
        $("#navigation-navbar-container-fluid").append($("<div></div>", {
            "class": "navbar-header",
            "id": "navigation-navbar-header"
        }));

        window.sitemapCount = 0;
        window.sitemaps = {};

        // get all the sitemaps
        get($.openhab.base + "/rest/sitemaps", function (json) {
            window.sitemapCount = json.sitemap.length;

            // iterate over each sitemap
            $.each(json.sitemap, function () {
                var $this = this;

                $("#navigation-navbar-header").append($("<a></a>", {
                    "class": "navbar-brand",
                    "href": "#" + $this.name,
                    "id": "navigation-navbar-header-" + $this.name,
                    "name": $this.name,
                    "text": $this.label
                }).on("click", function (event) {
                    event.preventDefault();

                    if (typeof window.sitemaps[$this.name] !== 'undefined' && window.sitemaps[$this.name].polling instanceof Object && typeof window.sitemaps[$this.name].polling.abort === 'function') {
                        window.sitemaps[$this.name].polling.abort();
                    }

                    load($this.homepage.link, function () {
                        location.hash = $this.name;
                        render();
                    });
                }));

                // get the sitemap
                load($this.homepage.link);
            });
        });
    };

    $.openhab.Colorpicker = function (definition, widgetStack, parent) {
        var $this = this;
        $this.parent = parent;

        // flatten definition
        //noinspection JSUnresolvedVariable
        $this.definition = {
            "icon": definition.icon,
            "id": definition.widgetId,
            "label": definition.label,
            "link": definition.item.link,
            "name": definition.item.name,
            "state": definition.item.state
        };

        // add to websocket stack
        widgetStack[$this.definition.id] = $this;

        // listen on updates from the websocket
        $($this).on("openhab:update:" + $this.definition.id, function (event, definition) {
            if (definition.item.state !== $this.definition.state) {
                $this.definition.icon = definition.icon;
                $this.definition.label = definition.label;
                $this.definition.state = definition.item.state;

                $("#row-" + $this.definition.id).replaceWith($this.render());
            }
        });

        // add myself to the stack
        $this.parent.children[$this.definition.id] = $this;

        // trigger that i am ready to render
        $($this.parent).trigger("openhab:child:ready:" + $this.parent.definition.id);
    };

    $.openhab.Colorpicker.prototype.render = function () {
        var $this = this;

        var HSVtoRGB = function (hsvString) {
            return tinycolor({
                h: hsvString.split(",")[0],
                s: hsvString.split(",")[1],
                v: hsvString.split(",")[2]
            }).toRgbString();
        };
        var HSVtoHEX = function (hsvString) {
            return tinycolor({
                h: hsvString.split(",")[0],
                s: hsvString.split(",")[1],
                v: hsvString.split(",")[2]
            }).toHexString();
        };
        var RGBtoHSV = function (rgbString) {
            var hsv = tinycolor(rgbString).toHsv();
            return {h: Math.round(hsv.h), s: Math.round(hsv.s * 100), v: Math.round(hsv.v * 100)};
        };
        var HEXtoHSV = function (hexString) {
            var hsv = tinycolor(hexString).toHsv();
            return {h: Math.round(hsv.h), s: Math.round(hsv.s * 100), v: Math.round(hsv.v * 100)};
        };

        var hexColor = HSVtoHEX($this.definition.state);
        var hsv = {
            h: $this.definition.state.split(',')[0],
            s: $this.definition.state.split(',')[1],
            v: $this.definition.state.split(',')[2]
        };

        var colorpicker = $("<input>", {
            "type": "hidden",
            "value": hexColor
        });
        var button = $("<input>", {
            "checked": hsv.v > 0,
            "style": "float: right",
            "type": "checkbox"
        });

        elementReady(colorpicker, function (node) {
            node.minicolors({
                animationSpeed: 0,
                changeDelay: 250,
                control: "wheel",
                format: "hex",
                defaultValue: hexColor,
                theme: 'bootstrap',
                position: 'bottom right',
                change: function (value) {
                    if (value != hexColor) {
                        var hsv = HEXtoHSV(value);
                        post($this.definition.link, hsv.h + "," + hsv.s + "," + hsv.v);
                    }
                }
            });
        });
        elementReady(button, function (node) {
            var wrapper = colorpicker.closest("div.minicolors");

            node.bootstrapSwitch({
                "state": hsv.v > 0,
                "animate": false,
                "onSwitchChange": function (event, state) {
                    wrapper.toggle();

                    if (state) {
                        post($this.definition.link, "ON", function () {
                            var savedHsv = JSON.parse($(node).data('hsv'));
                            var hexColor = HSVtoHEX(savedHsv.h + "," + savedHsv.s + "," + (savedHsv.v > 0 ? savedHsv.v : "100"));
                            colorpicker.minicolors("value", hexColor);
                        });
                    } else {
                        post($this.definition.link, "OFF", function () {
                            node.data('hsv', JSON.stringify(HEXtoHSV(colorpicker.minicolors("value"))));
                        });
                    }
                }
            });

            if (hsv.v > 0) {
                node.data('hsv', JSON.stringify(HEXtoHSV(colorpicker.minicolors("value"))));
            } else {
                wrapper.hide();
                node.data('hsv', JSON.stringify(hsv));
            }
        });

        var row = $("<div></div>", {
            "class": "row",
            "id": "row-" + $this.definition.id
        }).append($("<div></div>", {
            "class": "col-xs-1",
            "id": "col-xs-1-" + $this.definition.id
        }).append($("<img>", {
            "src": $.openhab.base + "/images/" + $this.definition.icon + ".png",
            "class": "img-rounded img-responsive",
            "id": "img-rounded-" + $this.definition.id
        }))).append($("<div></div>", {
            "class": "col-xs-11",
            "id": "col-xs-11-" + $this.definition.id
        }).append(renderLabel($this.definition.label, "col-xs-11-label-" + $this.definition.id)).append(button).append(colorpicker));

        return row;
    };

    $.openhab.Chart = function (definition, widgetStack, parent) {
        var $this = this;
        $this.parent = parent;

        // flatten definition
        //noinspection JSUnresolvedVariable
        $this.definition = {
            "icon": definition.icon,
            "id": definition.widgetId,
            "label": definition.label,
            "link": $.openhab.base + "/chart?groups=" + definition.item.name,
            "name": definition.item.name,
            "period": definition.period,
            "refresh": definition.refresh,
            "service": definition.service
        };

        // add to websocket stack
        widgetStack[$this.definition.id] = $this;

        // listen on updates from the websocket
        $($this).on("openhab:update:" + $this.definition.id, function (event, definition) {
            if (definition.period !== $this.definition.period || definition.refresh !== $this.definition.refresh) {
                $this.definition.icon = definition.icon;
                $this.definition.label = definition.label;
                $this.definition.link = $.openhab.base + "/chart?groups=" + definition.item.name;
                $this.definition.name = definition.item.name;
                $this.definition.period = definition.period;
                $this.definition.refresh = definition.refresh;
                $this.definition.service = definition.service;

                $("#row-" + $this.definition.id).replaceWith($this.render());
            }
        });

        // add myself to the stack
        $this.parent.children[$this.definition.id] = $this;

        // trigger that i am ready to render
        $($this.parent).trigger("openhab:child:ready:" + $this.parent.definition.id);
    };

    $.openhab.Chart.prototype.render = function () {
        var $this = this;
        var link = $this.definition.link + "&period=" + $this.definition.period + "&service=" + $this.definition.service;

        var row = $("<div></div>", {
            "class": "embed-responsive embed-responsive-16by9",
            "id": "row-" + $this.definition.id
        }).append($("<img>", {
            "src": link + "&buster=" + Math.round(new Date().getTime() / 1000),
            "class": "embed-responsive-item",
            "id": "embed-responsive-item-" + $this.definition.id
        }));

        if ($this.definition.refresh) {
            setInterval(function () {
                $("#embed-responsive-item-" + $this.definition.id).attr("src", link + "&buster=" + Math.round(new Date().getTime() / 1000));
            }, $this.definition.refresh);
        }

        return row;
    };

    $.openhab.Frame = function (definition, widgetStack, parent) {
        var $this = this;
        $this.parent = parent;

        // flatten definition
        //noinspection JSUnresolvedVariable
        $this.definition = {
            "icon": definition.icon,
            "id": definition.widgetId,
            "label": definition.label
        };

        // add to websocket stack
        widgetStack[$this.definition.id] = $this;

        // listen on updates from the websocket
        $($this).on("openhab:update:" + $this.definition.id, function (event, definition) {
            if ($this.widgets !== definition.widget) {
                cleanWidgetStack($this.widgets, definition.widget, widgetStack);

                // redraw everything
                if ($this.widgets.length !== definition.widget.length) {
                    $this.widgets = definition.widget;
                    $this.children = {};
                    $("#panel-" + $this.definition.id).replaceWith($this.render());
                } else { // propagate to children
                    $this.widgets = definition.widget;
                    $this.children = {};

                    if (definition.widget instanceof Array) {
                        $.each(definition.widget, function () {
                            //noinspection JSUnresolvedVariable
                            if (typeof widgetStack[this.widgetId] === "undefined") {
                                $this.children = {};
                                $("#panel-" + $this.definition.id).replaceWith($this.render());
                            } else {
                                //noinspection JSUnresolvedVariable
                                $(widgetStack[this.widgetId]).trigger("openhab:update:" + this.widgetId, [this]);
                            }
                        });
                    } else if (definition.widget instanceof Object) {
                        //noinspection JSUnresolvedVariable
                        if (typeof widgetStack[definition.widget.widgetId] === "undefined") {
                            $this.children = {};
                            $("#panel-" + $this.definition.id).replaceWith($this.render());
                        } else {
                            //noinspection JSUnresolvedVariable
                            $(widgetStack[definition.widget.widgetId]).trigger("openhab:update:" + definition.widget.widgetId, [definition.widget]);
                        }
                    } else {
                        throw new TypeError("Can not find type.");
                    }
                }
            }
        });

        // init container to hold children
        $this.children = {};
        $this.widgetStack = widgetStack;
        $this.widgets = definition.widget;

        $this.parent.children[$this.definition.id] = $this;

        // trigger that i am ready to render
        $($this.parent).trigger("openhab:child:ready:" + $this.parent.definition.id);
    };

    $.openhab.Frame.prototype.render = function () {
        var $this = this;

        if ($this.widgets instanceof Array) {
            // iterate over all widgets of the frame
            $.each($this.widgets, function () {
                try {
                    new $.openhab[this.type](this, $this.widgetStack, $this);
                } catch (exception) {
                    console.error(exception);
                }
            });
        } else if ($this.widgets instanceof Object) {
            // load widget of the frame
            try {
                new $.openhab[$this.widgets.type]($this.widgets, $this.widgetStack, $this);
            } catch (exception) {
                console.error(exception);
            }
        } else {
            throw new TypeError("Can not find type.");
        }

        var panel = $("<div></div>", {
            "class": "panel panel-default",
            "id": "panel-" + $this.definition.id
        });
        var heading = $this.definition.label ? $("<div></div>", {
            "class": "panel-heading",
            "id": "panel-heading-" + $this.definition.id
        }) : null;
        var label = $this.definition.label ? renderLabel($this.definition.label, "panel-heading-label-" + $this.definition.id) : null;
        var ul = $this.children ? $("<ul></ul>", {
            "class": "list-group",
            "id": "list-group-" + $this.definition.id
        }) : null;

        $.each(Object.keys($this.children).sort(), function (index, value) {
            var li = $("<li></li>", {
                "class": "list-group-item",
                "id": "list-group-item-" + $this.children[value].definition.id
            });

            $(li).append($this.children[value].render());
            $(ul).append(li);
        });

        label && $(heading).append(label);
        heading && $(panel).append(heading);
        ul && $(panel).append(ul);

        return panel;
    };

    $.openhab.Group = function (definition, widgetStack, parent) {
        // extend from type Text, because they are very similar
        $.openhab.Text.apply(this, [definition, widgetStack, parent]);
    };

    $.openhab.Group.prototype.render = function () {
        // extend from type Text, because they are very similar
        return $.openhab.Text.prototype.render.apply(this);
    };

    $.openhab.Image = function (definition, widgetStack, parent) {
        var $this = this;
        $this.parent = parent;

        // flatten definition
        //noinspection JSUnresolvedVariable
        $this.definition = {
            "icon": definition.icon,
            "id": definition.widgetId,
            "label": definition.label,
            "link": definition.url,
            "refresh": definition.refresh
        };

        // add to websocket stack
        widgetStack[$this.definition.id] = $this;

        // listen on updates from the websocket
        $($this).on("openhab:update:" + $this.definition.id, function (event, definition) {
            if (definition.url !== $this.definition.link) {
                $this.definition.icon = definition.icon;
                $this.definition.label = definition.label;
                $this.definition.link = definition.url;

                $("#row-" + $this.definition.id).replaceWith($this.render());
            }
        });

        // add myself to the stack
        $this.parent.children[$this.definition.id] = $this;

        // trigger that i am ready to render
        $($this.parent).trigger("openhab:child:ready:" + $this.parent.definition.id);
    };

    $.openhab.Image.prototype.render = function () {
        var $this = this;

        var row = $("<div></div>", {
            "class": "embed-responsive embed-responsive-16by9",
            "id": "row-" + $this.definition.id
        }).append($("<img>", {
            "src": $this.definition.link + "&buster=" + Math.round(new Date().getTime() / 1000),
            "class": "embed-responsive-item",
            "id": "embed-responsive-item-" + $this.definition.id
        }));

        if ($this.definition.refresh) {
            setInterval(function () {
                $("#embed-responsive-item-" + $this.definition.id).attr("src", $this.definition.link + "&buster=" + Math.round(new Date().getTime() / 1000));
            }, $this.definition.refresh);
        }

        return row;
    };

    $.openhab.List = function (definition, widgetStack, parent) {
        var $this = this;
        $this.parent = parent;

        /** // add to websocket stack
         widgetStack[$this.definition.id] = $this;

         // listen on updates from the websocket
         $($this).on("openhab:update:" + $this.definition.id, function (event, definition) {
            if (definition.item.state !== $this.definition.state) {
                $this.definition.icon = definition.icon;
                $this.definition.label = definition.label;
                $this.definition.state = definition.item.state;

                $("#row-" + $this.definition.id).replaceWith($this.render());
            }
        });

         */

        // add myself to the stack
        $this.parent.children[$this.definition.id] = $this;

        // trigger that i am ready to render
        $($this.parent).trigger("openhab:child:ready:" + $this.parent.definition.id);
    };

    $.openhab.List.prototype.render = function () {
        return "List renderer";
    };

    $.openhab.Selection = function (definition, widgetStack, parent) {
        var $this = this;
        $this.parent = parent;

        // flatten definition
        //noinspection JSUnresolvedVariable
        $this.definition = {
            "icon": definition.icon,
            "id": definition.widgetId,
            "label": definition.label,
            "link": definition.item.link,
            "mapping": typeof definition.mapping === 'undefined' ? null : definition.mapping,
            "name": definition.item.name,
            "state": definition.item.state
        };

        // add to websocket stack
        widgetStack[$this.definition.id] = $this;

        // listen on updates from the websocket
        $($this).on("openhab:update:" + $this.definition.id, function (event, definition) {
            if (definition.item.state !== $this.definition.state) {
                $this.definition.icon = definition.icon;
                $this.definition.label = definition.label;
                $this.definition.state = definition.item.state;

                $("#row-" + $this.definition.id).replaceWith($this.render());
            }
        });

        // add myself to the stack
        $this.parent.children[$this.definition.id] = $this;

        // trigger that i am ready to render
        $($this.parent).trigger("openhab:child:ready:" + $this.parent.definition.id);
    };

    $.openhab.Selection.prototype.render = function () {
        var $this = this;

        if ($this.definition.mapping && $this.definition.mapping instanceof Array) {
            var ul = $("<ul></ul>", {
                "aria-labelledby": "dropdowntoggle-" + $this.definition.id,
                "class": "dropdown-menu dropdown-menu-right"
            });
            var selection = $("<div></div>", {
                "class": "dropdown",
                "style": "float: right"
            }).append($("<button></button>", {
                "aria-expanded": true,
                "aria-haspopup": true,
                "class": "btn btn-default dropdown-toggle",
                "data-toggle": "dropdown",
                "id": "dropdowntoggle-" + $this.definition.id,
                "text": $this.definition.label,
                "type": "button"
            }).append($("<span></span>", {
                "class": "caret",
                "style": "margin-left: 5px"
            }))).append(ul);

            $.each(Object.keys($this.definition.mapping).sort(), function (index, value) {
                ul.append($("<li></li>").append($("<a></a>", {
                    "href": "#",
                    "text": $this.definition.mapping[value].label
                }).on({
                    "click": function () {
                        event.preventDefault();
                        //noinspection JSUnresolvedVariable
                        post($this.definition.link, $this.definition.mapping[value].command);
                    }
                })));
            });
        } else {
            var selection = $("<button></button>", {
                "class": "btn btn-primary",
                "style": "float: right",
                "text": $this.definition.mapping.label,
                "type": "button"
            }).on({
                "click": function () {
                    //noinspection JSUnresolvedVariable
                    post($this.definition.link, $this.definition.mapping.command)
                }
            });
        }

        var row = $("<div></div>", {
            "class": "row",
            "id": "row-" + $this.definition.id
        }).append($("<div></div>", {
            "class": "col-xs-1",
            "id": "col-xs-1-" + $this.definition.id
        }).append($("<img>", {
            "src": $.openhab.base + "/images/" + $this.definition.icon + ".png",
            "class": "img-rounded img-responsive",
            "id": "img-rounded-" + $this.definition.id
        }))).append($("<div></div>", {
            "class": "col-xs-11",
            "id": "col-xs-11-" + $this.definition.id
        }).append(renderLabel($this.definition.label, "col-xs-11-label-" + $this.definition.id)).append(selection));

        return row;
    };

    $.openhab.Setpoint = function (definition, widgetStack, parent) {
        var $this = this;
        $this.parent = parent;

        // flatten definition
        //noinspection JSUnresolvedVariable
        $this.definition = {
            "icon": definition.icon,
            "id": definition.widgetId,
            "label": definition.label,
            "link": definition.item.link,
            "max": definition.maxValue,
            "min": definition.minValue,
            "name": definition.item.name,
            "state": definition.item.state,
            "step": definition.step
        };

        // add to websocket stack
        widgetStack[$this.definition.id] = $this;

        // listen on updates from the websocket
        $($this).on("openhab:update:" + $this.definition.id, function (event, definition) {
            if (definition.item.state !== $this.definition.state) {
                $this.definition.icon = definition.icon;
                $this.definition.label = definition.label;
                $this.definition.state = definition.item.state;

                $("#row-" + $this.definition.id).replaceWith($this.render());
            }
        });

        // add myself to the stack
        $this.parent.children[$this.definition.id] = $this;

        // trigger that i am ready to render
        $($this.parent).trigger("openhab:child:ready:" + $this.parent.definition.id);
    };

    $.openhab.Setpoint.prototype.render = function () {
        var $this = this;

        var tooltip = $("<div></div>", {
            "style": "text-align: right; position: absolute; font-size: medium; top: -35px; left: -10px; color: #fff; opacity: 0.8; white-space: nowrap; background-color: #000; padding: 2px 3px; width: 35px",
            "text": parseFloat($this.definition.state)
        });
        var setpoint = $("<div></div>", {
            "style": "width: 95%; float: left; height: 32px"
        }).slider({
            animate: false,
            max: parseFloat($this.definition.max),
            min: parseFloat($this.definition.min),
            step: parseFloat($this.definition.step),
            value: parseFloat($this.definition.state),
            stop: function (event, ui) {
                post($this.definition.link, parseFloat(ui.value).toString());
            },
            slide: function (event, ui) {
                tooltip.text(ui.value);
                tooltip.show();
            }
        });

        elementReady(setpoint, function (node) {
            var slider = node.find(".ui-slider-handle");
            slider.append(tooltip);
            tooltip.hide();
            slider.hover(function () {
                tooltip.show();
            }, function () {
                tooltip.hide();
            });
            slider.css({
                "height": "38px",
                "width": "38px"
            });
        });

        var row = $("<div></div>", {
            "class": "row",
            "id": "row-" + $this.definition.id
        }).append($("<div></div>", {
            "class": "col-xs-1",
            "id": "col-xs-1-" + $this.definition.id
        }).append($("<img>", {
            "src": $.openhab.base + "/images/" + $this.definition.icon + ".png",
            "class": "img-rounded img-responsive",
            "id": "img-rounded-" + $this.definition.id
        }))).append($("<div></div>", {
            "class": "col-xs-11",
            "id": "col-xs-11-" + $this.definition.id
        }).append(renderLabel($this.definition.label, "col-xs-11-label-" + $this.definition.id)).append($("<br>")).append(setpoint));

        return row;
    };

    $.openhab.Sitemap = function (definition, parent) {
        var $this = this;
        $this.parent = parent;

        $this.findParent = function (parent) {
            return (!parent || typeof parent["parent"] === 'undefined') ? null : parent.parent;
        };

        // flatten definition
        $this.definition = {
            "id": definition.id,
            "label": definition.title,
            "link": definition.link
        };

        // init container to hold children
        $this.children = {};
        $this.widgetStack = {};
        $this.widgets = definition.widget;

        $this.polling = null;
        $this.poll = function () {
            return $.ajax({
                accepts: {
                    "jsonp": "application/x-javascript"
                },
                cache: false,
                contentType: "text/plain",
                crossDomain: true,
                type: "GET",
                url: $this.definition.link,
                jsonpCallback: 'callback',
                dataType: "json",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('X-Atmosphere-Transport', 'long-polling');
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (textStatus !== 'abort') {
                        console.error(jqXHR);
                        console.error(textStatus);
                        console.error(errorThrown);
                        console.error({
                            "jqXHR": jqXHR,
                            "textStatus": textStatus,
                            "errorThrown": errorThrown
                        });

                        $this.polling = $this.poll();
                    }
                },
                success: function (json) {
                    $this.polling.abort();
                    $this.polling = $this.poll();
                    callback(json);
                }
            });
        };

        var callback = function (json) {
            if ($this.widgets !== json.widget) {
                cleanWidgetStack($this.widgets, json.widget, $this.widgetStack);

                // redraw everything
                if ($this.widgets.length !== json.widget.length) {
                    $this.widgets = json.widget;
                    $this.children = {};
                    $this.widgetStack = {};
                    $this.render();
                } else { // propagate to children
                    $this.widgets = json.widget;
                    $this.children = {};

                    if (json.widget instanceof Array) {
                        $.each(json.widget, function () {
                            if (typeof $this.widgetStack[this.widgetId] === "undefined") {
                                $this.children = {};
                                $this.render();
                            } else {
                                //noinspection JSUnresolvedVariable
                                $($this.widgetStack[this.widgetId]).trigger("openhab:update:" + this.widgetId, [this]);
                            }
                        });
                    } else if (json.widget instanceof Object) {
                        if (typeof $this.widgetStack[json.widget.widgetId] === "undefined") {
                            $this.children = {};
                            $this.render();
                        } else {
                            //noinspection JSUnresolvedVariable
                            $($this.widgetStack[json.widget.widgetId]).trigger("openhab:update:" + json.widget.widgetId, [json.widget]);
                        }
                    } else {
                        throw new TypeError("Can not find type.");
                    }
                }
            }
        };

        window.sitemaps[$this.definition.id] = $this;
        $(window).trigger("openhab:sitemap:ready");
    };

    $.openhab.Sitemap.prototype.render = function () {
        var $this = this;

        // use polling for sitemap changes
        $this.polling !== null && $this.polling.abort();
        $this.polling = $this.poll();

        if ($this.widgets instanceof Array) {
            // iterate over all widgets of the frame
            $.each($this.widgets, function () {
                try {
                    new $.openhab[this.type](this, $this.widgetStack, $this);
                } catch (exception) {
                    console.error(exception);
                }
            });
        } else if ($this.widgets instanceof Object) {
            // load widget of the frame
            try {
                new $.openhab[$this.widgets.type]($this.widgets, $this.widgetStack, $this);
            } catch (exception) {
                console.error(exception);
            }
        } else {
            throw new TypeError("Can not find type.");
        }

        document.title = (function (me) {
            var $this = me;
            var titles = [$this.definition.label.trim()];
            var parent = $this.parent;

            do {
                parent = $this.findParent(parent);

                if (parent && parent.definition.label && !titles.includes(parent.definition.label.trim())) {
                    titles.push(parent.definition.label.trim());
                }
            } while (parent);

            return titles.reverse().join(' » ');
        })($this);

        $("#content").empty();
        $.each(Object.keys($this.children).sort(), function (index, value) {
            $('#content').append($this.children[value].render());
        });
    };

    $.openhab.Slider = function (definition, widgetStack, parent) {
        var $this = this;
        $this.parent = parent;

        // flatten definition
        //noinspection JSUnresolvedVariable
        $this.definition = {
            "frequency": definition.sendFrequency,
            "icon": definition.icon,
            "id": definition.widgetId,
            "label": definition.label,
            "link": definition.item.link,
            "name": definition.item.name,
            "state": definition.item.state,
            "switch": definition.switchSupport
        };

        // add to websocket stack
        widgetStack[$this.definition.id] = $this;

        // listen on updates from the websocket
        $($this).on("openhab:update:" + $this.definition.id, function (event, definition) {
            if (definition.item.state !== $this.definition.state) {
                $this.definition.icon = definition.icon;
                $this.definition.label = definition.label;
                $this.definition.state = definition.item.state;

                $("#row-" + $this.definition.id).replaceWith($this.render());
            }
        });

        // add myself to the stack
        $this.parent.children[$this.definition.id] = $this;

        // trigger that i am ready to render
        $($this.parent).trigger("openhab:child:ready:" + $this.parent.definition.id);
    };

    $.openhab.Slider.prototype.render = function () {
        var $this = this;

        var tooltip = $("<div></div>", {
            "style": "text-align: right; position: absolute; font-size: medium; top: -35px; left: -10px; color: #fff; opacity: 0.8; white-space: nowrap; background-color: #000; padding: 2px 3px; width: 35px",
            "text": parseFloat($this.definition.state)
        });
        var setpoint = $("<div></div>", {
            "style": "width: 95%; float: left; height: 32px; padding-right: 50px" + ($this.definition.switch === "true" ? "; margin-top: 10px" : "")
        }).slider({
            animate: false,
            max: 100.0,
            min: 0.0,
            step: 1,
            value: parseFloat($this.definition.state),
            stop: function (event, ui) {
                $this.definition.state = parseFloat(ui.value).toString();
                post($this.definition.link, parseFloat(ui.value).toString());
            },
            slide: function (event, ui) {
                tooltip.text(ui.value);
                tooltip.show();
            }
        });

        elementReady(setpoint, function (node) {
            var slider = node.find(".ui-slider-handle");
            slider.append(tooltip);
            tooltip.hide();
            slider.hover(function () {
                tooltip.show();
            }, function () {
                tooltip.hide();
            });
            slider.css({
                "height": "38px",
                "width": "38px"
            });
        });

        var col = $("<div></div>", {
            "class": "col-xs-11",
            "id": "col-xs-11-" + $this.definition.id
        }).append(renderLabel($this.definition.label, "col-xs-11-label-" + $this.definition.id));

        if ($this.definition.switch === "true") {
            var button = $("<input>", {
                "checked": $this.definition.state > 0,
                "id": "col-xs-11-button-" + $this.definition.id,
                "name": "col-xs-11-button-" + $this.definition.id,
                "style": "float: right",
                "type": "checkbox"
            });

            elementReady(button, function (node) {
                node.bootstrapSwitch({
                    "animate": false,
                    "onSwitchChange": function (event, state) {
                        post($this.definition.link, state ? "ON" : "OFF");
                    },
                    "state": $this.definition.state > 0
                });
            });

            col.append(button);
        }

        col.append($("<br>")).append(setpoint);

        var row = $("<div></div>", {
            "class": "row",
            "id": "row-" + $this.definition.id
        }).append($("<div></div>", {
            "class": "col-xs-1",
            "id": "col-xs-1-" + $this.definition.id
        }).append($("<img>", {
            "src": $.openhab.base + "/images/" + $this.definition.icon + ".png",
            "class": "img-rounded img-responsive",
            "id": "img-rounded-" + $this.definition.id
        }))).append(col);

        return row;
    };

    $.openhab.Switch = function (definition, widgetStack, parent) {
        var $this = this;
        $this.parent = parent;

        // flatten definition
        //noinspection JSUnresolvedVariable
        $this.definition = {
            "icon": definition.icon,
            "id": definition.widgetId,
            "label": definition.label,
            "link": definition.item.link,
            "mapping": typeof definition.mapping === 'undefined' ? null : definition.mapping,
            "name": definition.item.name,
            "state": definition.item.state
        };

        // add to websocket stack
        widgetStack[$this.definition.id] = $this;

        // listen on updates from the websocket
        $($this).on("openhab:update:" + $this.definition.id, function (event, definition) {
            if (definition.item.state !== $this.definition.state) {
                $this.definition.icon = definition.icon;
                $this.definition.label = definition.label;
                $this.definition.state = definition.item.state;

                $("#row-" + $this.definition.id).replaceWith($this.render());
            }
        });

        // add myself to the stack
        $this.parent.children[$this.definition.id] = $this;

        // trigger that i am ready to render
        $($this.parent).trigger("openhab:child:ready:" + $this.parent.definition.id);
    };

    $.openhab.Switch.prototype.render = function () {
        var $this = this;

        if ($this.definition.mapping) {
            if ($this.definition.mapping instanceof Array) {
                var button = $("<span></span>", {
                    "style": "float: right"
                });

                $.each(Object.keys($this.definition.mapping).sort(), function (index, value) {
                    //noinspection JSUnresolvedVariable
                    var mapping = $("<button></button>", {
                        "class": "btn btn-" + ($this.definition.state === $this.definition.mapping[value].command ? "default" : "primary"),
                        "text": $this.definition.mapping[value].label,
                        "style": "margin-left: 5px; margin-bottom: 5px",
                        "type": "button"
                    }).on({
                        "click": function () {
                            //noinspection JSUnresolvedVariable
                            post($this.definition.link, $this.definition.mapping[value].command);
                        }
                    });
                    button.append(mapping);
                });
            } else {
                var button = $("<button></button>", {
                    "class": "btn btn-primary",
                    "id": "col-xs-11-button-" + $this.definition.id,
                    "style": "float: right",
                    "text": $this.definition.mapping.label,
                    "type": "button"
                }).on({
                    "click": function () {
                        //noinspection JSUnresolvedVariable
                        post($this.definition.link, $this.definition.mapping.command);
                    }
                });
            }
        } else {
            var button = $("<input>", {
                "checked": $this.definition.state == "ON",
                "id": "col-xs-11-button-" + $this.definition.id,
                "name": "col-xs-11-button-" + $this.definition.id,
                "style": "float: right",
                "type": "checkbox"
            });

            elementReady(button, function (node) {
                node.bootstrapSwitch({
                    "animate": false,
                    "onSwitchChange": function (event, state) {
                        post($this.definition.link, state ? "ON" : "OFF");
                    },
                    "state": $this.definition.state == "ON"
                });
            });
        }

        var row = $("<div></div>", {
            "class": "row",
            "id": "row-" + $this.definition.id
        }).append($("<div></div>", {
            "class": "col-xs-1",
            "id": "col-xs-1-" + $this.definition.id
        }).append($("<img>", {
            "src": $.openhab.base + "/images/" + $this.definition.icon + ".png",
            "class": "img-rounded img-responsive",
            "id": "img-rounded-" + $this.definition.id
        }))).append($("<div></div>", {
            "class": "col-xs-11",
            "id": "col-xs-11-" + $this.definition.id
        }).append(renderLabel($this.definition.label, "col-xs-11-label-" + $this.definition.id)).append(button));

        return row;
    };

    $.openhab.Text = function (definition, widgetStack, parent) {
        var $this = this;
        $this.parent = parent;

        // flatten definition
        //noinspection JSUnresolvedVariable
        $this.definition = {
            "child": null,
            "icon": definition.icon,
            "id": definition.widgetId,
            "label": definition.label,
            "link": null,
            "name": null,
            "sitemap": null,
            "state": null
        };

        if (typeof definition.item !== 'undefined') {
            // extend type definition
            $this.definition = $.extend($this.definition, {
                "link": definition.item.link,
                "name": definition.item.name,
                "state": definition.item.state
            });
        }

        //noinspection JSUnresolvedVariable
        if (typeof definition.linkedPage !== 'undefined') {
            // extend type definition
            //noinspection JSUnresolvedVariable
            $this.definition = $.extend($this.definition, {
                "child": definition.linkedPage.id,
                "sitemap": definition.linkedPage.link
            });
        }

        // add to websocket stack
        widgetStack[$this.definition.id] = $this;

        // listen on updates from the websocket
        $($this).on("openhab:update:" + $this.definition.id, function (event, definition) {
            if (typeof definition["item"] !== 'undefined' && typeof definition.item["state"] !== 'undefined' && definition.item.state !== $this.definition.state) {
                $this.definition.icon = definition.icon;
                $this.definition.label = definition.label;
                $this.definition.state = definition.item.state;

                $("#row-" + $this.definition.id).replaceWith($this.render());
            }
        });

        // add myself to the stack
        $this.parent.children[$this.definition.id] = $this;

        // trigger that i am ready to render
        $($this.parent).trigger("openhab:child:ready:" + $this.parent.definition.id);
    };

    $.openhab.Text.prototype.render = function () {
        var $this = this;

        var label = $this.definition.child ?
            $("<a></a>", {
                "href": "#" + $this.definition.child,
                "style": "display: block; height: 32px",
                "id": "col-xs-11-href-" + $this.definition.id
            }).append($("<span></span>", {
                "class": "glyphicon glyphicon-chevron-right",
                "style": "float: right; margin-left: 5px",
                "id": "col-xs-11-glyphicon-" + $this.definition.id
            })).append(renderLabel($this.definition.label, "col-xs-11-label-" + $this.definition.id)).on("click", function (event) {
                event.preventDefault();

                get($this.definition.sitemap, function (json) {
                    location.hash = $this.definition.child;
                    new $.openhab.Sitemap(json, $this);
                });
            })
            : renderLabel($this.definition.label, "col-xs-11-label-" + $this.definition.id);
        var row = $("<div></div>", {
            "class": "row",
            "id": "row-" + $this.definition.id
        }).append($("<div></div>", {
            "class": "col-xs-1",
            "id": "col-xs-1-" + $this.definition.id
        }).append($("<img>", {
            "src": $.openhab.base + "/images/" + $this.definition.icon + ".png",
            "class": "img-rounded img-responsive",
            "id": "img-rounded-" + $this.definition.id
        }))).append($("<div></div>", {
            "class": "col-xs-11",
            "id": "col-xs-11-" + $this.definition.id
        }).append(label));

        return row;
    };

    $.openhab.Video = function (definition, widgetStack, parent) {
        var $this = this;
        $this.parent = parent;

        // flatten definition
        //noinspection JSUnresolvedVariable
        $this.definition = {
            "encoding": definition.encoding,
            "icon": definition.icon,
            "id": definition.widgetId,
            "label": definition.label,
            "link": definition.url,
            "refresh": definition.refresh
        };

        // add to websocket stack
        widgetStack[$this.definition.id] = $this;

        // listen on updates from the websocket
        $($this).on("openhab:update:" + $this.definition.id, function (event, definition) {
            if (definition.item.state !== $this.definition.state) {
                $this.definition.icon = definition.icon;
                $this.definition.label = definition.label;
                $this.definition.link = definition.url;

                $("#row-" + $this.definition.id).replaceWith($this.render());
            }
        });

        // add myself to the stack
        $this.parent.children[$this.definition.id] = $this;

        // trigger that i am ready to render
        $($this.parent).trigger("openhab:child:ready:" + $this.parent.definition.id);
    };

    $.openhab.Video.prototype.render = function () {
        var $this = this;

        switch ($this.definition.encoding) {
            case "mjpeg":
                var video = $("<img>", {
                    "src": $this.definition.link,
                    "class": "embed-responsive-item",
                    "id": "video-" + $this.definition.id
                });
                break;
            default:
                var video = $("<video></video>", {
                    "class": "embed-responsive-item",
                    "id": "video-" + $this.definition.id
                }).append($("<source>", {
                    "src": $this.definition.link,
                    "id": "source-" + $this.definition.id
                }));
                break;
        }

        var row = $("<div></div>", {
            "class": "embed-responsive embed-responsive-16by9",
            "id": "row-" + $this.definition.id
        }).append(video);

        return row;
    };

    $.openhab.Webview = function (definition, widgetStack, parent) {
        var $this = this;
        $this.parent = parent;

        // flatten definition
        //noinspection JSUnresolvedVariable
        $this.definition = {
            "height": definition.height,
            "icon": definition.icon,
            "id": definition.widgetId,
            "label": definition.label,
            "link": definition.url,
            "refresh": definition.refresh
        };

        // add to websocket stack
        widgetStack[$this.definition.id] = $this;

        // listen on updates from the websocket
        $($this).on("openhab:update:" + $this.definition.id, function (event, definition) {
            /**
             * if (definition.item.state !== $this.definition.state) {
                $this.definition.icon = definition.icon;
                $this.definition.label = definition.label;
                $this.definition.link = definition.url;

                $("#row-" + $this.definition.id).replaceWith($this.render());
            }*/
        });

        // add myself to the stack
        $this.parent.children[$this.definition.id] = $this;

        // trigger that i am ready to render
        $($this.parent).trigger("openhab:child:ready:" + $this.parent.definition.id);
    };

    $.openhab.Webview.prototype.render = function () {
        var $this = this;

        var row = $("<div></div>", {
            "class": "embed-responsive embed-responsive-16by9",
            "id": "row-" + $this.definition.id,
            "style": "height: " + ($this.definition.height ? ($this.definition.height * 42) + "px" : "auto") + "; padding-bottom: 0"
        }).append($("<iframe></iframe>", {
            "class": "embed-responsive-item",
            "id": "embed-responsive-item-" + $this.definition.id,
            "src": $this.definition.link + "&buster=" + Math.round(new Date().getTime() / 1000),
            "style": "width: 100%; height: 100%"
        }));

        if ($this.definition.refresh) {
            setInterval(function () {
                $("#embed-responsive-item-" + $this.definition.id).attr("src", $this.definition.link + "&buster=" + Math.round(new Date().getTime() / 1000));
            }, $this.definition.refresh);
        }

        return row;
    };

    return $.openhab.Openhab;
})(jQuery, window, document);

if (!Array.prototype.last) {
    Array.prototype.last = function () {
        return this[this.length - 1];
    };
}

if (!String.prototype.labelText) {
    String.prototype.labelText = function () {
        var matches = this.match(/\[.*]/g);

        if (matches) {
            return this.replace(matches[0], "").trim();
        }

        return this.toString();
    };
}

if (!String.prototype.labelValue) {
    String.prototype.labelValue = function () {
        var matches = this.match(/\[.*]/g);

        if (matches) {
            return matches[0].replace(/\[/g, "").replace(/]/g, "").trim();
        }

        return "";
    };
}
