'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/* ******************************************************
   PLUGINS
        - Currently used site-wide.
        - Put plugins here that you know will be used in many areas of the site
        - Libraries needed only in a single or few instance(s) can be called separately in the widget templates

        * INCLUDED IN THIS FILE:
            - ClickNav.js - v0.9.8.4 - http://nickgoodrum-templates.idevdesign.net/templates/nav/
            - Tiny slider - v2.9.1 - https://github.com/ganlanyuan/tiny-slider
            - Colorbox Popup - v1.6.4 - http://www.jacklmoore.com/colorbox/
            - Focus Overlay - v0.9.3 - https://github.com/MauriceMahan/FocusOverlay/
            - blazy - v1.8.2 - https://github.com/dinbror/blazy
            - svg4everybody - v2.1.9 - https://github.com/jonathantneal/svg4everybody
   ****************************************************** */

/*! CLICK NAVIGATION FUNCTIONALITY
* Version: 0.9.8.4
* Author: Nick Goodrum
* Licensed under MIT:
* http://www.opensource.org/licenses/mit-license.php
* Followed WAI-ARIA spec except for typing a letter key keyboard functionality (optional) and left/right moving to next previous main tiers
* TO DO - CONFIRM DATA-ATTRIBUTE APPROACH, EXTEND MEGA / SLIDING TO REDUCE CODE BASE, DETERMINE IF MORE OR LESS OF THE WAI-ARIA SPEC IS NEEDED */

(function (window, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(['jquery'], function ($) {
            return factory(window, $);
        });
    } else if ((typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object' && typeof exports.nodeName !== 'string') {
        module.exports = factory(window, require('jquery'));
    } else {
        factory(window, jQuery);
    }
})(typeof window !== "undefined" ? window : undefined, function (window, $) {
    'use strict';

    var ClickMenu = window.ClickMenu || {};

    /*----------- ADD DEBOUNCER -----------*/

    // Code from Underscore.js

    var debounce = function debounce(func, wait, immediate) {
        var timeout;
        return function () {
            var context = this,
                args = arguments;
            var later = function later() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    /*-----------  ADD PROTOTYPE FOR OLDER BROWSERS -----------*/
    if (!Function.prototype.bind) {
        Function.prototype.bind = function () {
            var fn = this,
                args = Array.prototype.slice.call(arguments),
                object = args.shift();
            return function () {
                return fn.apply(object, args.concat(Array.prototype.slice.call(arguments)));
            };
        };
    }

    ClickMenu = function () {

        function ClickMenu(element, settings) {
            var _ = this,
                dataSettings;

            _.defaults = {
                menutype: "dropdown",
                animationSpeed: 400,
                toggle: "toggle-menu",
                menu: "cm-menu",
                htmlClass: "cm-js-menu-active",
                expanderText: "expand / collapse",
                //TODO: Eventually add parentLi Selector option so they aren't only lis
                landings: false,
                expanders: false,
                singleClick: true,
                isAutoClose: true,
                isRTL: false
            };

            dataSettings = $(element).data() || {};

            _.options = $.extend({}, _.defaults, dataSettings, settings);

            _.menu = element;
            _.$menu = $(element);
            _.$menuBar = _.$menu.find("." + _.options.menu);
            _.$menuToggle = _.$menu.find("." + _.options.toggle);
            _.$html = $("html");
            _.touchStart = false;
            _.isActive = false;
            _.isToggled = false;
            _.leavingMenu = false;
            _.currentFocus = 0;
            _.initialLinks = [];
            _.currentLinks = [];

            // Add in proxies so _ scope ties to this function even when called via outside event bindings, etc.
            _.keyHandler = $.proxy(_.keyHandler, _);
            _.findCurrentLinks = $.proxy(_.findCurrentLinks, _);
            _.resetMenus = $.proxy(_.resetMenus, _);
            _.cleanUpEvents = $.proxy(_.cleanUpEvents, _);
            _.destroy = $.proxy(_.destroy, _);
            _.showMenu = $.proxy(_.showMenu, _);
            _.hideMenu = $.proxy(_.hideMenu, _);
            _.menuToggle = $.proxy(_.menuToggle, _);
            _.subMenuToggle = $.proxy(_.subMenuToggle, _);
            _.menuHandler = $.proxy(_.menuHandler, _);
            _.menuToggleHandler = $.proxy(_.menuToggleHandler, _);

            if (_.$menuBar.length > 0) {
                _.init();
            }
        }

        return ClickMenu;
    }();

    ClickMenu.prototype.init = function () {
        var _ = this;

        //Bind Toggle Function to expand/collapse menu in small screens
        _.$menuToggle.on("touchstart click", _.menuToggle);

        // Add Aria Aspects and initial classes to menu wrap and menu
        _.$menu.addClass("cm-js-enabled").attr({ "role": "navigation" });
        _.$menuBar.attr("role", "menubar");

        //If there are prior dropdowns you want to get the highest one and add to the numbers
        var idNum = 1;

        if ($("[id^='cm-dropdown']").last().length > 0) {
            var highestNum = 0;

            $("[id^='cm-dropdown']").each(function () {
                var currentNum = $(this).attr("id").split("dropdown")[1];

                highestNum = currentNum && highestNum < parseInt(currentNum, 10) ? parseInt(currentNum, 10) : highestNum;
            });

            idNum = highestNum + 1;
        }

        _.$menu.on('keydown', _.keyHandler);
        //With Firefox 52 support coming in - this is a clean solution for tab users to toggle open/close menus - but will need to possibly consider if focusin is worth the fighting
        _.$menuBar.on('focusin', _.showMenu);

        _.$menu.find("." + _.options.menu + " a").each(function () {
            var $anchor = $(this),
                $parentLi = $anchor.closest('li'),
                $sibling;

            $anchor.attr({ "role": "menuitem", "tabindex": "-1" });
            $parentLi.attr("role", "presentation");

            if (!$parentLi.data("type") && $parentLi.parent().hasClass(_.options.menu)) {
                $parentLi.attr('data-type', _.options.menutype);
            }

            // Have anchor do what it normally would do unless it has subs

            if ($anchor.siblings().not("a").length > 0 && $parentLi.attr("data-option") !== "openSubs") {
                //Style it up via class
                var $expandable = $anchor.siblings(),
                    newID = "cm-dropdown" + idNum;

                if (_.options.expanders) {
                    $sibling = $("<a id='" + newID + "' href='#' role='menuitem' aria-haspopup='true' class='has-sub' tabindex='-1'><span><span class='visually-hidden'>" + _.options.expanderText + " " + $anchor.text() + "</span></span></a>");
                    $anchor.wrap("<div class='expander-wrap'></div>").after($sibling);

                    $sibling.on("click", _.subMenuToggle);
                } else {
                    //if there is an ID use it and make sure the expandable item gets it otherwise add the new id created
                    if ($anchor.attr("id")) {
                        newID = $anchor.attr("id");
                    } else {
                        $anchor.attr("id", "cm-dropdown" + idNum);
                    }
                    // bind click functionality for anchors as well as aria / class
                    $anchor.attr({ "aria-haspopup": "true" }).addClass("has-sub").on("click", _.subMenuToggle);
                }

                var visibleAlready = $expandable.height() > 0 ? true : false;
                $expandable.attr({ "role": "menu", "aria-expanded": visibleAlready, "aria-hidden": !visibleAlready, "aria-labelledby": newID });

                if (_.options.landings && !_.options.expanders) {
                    var $duplicate = $expandable.is("ul") ? $("<li class='link-landing' role='presentation'>" + $anchor.get(0).outerHTML + "</li>") : $("<div class='link-landing' role='presentation'>" + $anchor.get(0).outerHTML + "</div>");
                    $duplicate.children().removeAttr("aria-haspopup class id");
                    $duplicate.find("a").removeClass("has-sub");
                    $expandable.prepend($duplicate);
                }

                if ($parentLi.data("type") && $parentLi.data("type") === "sliding") {
                    var $subMenu = $("<div class='sub-menu cm-js-inactive'></div>");

                    $expandable.wrap($subMenu);

                    var adjustMenu = function adjustMenu() {
                        var maxWidth = _.$menu.innerWidth(),
                            leftPosition = $parentLi.position().left,
                            $adjustable;

                        $adjustable = $parentLi.children(".sub-menu");
                        $adjustable.find("> ul > li > ul").innerWidth(maxWidth);

                        $adjustable.innerWidth(maxWidth).css("left", "-" + leftPosition + "px");
                    };

                    var debounceAdjustments = debounce(adjustMenu, 300);

                    $(window).load(function () {
                        adjustMenu();

                        $(window).resize(debounceAdjustments);
                    });
                }

                if (newID === "cm-dropdown" + idNum) {
                    idNum++;
                }
            }

            // ADD In Initial Links for main tier
            if ($anchor.closest("[role]:not(a)").is("[data-type]") && $anchor.is(":visible")) {
                _.initialLinks.push($anchor);

                if (_.options.expanders && $sibling) {
                    _.initialLinks.push($sibling);
                }
            }
        });

        _.currentLinks = _.initialLinks;

        if (_.currentLinks[_.currentFocus]) {
            _.currentLinks[_.currentFocus].attr("tabindex", "0");
        }

        _.$menu.trigger("init", [_]);
    };

    ClickMenu.prototype.keyHandler = function (e) {
        var _ = this,
            keyPress = e.keyCode;

        if (!_.$menu.hasClass("cm-js-inFocus") && keyPress !== 9) {
            _.$menu.addClass("cm-js-inFocus").attr("tabindex", "-1");
        }
        switch (keyPress) {
            //TAB
            case 9:
                _.$menu.removeClass("cm-js-inFocus");
                break;
            //LEFT UP RIGHT DOWN
            case 37:
            case 38:
            case 39:
            case 40:
                //Prevent Scrolling aspects from browser
                e.preventDefault();

                //Maintain currentLink since it will potentially be overwritten with the next focus
                var oldLink = _.currentLinks[_.currentFocus];

                //Don't do anything if in mid transition
                if (oldLink) {
                    var inMainTier = oldLink.closest("[role]:not(a)").is("[data-type]"),
                        next,
                        direction,
                        close,
                        open;

                    //IF LEFT / UP  (Depending on TIER) change next item to rotate to

                    if (inMainTier) {
                        // IF LEFT / RIGHT rotate to new item
                        if (keyPress === 37) {
                            direction = _.options.isRTL ? "next" : "prev";
                        } else if (keyPress === 39) {
                            direction = _.options.isRTL ? "prev" : "next";
                        } else if (keyPress === 40 || keyPress === 38) {
                            open = true;
                        }
                    } else {
                        // IF UP / DOWN rotate to new item - IF LEFT on sub subs close menu
                        if (keyPress === 38) {
                            direction = "prev";
                        } else if (keyPress === 40) {
                            direction = "next";
                        } else if (keyPress === 39) {
                            if (_.options.isRTL) {
                                close = true;
                            } else {
                                open = true;
                            }
                            //} else if ( ! inSecondTier && keyPress === 37 ) {
                        } else if (keyPress === 37) {
                            if (_.options.isRTL) {
                                open = true;
                            } else {
                                close = true;
                            }
                        }
                    }

                    if (direction) {

                        if (direction === "prev") {
                            //If there aren't any prior items move to last item in the list
                            _.currentFocus = _.currentFocus - 1 >= 0 ? _.currentFocus - 1 : _.currentLinks.length - 1;
                        } else {
                            //If there aren't any more items move to first item in the list
                            _.currentFocus = _.currentFocus + 1 < _.currentLinks.length ? _.currentFocus + 1 : 0;
                        }
                        next = _.currentLinks[_.currentFocus];
                    }

                    //If there isn't anything next click the anchor
                    if (next) {
                        oldLink.attr("tabindex", "-1");
                        _.currentLinks[_.currentFocus].attr("tabindex", "0").focus();
                    } else if (close) {
                        //Same as ESCAPE - TBD should we actually close the whole menu and go to a previous item (ARIA Spec)?
                        _.$menu.find(".opened").last().find("[aria-haspopup]").first().trigger("click");
                    } else if (open) {
                        //Only open if it isn't opened - escape is how to close a menu
                        //Also don't trigger click on a normal link - TBD should we really close the whole menu and go to the next item (ARIA Spec)?
                        if (!oldLink.closest("li").hasClass("opened") && _.currentLinks[_.currentFocus].hasClass("has-sub")) {
                            _.currentLinks[_.currentFocus].trigger("click");
                        }
                    }
                }
                break;
            //ESCAPE
            case 27:
                e.preventDefault();
                _.$menu.find(".opened").last().find("[aria-haspopup]").first().trigger("click");
                break;
            //SPACE BAR (ENTER ALREADY BY DEFAULT DOES THIS)
            case 32:
                e.preventDefault();
                _.currentLinks[_.currentFocus].trigger("click");
                break;
        }
    };

    ClickMenu.prototype.findCurrentLinks = function ($parentLi, $currAnchor, skipFocus) {
        var _ = this;

        $.each(_.currentLinks, function () {
            var $anchor = this;
            $anchor.attr("tabindex", "-1");
        });

        _.currentLinks = [];
        _.currentFocus = 0;

        if ($parentLi && !$parentLi.data("type")) {
            var actualKey = 0;

            $parentLi.closest("[role=menu]").find("a, input, select, textarea, button").filter(":visible").each(function (key, val) {
                //How do you find :hidden items that aren't actually hidden? Check the height of the parent - be careful of floating clearout issues
                var $item = $(val);
                //Looks like even with animation speed done correctly there can be a minor amount of pixels still transitioning in css
                if ($item.closest("[role=menu]").height() > 10 && $item.closest("[role=menu]").width() > 10) {
                    _.currentLinks.push($item);

                    if ($currAnchor && $currAnchor.attr("id") && $currAnchor.attr("id") === $item.attr("id")) {
                        _.currentFocus = actualKey;
                    }
                    actualKey++;
                }
            });
        } else {
            var $tabbables = _.$menuBar.find("a, input, select, textarea, button").filter(":visible");

            $tabbables.each(function (key, val) {
                var $item = $(val);
                if ($item.closest("[role]:not(a)").is("[data-type]")) {
                    _.currentLinks.push($item);
                }
            });
            //If a ParentLi is supplied e.g. from submenutoggle then get the eq otherwise get the first visible eq
            _.currentFocus = $parentLi ? $parentLi.index() : 0;
        }

        if (_.currentLinks[_.currentFocus]) {
            _.currentLinks[_.currentFocus].attr("tabindex", "0");

            if (!_.leavingMenu && !skipFocus) {
                _.currentLinks[_.currentFocus].focus();
            }
        }
    };

    ClickMenu.prototype.resetMenus = function ($links) {
        $links.each(function () {
            var $toggle = $(this),
                $opened = $toggle.closest(".opened"),
                labelId = $toggle.attr("id"),
                $relatedSub = $("[aria-labelledby='" + labelId + "']");

            $toggle.attr("tabindex", "-1");
            $relatedSub.attr({ "aria-hidden": true, "aria-expanded": false });
            $opened.removeClass("opened animating animated");
        });
    };

    ClickMenu.prototype.cleanUpEvents = function () {
        var _ = this;
        _.$menu.find("li a").off("click", _.subMenuToggle);

        // Change into FOCUS with corresponding namespace function
        _.$menu.off('keydown', _.keyHandler);
        _.$menuBar.off("focusin", _.showMenu);

        _.$html.off("touchstart click focusin", _.menuHandler);
        _.$html.off("touchstart click focusin", _.menuToggleHandler);
    };

    ClickMenu.prototype.destroy = function () {
        var _ = this;

        _.$menu.removeClass("cm-js-enabled cm-js-inFocus cm-js-active").removeAttr("tabindex");
        _.$menuBar.removeAttr("role");
        _.$menu.find("[role=presentation]").removeAttr("role").filter(".opened").removeClass("opened animating animated");
        _.$menu.find("[role=menuitem]").removeAttr("tabindex aria-haspopup role").removeClass("has-sub");
        _.$menu.find("[role=menu]").removeAttr("aria-expanded aria-hidden aria-labelledby role");
        _.cleanUpEvents();
    };

    ClickMenu.prototype.getClickMenu = function () {
        return this;
    };

    ClickMenu.prototype.showMenu = function (e) {
        var _ = this;

        //Need to make it check for hasClass on the current item rather than html and all items
        if (_.$menuBar.height() <= 10 && !_.$menu.hasClass("cm-js-active") && !_.$menu.hasClass("cm-animate-out")) {
            _.$menu.trigger("beforeMenuShow", [_]);

            _.isActive = true;
            _.isToggled = true;
            _.$menu.addClass("cm-js-active");

            _.$menuToggle.addClass("active");
            _.$html.addClass(_.options.htmlClass); // ADD FOR INITIAL STYLING

            _.findCurrentLinks();

            _.$html.off("touchstart click focusin", _.menuToggleHandler);

            // ADD TOGGLE HANDLER AFTER ANIMATION TO PREVENT CLOSING MENUS FROM REMOVING THE HANDLER
            setTimeout(function () {
                _.$menu.trigger("afterMenuShow", [_]);
                _.$html.addClass(_.options.htmlClass).on("touchstart click focusin", _.menuToggleHandler);
            }, _.options.animationSpeed);
        }
    };

    ClickMenu.prototype.hideMenu = function (e) {
        var _ = this;

        if (_.$menu.hasClass("cm-js-active") && _.$html.hasClass(_.options.htmlClass)) {
            _.$menu.trigger("beforeMenuHide", [_]);

            _.isActive = false;
            _.isToggled = false;
            _.$menu.removeClass("cm-js-active cm-js-inFocus");
            _.$menuToggle.removeClass("active");

            _.$html.removeClass(_.options.htmlClass).off("touchstart click focusin", _.menuToggleHandler);
            _.$menu.addClass("cm-animate-out");

            setTimeout(function () {
                _.$html.removeClass(_.options.htmlClass);
                _.$menu.removeClass("cm-animate-out").trigger("afterMenuHide", [_]);
            }, _.options.animationSpeed);
        }
    };

    ClickMenu.prototype.menuToggle = function (e) {
        var _ = this;
        e.preventDefault();

        if (e.type === "touchstart" || !_.touchStart) {
            if (_.isActive) {
                _.hideMenu();
            } else {
                _.showMenu();
            }
        }

        _.touchStart = e.type === "touchstart" ? true : false;
    };

    ClickMenu.prototype.subMenuToggle = function (e, params) {
        var _ = this;

        var $currAnchor = $(e.currentTarget),
            $parentLi = $currAnchor.closest("li"),
            $menuCol = $currAnchor.closest("[data-type]"),
            menuType = $menuCol.data("type"),
            $relatedMenu = $("[aria-labelledby=" + $currAnchor.attr("id") + "]");

        var subDefaults = { skipFocus: false },
            subOptions = $.extend({}, subDefaults, params);

        _.$html.off("touchstart click focusin", _.menuHandler);

        if ($parentLi.hasClass("opened")) {

            _.$menu.trigger("beforeSubClose", [_, $currAnchor, $relatedMenu]);

            if (_.options.singleClick) {
                e.preventDefault();

                if (menuType === "sliding" && $parentLi.parents(".sub-menu").hasClass("sub-menu")) {
                    $parentLi.parents(".sub-menu").addClass("cm-js-inactive");
                }

                $parentLi.removeClass("opened animating animated");

                if (_.$menu.find(".opened").length > 0 && _.options.isAutoClose) {
                    _.$html.on("touchstart click focusin", _.menuHandler);
                }

                $relatedMenu.attr({ "aria-expanded": "false", "aria-hidden": "true" });

                $relatedMenu.find("[aria-expanded=true]").each(function () {
                    var $childMenu = $(this);

                    $childMenu.attr({ "aria-expanded": "false", "aria-hidden": "true" }).closest("[role=presentation]").removeClass("opened animating animated");
                });

                setTimeout(function () {

                    //Update Current Links for keyboard
                    _.findCurrentLinks($parentLi, $currAnchor, subOptions.skipFocus);

                    _.$menu.trigger("afterSubClose", [_, $currAnchor, $relatedMenu]);
                }, _.options.animationSpeed);
            }
        } else {
            // Otherwise Open submenu and attach site click handler
            // Also - close any other open menus and their children
            e.preventDefault();

            _.$menu.trigger("beforeSubOpen", [_, $currAnchor, $relatedMenu]);

            $parentLi.addClass("opened animating").siblings().removeClass("opened animating animated").find(".opened").removeClass("opened animating animated");

            //FOR SLIDING MENUS
            $parentLi.siblings().find(".sub-menu").addClass("cm-js-inactive");

            if (menuType === "sliding" && $parentLi.parents(".sub-menu").length > 0) {
                $parentLi.parents(".sub-menu").removeClass("cm-js-inactive");
            }
            //END FOR SLIDING MENU

            $relatedMenu.attr({ "aria-expanded": "true", "aria-hidden": "false" });

            //Wait until timer is complete so the bindings and currentLink groupings don't overlap
            setTimeout(function () {
                if ($parentLi.hasClass("animating")) {
                    $parentLi.removeClass("animating").addClass("animated");
                }

                //Update Current Links for keyboard
                _.findCurrentLinks($relatedMenu, $relatedMenu.find("a").first(), subOptions.skipFocus);

                // ADD TOGGLE HANDLER AFTER ANIMATION TO PREVENT CLOSING MENUS FROM REMOVING THE HANDLER
                if (_.options.isAutoClose) {
                    // Only add if (default) menus set to auto close
                    _.$html.on("touchstart click focusin", _.menuHandler);
                }

                _.$menu.trigger("afterSubOpen", [_, $currAnchor, $relatedMenu]);
            }, _.options.animationSpeed);
        }
    };

    ClickMenu.prototype.menuToggleHandler = function (e) {
        var _ = this;

        if (!$.contains(_.menu, e.target) && !_.$menu.is($(e.target)) && _.isToggled) {
            _.isToggled = false;
            _.touchStart = false;

            if (_.$menuToggle.length > 0) {
                _.$menuToggle.trigger("click");
            } else {
                _.hideMenu();
            }

            _.$html.removeClass(_.options.htmlClass).off("touchstart click focusin", _.menuToggleHandler);
        }
    };

    ClickMenu.prototype.menuHandler = function (e) {
        var _ = this;

        if (!$.contains(_.menu, e.target) && !_.$menu.is($(e.target))) {
            //Make sure not to leave any tabindex=0 on submenu links by making sure the toggle knows we are leaving the menu
            _.leavingMenu = true;

            _.resetMenus(_.$menu.find(".opened > .has-sub, .opened > .expander-wrap > .has-sub"));
            _.findCurrentLinks();

            _.$html.off("touchstart click focusin", _.menuHandler);

            setTimeout(function () {
                //We now know we have left the menu and are done triggering sub menus
                _.leavingMenu = false;
            }, _.options.animationSpeed);
        }
    };

    $.fn.clickMenu = function () {
        var _ = this,
            opt = arguments[0],
            args = Array.prototype.slice.call(arguments, 1),
            l = _.length,
            i,
            ret;

        for (i = 0; i < l; i++) {
            if ((typeof opt === 'undefined' ? 'undefined' : _typeof(opt)) == 'object' || typeof opt == 'undefined') {
                _[i].clickMenu = new ClickMenu(_[i], opt);
            } else {
                ret = _[i].clickMenu[opt].apply(_[i].clickMenu, args);
            }

            if (typeof ret != 'undefined') return ret;
        }

        return _;
    };
});

/**
 * Tiny slider v2.9.1
 * https://github.com/ganlanyuan/tiny-slider
 */
var tns = function () {
    Object.keys || (Object.keys = function (t) {
        var e = [];for (var n in t) {
            Object.prototype.hasOwnProperty.call(t, n) && e.push(n);
        }return e;
    }), "remove" in Element.prototype || (Element.prototype.remove = function () {
        this.parentNode && this.parentNode.removeChild(this);
    });var t = window,
        Oi = t.requestAnimationFrame || t.webkitRequestAnimationFrame || t.mozRequestAnimationFrame || t.msRequestAnimationFrame || function (t) {
        return setTimeout(t, 16);
    },
        e = window,
        Di = e.cancelAnimationFrame || e.mozCancelAnimationFrame || function (t) {
        clearTimeout(t);
    };function Hi() {
        for (var t, e, n, i = arguments[0] || {}, a = 1, r = arguments.length; a < r; a++) {
            if (null !== (t = arguments[a])) for (e in t) {
                i !== (n = t[e]) && void 0 !== n && (i[e] = n);
            }
        }return i;
    }function ki(t) {
        return 0 <= ["true", "false"].indexOf(t) ? JSON.parse(t) : t;
    }function Ri(t, e, n, i) {
        if (i) try {
            t.setItem(e, n);
        } catch (t) {}return n;
    }function Ii() {
        var t = document,
            e = t.body;return e || ((e = t.createElement("body")).fake = !0), e;
    }var n = document.documentElement;function Pi(t) {
        var e = "";return t.fake && (e = n.style.overflow, t.style.background = "", t.style.overflow = n.style.overflow = "hidden", n.appendChild(t)), e;
    }function zi(t, e) {
        t.fake && (t.remove(), n.style.overflow = e, n.offsetHeight);
    }function Wi(t, e, n, i) {
        "insertRule" in t ? t.insertRule(e + "{" + n + "}", i) : t.addRule(e, n, i);
    }function Fi(t) {
        return ("insertRule" in t ? t.cssRules : t.rules).length;
    }function qi(t, e, n) {
        for (var i = 0, a = t.length; i < a; i++) {
            e.call(n, t[i], i);
        }
    }var i = "classList" in document.createElement("_"),
        ji = i ? function (t, e) {
        return t.classList.contains(e);
    } : function (t, e) {
        return 0 <= t.className.indexOf(e);
    },
        Vi = i ? function (t, e) {
        ji(t, e) || t.classList.add(e);
    } : function (t, e) {
        ji(t, e) || (t.className += " " + e);
    },
        Gi = i ? function (t, e) {
        ji(t, e) && t.classList.remove(e);
    } : function (t, e) {
        ji(t, e) && (t.className = t.className.replace(e, ""));
    };function Qi(t, e) {
        return t.hasAttribute(e);
    }function Xi(t, e) {
        return t.getAttribute(e);
    }function r(t) {
        return void 0 !== t.item;
    }function Yi(t, e) {
        if (t = r(t) || t instanceof Array ? t : [t], "[object Object]" === Object.prototype.toString.call(e)) for (var n = t.length; n--;) {
            for (var i in e) {
                t[n].setAttribute(i, e[i]);
            }
        }
    }function Ki(t, e) {
        t = r(t) || t instanceof Array ? t : [t];for (var n = (e = e instanceof Array ? e : [e]).length, i = t.length; i--;) {
            for (var a = n; a--;) {
                t[i].removeAttribute(e[a]);
            }
        }
    }function Ji(t) {
        for (var e = [], n = 0, i = t.length; n < i; n++) {
            e.push(t[n]);
        }return e;
    }function Ui(t, e) {
        "none" !== t.style.display && (t.style.display = "none");
    }function _i(t, e) {
        "none" === t.style.display && (t.style.display = "");
    }function Zi(t) {
        return "none" !== window.getComputedStyle(t).display;
    }function $i(e) {
        if ("string" == typeof e) {
            var n = [e],
                i = e.charAt(0).toUpperCase() + e.substr(1);["Webkit", "Moz", "ms", "O"].forEach(function (t) {
                "ms" === t && "transform" !== e || n.push(t + i);
            }), e = n;
        }for (var t = document.createElement("fakeelement"), a = (e.length, 0); a < e.length; a++) {
            var r = e[a];if (void 0 !== t.style[r]) return r;
        }return !1;
    }function ta(t, e) {
        var n = !1;return (/^Webkit/.test(t) ? n = "webkit" + e + "End" : /^O/.test(t) ? n = "o" + e + "End" : t && (n = e.toLowerCase() + "end"), n
        );
    }var a = !1;try {
        var o = Object.defineProperty({}, "passive", { get: function get() {
                a = !0;
            } });window.addEventListener("test", null, o);
    } catch (t) {}var u = !!a && { passive: !0 };function ea(t, e, n) {
        for (var i in e) {
            var a = 0 <= ["touchstart", "touchmove"].indexOf(i) && !n && u;t.addEventListener(i, e[i], a);
        }
    }function na(t, e) {
        for (var n in e) {
            var i = 0 <= ["touchstart", "touchmove"].indexOf(n) && u;t.removeEventListener(n, e[n], i);
        }
    }function ia() {
        return { topics: {}, on: function on(t, e) {
                this.topics[t] = this.topics[t] || [], this.topics[t].push(e);
            }, off: function off(t, e) {
                if (this.topics[t]) for (var n = 0; n < this.topics[t].length; n++) {
                    if (this.topics[t][n] === e) {
                        this.topics[t].splice(n, 1);break;
                    }
                }
            }, emit: function emit(e, n) {
                n.type = e, this.topics[e] && this.topics[e].forEach(function (t) {
                    t(n, e);
                });
            } };
    }var aa = function aa(O) {
        O = Hi({ container: ".slider", mode: "carousel", axis: "horizontal", items: 1, gutter: 0, edgePadding: 0, fixedWidth: !1, autoWidth: !1, viewportMax: !1, slideBy: 1, center: !1, controls: !0, controlsPosition: "top", controlsText: ["prev", "next"], controlsContainer: !1, prevButton: !1, nextButton: !1, nav: !0, navPosition: "top", navContainer: !1, navAsThumbnails: !1, arrowKeys: !1, speed: 300, autoplay: !1, autoplayPosition: "top", autoplayTimeout: 5e3, autoplayDirection: "forward", autoplayText: ["start", "stop"], autoplayHoverPause: !1, autoplayButton: !1, autoplayButtonOutput: !0, autoplayResetOnVisibility: !0, animateIn: "tns-fadeIn", animateOut: "tns-fadeOut", animateNormal: "tns-normal", animateDelay: !1, loop: !0, rewind: !1, autoHeight: !1, responsive: !1, lazyload: !1, lazyloadSelector: ".tns-lazy-img", touch: !0, mouseDrag: !1, swipeAngle: 15, nested: !1, preventActionWhenRunning: !1, preventScrollOnTouch: !1, freezable: !0, onInit: !1, useLocalStorage: !0 }, O || {});var D = document,
            h = window,
            a = { ENTER: 13, SPACE: 32, LEFT: 37, RIGHT: 39 },
            e = {},
            n = O.useLocalStorage;if (n) {
            var t = navigator.userAgent,
                i = new Date();try {
                (e = h.localStorage) ? (e.setItem(i, i), n = e.getItem(i) == i, e.removeItem(i)) : n = !1, n || (e = {});
            } catch (t) {
                n = !1;
            }n && (e.tnsApp && e.tnsApp !== t && ["tC", "tPL", "tMQ", "tTf", "t3D", "tTDu", "tTDe", "tADu", "tADe", "tTE", "tAE"].forEach(function (t) {
                e.removeItem(t);
            }), localStorage.tnsApp = t);
        }var r,
            o,
            u,
            l,
            s,
            c,
            f,
            y = e.tC ? ki(e.tC) : Ri(e, "tC", function () {
            var t = document,
                e = Ii(),
                n = Pi(e),
                i = t.createElement("div"),
                a = !1;e.appendChild(i);try {
                for (var r, o = "(10px * 10)", u = ["calc" + o, "-moz-calc" + o, "-webkit-calc" + o], l = 0; l < 3; l++) {
                    if (r = u[l], i.style.width = r, 100 === i.offsetWidth) {
                        a = r.replace(o, "");break;
                    }
                }
            } catch (t) {}return e.fake ? zi(e, n) : i.remove(), a;
        }(), n),
            g = e.tPL ? ki(e.tPL) : Ri(e, "tPL", function () {
            var t,
                e = document,
                n = Ii(),
                i = Pi(n),
                a = e.createElement("div"),
                r = e.createElement("div"),
                o = "";a.className = "tns-t-subp2", r.className = "tns-t-ct";for (var u = 0; u < 70; u++) {
                o += "<div></div>";
            }return r.innerHTML = o, a.appendChild(r), n.appendChild(a), t = Math.abs(a.getBoundingClientRect().left - r.children[67].getBoundingClientRect().left) < 2, n.fake ? zi(n, i) : a.remove(), t;
        }(), n),
            H = e.tMQ ? ki(e.tMQ) : Ri(e, "tMQ", (o = document, u = Ii(), l = Pi(u), s = o.createElement("div"), c = o.createElement("style"), f = "@media all and (min-width:1px){.tns-mq-test{position:absolute}}", c.type = "text/css", s.className = "tns-mq-test", u.appendChild(c), u.appendChild(s), c.styleSheet ? c.styleSheet.cssText = f : c.appendChild(o.createTextNode(f)), r = window.getComputedStyle ? window.getComputedStyle(s).position : s.currentStyle.position, u.fake ? zi(u, l) : s.remove(), "absolute" === r), n),
            d = e.tTf ? ki(e.tTf) : Ri(e, "tTf", $i("transform"), n),
            v = e.t3D ? ki(e.t3D) : Ri(e, "t3D", function (t) {
            if (!t) return !1;if (!window.getComputedStyle) return !1;var e,
                n = document,
                i = Ii(),
                a = Pi(i),
                r = n.createElement("p"),
                o = 9 < t.length ? "-" + t.slice(0, -9).toLowerCase() + "-" : "";return o += "transform", i.insertBefore(r, null), r.style[t] = "translate3d(1px,1px,1px)", e = window.getComputedStyle(r).getPropertyValue(o), i.fake ? zi(i, a) : r.remove(), void 0 !== e && 0 < e.length && "none" !== e;
        }(d), n),
            x = e.tTDu ? ki(e.tTDu) : Ri(e, "tTDu", $i("transitionDuration"), n),
            p = e.tTDe ? ki(e.tTDe) : Ri(e, "tTDe", $i("transitionDelay"), n),
            b = e.tADu ? ki(e.tADu) : Ri(e, "tADu", $i("animationDuration"), n),
            m = e.tADe ? ki(e.tADe) : Ri(e, "tADe", $i("animationDelay"), n),
            C = e.tTE ? ki(e.tTE) : Ri(e, "tTE", ta(x, "Transition"), n),
            w = e.tAE ? ki(e.tAE) : Ri(e, "tAE", ta(b, "Animation"), n),
            M = h.console && "function" == typeof h.console.warn,
            T = ["container", "controlsContainer", "prevButton", "nextButton", "navContainer", "autoplayButton"],
            E = {};if (T.forEach(function (t) {
            if ("string" == typeof O[t]) {
                var e = O[t],
                    n = D.querySelector(e);if (E[t] = e, !n || !n.nodeName) return void (M && console.warn("Can't find", O[t]));O[t] = n;
            }
        }), !(O.container.children.length < 1)) {
            var k = O.responsive,
                R = O.nested,
                I = "carousel" === O.mode;if (k) {
                0 in k && (O = Hi(O, k[0]), delete k[0]);var A = {};for (var N in k) {
                    var L = k[N];L = "number" == typeof L ? { items: L } : L, A[N] = L;
                }k = A, A = null;
            }if (I || function t(e) {
                for (var n in e) {
                    I || ("slideBy" === n && (e[n] = "page"), "edgePadding" === n && (e[n] = !1), "autoHeight" === n && (e[n] = !1)), "responsive" === n && t(e[n]);
                }
            }(O), !I) {
                O.axis = "horizontal", O.slideBy = "page", O.edgePadding = !1;var P = O.animateIn,
                    z = O.animateOut,
                    B = O.animateDelay,
                    W = O.animateNormal;
            }var S,
                F,
                q = "horizontal" === O.axis,
                j = D.createElement("div"),
                V = D.createElement("div"),
                G = O.container,
                Q = G.parentNode,
                X = G.outerHTML,
                Y = G.children,
                K = Y.length,
                J = sn(),
                U = !1;k && Bn(), I && (G.className += " tns-vpfix");var _,
                Z,
                $,
                tt,
                et,
                nt,
                it,
                at,
                rt = O.autoWidth,
                ot = vn("fixedWidth"),
                ut = vn("edgePadding"),
                lt = vn("gutter"),
                st = fn(),
                ct = vn("center"),
                ft = rt ? 1 : Math.floor(vn("items")),
                dt = vn("slideBy"),
                vt = O.viewportMax || O.fixedWidthViewportWidth,
                pt = vn("arrowKeys"),
                mt = vn("speed"),
                ht = O.rewind,
                yt = !ht && O.loop,
                gt = vn("autoHeight"),
                xt = vn("controls"),
                bt = vn("controlsText"),
                Ct = vn("nav"),
                wt = vn("touch"),
                Mt = vn("mouseDrag"),
                Tt = vn("autoplay"),
                Et = vn("autoplayTimeout"),
                At = vn("autoplayText"),
                Nt = vn("autoplayHoverPause"),
                Lt = vn("autoplayResetOnVisibility"),
                Bt = (at = document.createElement("style"), it && at.setAttribute("media", it), document.querySelector("head").appendChild(at), at.sheet ? at.sheet : at.styleSheet),
                St = O.lazyload,
                Ot = (O.lazyloadSelector, []),
                Dt = yt ? (et = function () {
                {
                    if (rt || ot && !vt) return K - 1;var t = ot ? "fixedWidth" : "items",
                        e = [];if ((ot || O[t] < K) && e.push(O[t]), k) for (var n in k) {
                        var i = k[n][t];i && (ot || i < K) && e.push(i);
                    }return e.length || e.push(0), Math.ceil(ot ? vt / Math.min.apply(null, e) : Math.max.apply(null, e));
                }
            }(), nt = I ? Math.ceil((5 * et - K) / 2) : 4 * et - K, nt = Math.max(et, nt), dn("edgePadding") ? nt + 1 : nt) : 0,
                Ht = I ? K + 2 * Dt : K + Dt,
                kt = !(!ot && !rt || yt),
                Rt = ot ? ni() : null,
                It = !I || !yt,
                Pt = q ? "left" : "top",
                zt = "",
                Wt = "",
                Ft = ot ? function () {
                return ct && !yt ? K - 1 : Math.ceil(-Rt / (ot + lt));
            } : rt ? function () {
                for (var t = Ht; t--;) {
                    if (_[t] >= -Rt) return t;
                }
            } : function () {
                return ct && I && !yt ? K - 1 : yt || I ? Math.max(0, Ht - Math.ceil(ft)) : Ht - 1;
            },
                qt = on(vn("startIndex")),
                jt = qt,
                Vt = (rn(), 0),
                Gt = rt ? null : Ft(),
                Qt = O.preventActionWhenRunning,
                Xt = O.swipeAngle,
                Yt = !Xt || "?",
                Kt = !1,
                Jt = O.onInit,
                Ut = new ia(),
                _t = " tns-slider tns-" + O.mode,
                Zt = G.id || (tt = window.tnsId, window.tnsId = tt ? tt + 1 : 1, "tns" + window.tnsId),
                $t = vn("disable"),
                te = !1,
                ee = O.freezable,
                ne = !(!ee || rt) && Ln(),
                ie = !1,
                ae = { click: fi, keydown: function keydown(t) {
                    t = xi(t);var e = [a.LEFT, a.RIGHT].indexOf(t.keyCode);0 <= e && (0 === e ? Ee.disabled || fi(t, -1) : Ae.disabled || fi(t, 1));
                } },
                re = { click: function click(t) {
                    if (Kt) {
                        if (Qt) return;si();
                    }var e = bi(t = xi(t));for (; e !== Se && !Qi(e, "data-nav");) {
                        e = e.parentNode;
                    }if (Qi(e, "data-nav")) {
                        var n = ke = Number(Xi(e, "data-nav")),
                            i = ot || rt ? n * K / De : n * ft,
                            a = ve ? n : Math.min(Math.ceil(i), K - 1);ci(a, t), Re === n && (qe && hi(), ke = -1);
                    }
                }, keydown: function keydown(t) {
                    t = xi(t);var e = D.activeElement;if (!Qi(e, "data-nav")) return;var n = [a.LEFT, a.RIGHT, a.ENTER, a.SPACE].indexOf(t.keyCode),
                        i = Number(Xi(e, "data-nav"));0 <= n && (0 === n ? 0 < i && gi(Be[i - 1]) : 1 === n ? i < De - 1 && gi(Be[i + 1]) : ci(ke = i, t));
                } },
                oe = { mouseover: function mouseover() {
                    qe && (vi(), je = !0);
                }, mouseout: function mouseout() {
                    je && (di(), je = !1);
                } },
                ue = { visibilitychange: function visibilitychange() {
                    D.hidden ? qe && (vi(), Ge = !0) : Ge && (di(), Ge = !1);
                } },
                le = { keydown: function keydown(t) {
                    t = xi(t);var e = [a.LEFT, a.RIGHT].indexOf(t.keyCode);0 <= e && fi(t, 0 === e ? -1 : 1);
                } },
                se = { touchstart: Ti, touchmove: Ei, touchend: Ai, touchcancel: Ai },
                ce = { mousedown: Ti, mousemove: Ei, mouseup: Ai, mouseleave: Ai },
                fe = dn("controls"),
                de = dn("nav"),
                ve = !!rt || O.navAsThumbnails,
                pe = dn("autoplay"),
                me = dn("touch"),
                he = dn("mouseDrag"),
                ye = "tns-slide-active",
                ge = "tns-complete",
                xe = { load: function load(t) {
                    zn(bi(t));
                }, error: function error(t) {
                    e = bi(t), Vi(e, "failed"), Wn(e);var e;
                } },
                be = "force" === O.preventScrollOnTouch;if (fe) var Ce,
                we,
                Me = O.controlsContainer,
                Te = O.controlsContainer ? O.controlsContainer.outerHTML : "",
                Ee = O.prevButton,
                Ae = O.nextButton,
                Ne = O.prevButton ? O.prevButton.outerHTML : "",
                Le = O.nextButton ? O.nextButton.outerHTML : "";if (de) var Be,
                Se = O.navContainer,
                Oe = O.navContainer ? O.navContainer.outerHTML : "",
                De = rt ? K : Li(),
                He = 0,
                ke = -1,
                Re = ln(),
                Ie = Re,
                Pe = "tns-nav-active",
                ze = "Carousel Page ",
                We = " (Current Slide)";if (pe) var Fe,
                qe,
                je,
                Ve,
                Ge,
                Qe = "forward" === O.autoplayDirection ? 1 : -1,
                Xe = O.autoplayButton,
                Ye = O.autoplayButton ? O.autoplayButton.outerHTML : "",
                Ke = ["<span class='tns-visually-hidden'>", " animation</span>"];if (me || he) var Je,
                Ue,
                _e = {},
                Ze = {},
                $e = !1,
                tn = q ? function (t, e) {
                return t.x - e.x;
            } : function (t, e) {
                return t.y - e.y;
            };rt || an($t || ne), d && (Pt = d, zt = "translate", v ? (zt += q ? "3d(" : "3d(0px, ", Wt = q ? ", 0px, 0px)" : ", 0px)") : (zt += q ? "X(" : "Y(", Wt = ")")), I && (G.className = G.className.replace("tns-vpfix", "")), function () {
                dn("gutter");j.className = "tns-outer", V.className = "tns-inner", j.id = Zt + "-ow", V.id = Zt + "-iw", "" === G.id && (G.id = Zt);_t += g || rt ? " tns-subpixel" : " tns-no-subpixel", _t += y ? " tns-calc" : " tns-no-calc", rt && (_t += " tns-autowidth");_t += " tns-" + O.axis, G.className += _t, I ? ((S = D.createElement("div")).id = Zt + "-mw", S.className = "tns-ovh", j.appendChild(S), S.appendChild(V)) : j.appendChild(V);if (gt) {
                    var t = S || V;t.className += " tns-ah";
                }if (Q.insertBefore(j, G), V.appendChild(G), qi(Y, function (t, e) {
                    Vi(t, "tns-item"), t.id || (t.id = Zt + "-item" + e), !I && W && Vi(t, W), Yi(t, { "aria-hidden": "true", tabindex: "-1" });
                }), Dt) {
                    for (var e = D.createDocumentFragment(), n = D.createDocumentFragment(), i = Dt; i--;) {
                        var a = i % K,
                            r = Y[a].cloneNode(!0);if (Ki(r, "id"), n.insertBefore(r, n.firstChild), I) {
                            var o = Y[K - 1 - a].cloneNode(!0);Ki(o, "id"), e.appendChild(o);
                        }
                    }G.insertBefore(e, G.firstChild), G.appendChild(n), Y = G.children;
                }
            }(), function () {
                if (!I) for (var t = qt, e = qt + Math.min(K, ft); t < e; t++) {
                    var n = Y[t];n.style.left = 100 * (t - qt) / ft + "%", Vi(n, P), Gi(n, W);
                }q && (g || rt ? (Wi(Bt, "#" + Zt + " > .tns-item", "font-size:" + h.getComputedStyle(Y[0]).fontSize + ";", Fi(Bt)), Wi(Bt, "#" + Zt, "font-size:0;", Fi(Bt))) : I && qi(Y, function (t, e) {
                    var n;t.style.marginLeft = (n = e, y ? y + "(" + 100 * n + "% / " + Ht + ")" : 100 * n / Ht + "%");
                }));if (H) {
                    if (x) {
                        var i = S && O.autoHeight ? xn(O.speed) : "";Wi(Bt, "#" + Zt + "-mw", i, Fi(Bt));
                    }i = pn(O.edgePadding, O.gutter, O.fixedWidth, O.speed, O.autoHeight), Wi(Bt, "#" + Zt + "-iw", i, Fi(Bt)), I && (i = q && !rt ? "width:" + mn(O.fixedWidth, O.gutter, O.items) + ";" : "", x && (i += xn(mt)), Wi(Bt, "#" + Zt, i, Fi(Bt))), i = q && !rt ? hn(O.fixedWidth, O.gutter, O.items) : "", O.gutter && (i += yn(O.gutter)), I || (x && (i += xn(mt)), b && (i += bn(mt))), i && Wi(Bt, "#" + Zt + " > .tns-item", i, Fi(Bt));
                } else {
                    Gn(), V.style.cssText = pn(ut, lt, ot, gt), I && q && !rt && (G.style.width = mn(ot, lt, ft));var i = q && !rt ? hn(ot, lt, ft) : "";lt && (i += yn(lt)), i && Wi(Bt, "#" + Zt + " > .tns-item", i, Fi(Bt));
                }if (k && H) for (var a in k) {
                    a = parseInt(a);var r = k[a],
                        i = "",
                        o = "",
                        u = "",
                        l = "",
                        s = "",
                        c = rt ? null : vn("items", a),
                        f = vn("fixedWidth", a),
                        d = vn("speed", a),
                        v = vn("edgePadding", a),
                        p = vn("autoHeight", a),
                        m = vn("gutter", a);x && S && vn("autoHeight", a) && "speed" in r && (o = "#" + Zt + "-mw{" + xn(d) + "}"), ("edgePadding" in r || "gutter" in r) && (u = "#" + Zt + "-iw{" + pn(v, m, f, d, p) + "}"), I && q && !rt && ("fixedWidth" in r || "items" in r || ot && "gutter" in r) && (l = "width:" + mn(f, m, c) + ";"), x && "speed" in r && (l += xn(d)), l && (l = "#" + Zt + "{" + l + "}"), ("fixedWidth" in r || ot && "gutter" in r || !I && "items" in r) && (s += hn(f, m, c)), "gutter" in r && (s += yn(m)), !I && "speed" in r && (x && (s += xn(d)), b && (s += bn(d))), s && (s = "#" + Zt + " > .tns-item{" + s + "}"), (i = o + u + l + s) && Bt.insertRule("@media (min-width: " + a / 16 + "em) {" + i + "}", Bt.cssRules.length);
                }
            }(), Cn();var en = yt ? I ? function () {
                var t = Vt,
                    e = Gt;t += dt, e -= dt, ut ? (t += 1, e -= 1) : ot && (st + lt) % (ot + lt) && (e -= 1), Dt && (e < qt ? qt -= K : qt < t && (qt += K));
            } : function () {
                if (Gt < qt) for (; Vt + K <= qt;) {
                    qt -= K;
                } else if (qt < Vt) for (; qt <= Gt - K;) {
                    qt += K;
                }
            } : function () {
                qt = Math.max(Vt, Math.min(Gt, qt));
            },
                nn = I ? function () {
                var e, n, i, a, t, r, o, u, l, s, c;ti(G, ""), x || !mt ? (ri(), mt && Zi(G) || si()) : (e = G, n = Pt, i = zt, a = Wt, t = ii(), r = mt, o = si, u = Math.min(r, 10), l = 0 <= t.indexOf("%") ? "%" : "px", t = t.replace(l, ""), s = Number(e.style[n].replace(i, "").replace(a, "").replace(l, "")), c = (t - s) / r * u, setTimeout(function t() {
                    r -= u, s += c, e.style[n] = i + s + l + a, 0 < r ? setTimeout(t, u) : o();
                }, u)), q || Ni();
            } : function () {
                Ot = [];var t = {};t[C] = t[w] = si, na(Y[jt], t), ea(Y[qt], t), oi(jt, P, z, !0), oi(qt, W, P), C && w && mt && Zi(G) || si();
            };return { version: "2.9.1", getInfo: Si, events: Ut, goTo: ci, play: function play() {
                    Tt && !qe && (mi(), Ve = !1);
                }, pause: function pause() {
                    qe && (hi(), Ve = !0);
                }, isOn: U, updateSliderHeight: Xn, refresh: Cn, destroy: function destroy() {
                    if (Bt.disabled = !0, Bt.ownerNode && Bt.ownerNode.remove(), na(h, { resize: An }), pt && na(D, le), Me && na(Me, ae), Se && na(Se, re), na(G, oe), na(G, ue), Xe && na(Xe, { click: yi }), Tt && clearInterval(Fe), I && C) {
                        var t = {};t[C] = si, na(G, t);
                    }wt && na(G, se), Mt && na(G, ce);var r = [X, Te, Ne, Le, Oe, Ye];for (var e in T.forEach(function (t, e) {
                        var n = "container" === t ? j : O[t];if ("object" == (typeof n === 'undefined' ? 'undefined' : _typeof(n))) {
                            var i = !!n.previousElementSibling && n.previousElementSibling,
                                a = n.parentNode;n.outerHTML = r[e], O[t] = i ? i.nextElementSibling : a.firstElementChild;
                        }
                    }), T = P = z = B = W = q = j = V = G = Q = X = Y = K = F = J = rt = ot = ut = lt = st = ft = dt = vt = pt = mt = ht = yt = gt = Bt = St = _ = Ot = Dt = Ht = kt = Rt = It = Pt = zt = Wt = Ft = qt = jt = Vt = Gt = Xt = Yt = Kt = Jt = Ut = _t = Zt = $t = te = ee = ne = ie = ae = re = oe = ue = le = se = ce = fe = de = ve = pe = me = he = ye = ge = xe = Z = xt = bt = Me = Te = Ee = Ae = Ce = we = Ct = Se = Oe = Be = De = He = ke = Re = Ie = Pe = ze = We = Tt = Et = Qe = At = Nt = Xe = Ye = Lt = Ke = Fe = qe = je = Ve = Ge = _e = Ze = Je = $e = Ue = tn = wt = Mt = null, this) {
                        "rebuild" !== e && (this[e] = null);
                    }U = !1;
                }, rebuild: function rebuild() {
                    return aa(Hi(O, E));
                } };
        }function an(t) {
            t && (xt = Ct = wt = Mt = pt = Tt = Nt = Lt = !1);
        }function rn() {
            for (var t = I ? qt - Dt : qt; t < 0;) {
                t += K;
            }return t % K + 1;
        }function on(t) {
            return t = t ? Math.max(0, Math.min(yt ? K - 1 : K - ft, t)) : 0, I ? t + Dt : t;
        }function un(t) {
            for (null == t && (t = qt), I && (t -= Dt); t < 0;) {
                t += K;
            }return Math.floor(t % K);
        }function ln() {
            var t,
                e = un();return t = ve ? e : ot || rt ? Math.ceil((e + 1) * De / K - 1) : Math.floor(e / ft), !yt && I && qt === Gt && (t = De - 1), t;
        }function sn() {
            return h.innerWidth || D.documentElement.clientWidth || D.body.clientWidth;
        }function cn(t) {
            return "top" === t ? "afterbegin" : "beforeend";
        }function fn() {
            var t = ut ? 2 * ut - lt : 0;return function t(e) {
                var n,
                    i,
                    a = D.createElement("div");return e.appendChild(a), i = (n = a.getBoundingClientRect()).right - n.left, a.remove(), i || t(e.parentNode);
            }(Q) - t;
        }function dn(t) {
            if (O[t]) return !0;if (k) for (var e in k) {
                if (k[e][t]) return !0;
            }return !1;
        }function vn(t, e) {
            if (null == e && (e = J), "items" === t && ot) return Math.floor((st + lt) / (ot + lt)) || 1;var n = O[t];if (k) for (var i in k) {
                e >= parseInt(i) && t in k[i] && (n = k[i][t]);
            }return "slideBy" === t && "page" === n && (n = vn("items")), I || "slideBy" !== t && "items" !== t || (n = Math.floor(n)), n;
        }function pn(t, e, n, i, a) {
            var r = "";if (void 0 !== t) {
                var o = t;e && (o -= e), r = q ? "margin: 0 " + o + "px 0 " + t + "px;" : "margin: " + t + "px 0 " + o + "px 0;";
            } else if (e && !n) {
                var u = "-" + e + "px";r = "margin: 0 " + (q ? u + " 0 0" : "0 " + u + " 0") + ";";
            }return !I && a && x && i && (r += xn(i)), r;
        }function mn(t, e, n) {
            return t ? (t + e) * Ht + "px" : y ? y + "(" + 100 * Ht + "% / " + n + ")" : 100 * Ht / n + "%";
        }function hn(t, e, n) {
            var i;if (t) i = t + e + "px";else {
                I || (n = Math.floor(n));var a = I ? Ht : n;i = y ? y + "(100% / " + a + ")" : 100 / a + "%";
            }return i = "width:" + i, "inner" !== R ? i + ";" : i + " !important;";
        }function yn(t) {
            var e = "";!1 !== t && (e = (q ? "padding-" : "margin-") + (q ? "right" : "bottom") + ": " + t + "px;");return e;
        }function gn(t, e) {
            var n = t.substring(0, t.length - e).toLowerCase();return n && (n = "-" + n + "-"), n;
        }function xn(t) {
            return gn(x, 18) + "transition-duration:" + t / 1e3 + "s;";
        }function bn(t) {
            return gn(b, 17) + "animation-duration:" + t / 1e3 + "s;";
        }function Cn() {
            if (dn("autoHeight") || rt || !q) {
                var t = G.querySelectorAll("img");qi(t, function (t) {
                    var e = t.src;e && e.indexOf("data:image") < 0 ? (ea(t, xe), t.src = "", t.src = e, Vi(t, "loading")) : St || zn(t);
                }), Oi(function () {
                    jn(Ji(t), function () {
                        Z = !0;
                    });
                }), !rt && q && (t = Fn(qt, Math.min(qt + ft - 1, Ht - 1))), St ? wn() : Oi(function () {
                    jn(Ji(t), wn);
                });
            } else I && ai(), Tn(), En();
        }function wn() {
            if (rt) {
                var e = yt ? qt : K - 1;!function t() {
                    Y[e - 1].getBoundingClientRect().right.toFixed(2) === Y[e].getBoundingClientRect().left.toFixed(2) ? Mn() : setTimeout(function () {
                        t();
                    }, 16);
                }();
            } else Mn();
        }function Mn() {
            q && !rt || (Yn(), rt ? (Rt = ni(), ee && (ne = Ln()), Gt = Ft(), an($t || ne)) : Ni()), I && ai(), Tn(), En();
        }function Tn() {
            if (Kn(), j.insertAdjacentHTML("afterbegin", '<div class="tns-liveregion tns-visually-hidden" aria-live="polite" aria-atomic="true">slide <span class="current">' + Rn() + "</span>  of " + K + "</div>"), $ = j.querySelector(".tns-liveregion .current"), pe) {
                var t = Tt ? "stop" : "start";Xe ? Yi(Xe, { "data-action": t }) : O.autoplayButtonOutput && (j.insertAdjacentHTML(cn(O.autoplayPosition), '<button data-action="' + t + '">' + Ke[0] + t + Ke[1] + At[0] + "</button>"), Xe = j.querySelector("[data-action]")), Xe && ea(Xe, { click: yi }), Tt && (mi(), Nt && ea(G, oe), Lt && ea(G, ue));
            }if (de) {
                if (Se) Yi(Se, { "aria-label": "Carousel Pagination" }), qi(Be = Se.children, function (t, e) {
                    Yi(t, { "data-nav": e, tabindex: "-1", "aria-label": ze + (e + 1), "aria-controls": Zt });
                });else {
                    for (var e = "", n = ve ? "" : 'style="display:none"', i = 0; i < K; i++) {
                        e += '<button data-nav="' + i + '" tabindex="-1" aria-controls="' + Zt + '" ' + n + ' aria-label="' + ze + (i + 1) + '"></button>';
                    }e = '<div class="tns-nav" aria-label="Carousel Pagination">' + e + "</div>", j.insertAdjacentHTML(cn(O.navPosition), e), Se = j.querySelector(".tns-nav"), Be = Se.children;
                }if (Bi(), x) {
                    var a = x.substring(0, x.length - 18).toLowerCase(),
                        r = "transition: all " + mt / 1e3 + "s";a && (r = "-" + a + "-" + r), Wi(Bt, "[aria-controls^=" + Zt + "-item]", r, Fi(Bt));
                }Yi(Be[Re], { "aria-label": ze + (Re + 1) + We }), Ki(Be[Re], "tabindex"), Vi(Be[Re], Pe), ea(Se, re);
            }fe && (Me || Ee && Ae || (j.insertAdjacentHTML(cn(O.controlsPosition), '<div class="tns-controls" aria-label="Carousel Navigation" tabindex="0"><button data-controls="prev" tabindex="-1" aria-controls="' + Zt + '">' + bt[0] + '</button><button data-controls="next" tabindex="-1" aria-controls="' + Zt + '">' + bt[1] + "</button></div>"), Me = j.querySelector(".tns-controls")), Ee && Ae || (Ee = Me.children[0], Ae = Me.children[1]), O.controlsContainer && Yi(Me, { "aria-label": "Carousel Navigation", tabindex: "0" }), (O.controlsContainer || O.prevButton && O.nextButton) && Yi([Ee, Ae], { "aria-controls": Zt, tabindex: "-1" }), (O.controlsContainer || O.prevButton && O.nextButton) && (Yi(Ee, { "data-controls": "prev" }), Yi(Ae, { "data-controls": "next" })), Ce = Un(Ee), we = Un(Ae), $n(), Me ? ea(Me, ae) : (ea(Ee, ae), ea(Ae, ae))), Sn();
        }function En() {
            if (I && C) {
                var t = {};t[C] = si, ea(G, t);
            }wt && ea(G, se, O.preventScrollOnTouch), Mt && ea(G, ce), pt && ea(D, le), "inner" === R ? Ut.on("outerResized", function () {
                Nn(), Ut.emit("innerLoaded", Si());
            }) : (k || ot || rt || gt || !q) && ea(h, { resize: An }), gt && ("outer" === R ? Ut.on("innerLoaded", qn) : $t || qn()), Pn(), $t ? Hn() : ne && Dn(), Ut.on("indexChanged", Vn), "inner" === R && Ut.emit("innerLoaded", Si()), "function" == typeof Jt && Jt(Si()), U = !0;
        }function An(t) {
            Oi(function () {
                Nn(xi(t));
            });
        }function Nn(t) {
            if (U) {
                "outer" === R && Ut.emit("outerResized", Si(t)), J = sn();var e,
                    n = F,
                    i = !1;k && (Bn(), (e = n !== F) && Ut.emit("newBreakpointStart", Si(t)));var a,
                    r,
                    o,
                    u,
                    l = ft,
                    s = $t,
                    c = ne,
                    f = pt,
                    d = xt,
                    v = Ct,
                    p = wt,
                    m = Mt,
                    h = Tt,
                    y = Nt,
                    g = Lt,
                    x = qt;if (e) {
                    var b = ot,
                        C = gt,
                        w = bt,
                        M = ct,
                        T = At;if (!H) var E = lt,
                        A = ut;
                }if (pt = vn("arrowKeys"), xt = vn("controls"), Ct = vn("nav"), wt = vn("touch"), ct = vn("center"), Mt = vn("mouseDrag"), Tt = vn("autoplay"), Nt = vn("autoplayHoverPause"), Lt = vn("autoplayResetOnVisibility"), e && ($t = vn("disable"), ot = vn("fixedWidth"), mt = vn("speed"), gt = vn("autoHeight"), bt = vn("controlsText"), At = vn("autoplayText"), Et = vn("autoplayTimeout"), H || (ut = vn("edgePadding"), lt = vn("gutter"))), an($t), st = fn(), q && !rt || $t || (Yn(), q || (Ni(), i = !0)), (ot || rt) && (Rt = ni(), Gt = Ft()), (e || ot) && (ft = vn("items"), dt = vn("slideBy"), (r = ft !== l) && (ot || rt || (Gt = Ft()), en())), e && $t !== s && ($t ? Hn() : function () {
                    if (!te) return;if (Bt.disabled = !1, G.className += _t, ai(), yt) for (var t = Dt; t--;) {
                        I && _i(Y[t]), _i(Y[Ht - t - 1]);
                    }if (!I) for (var e = qt, n = qt + K; e < n; e++) {
                        var i = Y[e],
                            a = e < qt + ft ? P : W;i.style.left = 100 * (e - qt) / ft + "%", Vi(i, a);
                    }On(), te = !1;
                }()), ee && (e || ot || rt) && (ne = Ln()) !== c && (ne ? (ri(ii(on(0))), Dn()) : (!function () {
                    if (!ie) return;ut && H && (V.style.margin = "");if (Dt) for (var t = "tns-transparent", e = Dt; e--;) {
                        I && Gi(Y[e], t), Gi(Y[Ht - e - 1], t);
                    }On(), ie = !1;
                }(), i = !0)), an($t || ne), Tt || (Nt = Lt = !1), pt !== f && (pt ? ea(D, le) : na(D, le)), xt !== d && (xt ? Me ? _i(Me) : (Ee && _i(Ee), Ae && _i(Ae)) : Me ? Ui(Me) : (Ee && Ui(Ee), Ae && Ui(Ae))), Ct !== v && (Ct ? _i(Se) : Ui(Se)), wt !== p && (wt ? ea(G, se, O.preventScrollOnTouch) : na(G, se)), Mt !== m && (Mt ? ea(G, ce) : na(G, ce)), Tt !== h && (Tt ? (Xe && _i(Xe), qe || Ve || mi()) : (Xe && Ui(Xe), qe && hi())), Nt !== y && (Nt ? ea(G, oe) : na(G, oe)), Lt !== g && (Lt ? ea(D, ue) : na(D, ue)), e) {
                    if (ot === b && ct === M || (i = !0), gt !== C && (gt || (V.style.height = "")), xt && bt !== w && (Ee.innerHTML = bt[0], Ae.innerHTML = bt[1]), Xe && At !== T) {
                        var N = Tt ? 1 : 0,
                            L = Xe.innerHTML,
                            B = L.length - T[N].length;L.substring(B) === T[N] && (Xe.innerHTML = L.substring(0, B) + At[N]);
                    }
                } else ct && (ot || rt) && (i = !0);if ((r || ot && !rt) && (De = Li(), Bi()), (a = qt !== x) ? (Ut.emit("indexChanged", Si()), i = !0) : r ? a || Vn() : (ot || rt) && (Pn(), Kn(), kn()), !r && I || function () {
                    for (var t = qt + Math.min(K, ft), e = Ht; e--;) {
                        var n = Y[e];qt <= e && e < t ? (Vi(n, "tns-moving"), n.style.left = 100 * (e - qt) / ft + "%", Vi(n, P), Gi(n, W)) : n.style.left && (n.style.left = "", Vi(n, W), Gi(n, P)), Gi(n, z);
                    }setTimeout(function () {
                        qi(Y, function (t) {
                            Gi(t, "tns-moving");
                        });
                    }, 300);
                }(), !$t && !ne) {
                    if (e && !H && (gt === autoheightTem && mt === speedTem || Gn(), ut === A && lt === E || (V.style.cssText = pn(ut, lt, ot, mt, gt)), q)) {
                        I && (G.style.width = mn(ot, lt, ft));var S = hn(ot, lt, ft) + yn(lt);u = Fi(o = Bt) - 1, "deleteRule" in o ? o.deleteRule(u) : o.removeRule(u), Wi(Bt, "#" + Zt + " > .tns-item", S, Fi(Bt));
                    }gt && qn(), i && (ai(), jt = qt);
                }e && Ut.emit("newBreakpointEnd", Si(t));
            }
        }function Ln() {
            if (!ot && !rt) return K <= (ct ? ft - (ft - 1) / 2 : ft);var t = ot ? (ot + lt) * K : _[K],
                e = ut ? st + 2 * ut : st + lt;return ct && (e -= ot ? (st - ot) / 2 : (st - (_[qt + 1] - _[qt] - lt)) / 2), t <= e;
        }function Bn() {
            for (var t in F = 0, k) {
                (t = parseInt(t)) <= J && (F = t);
            }
        }function Sn() {
            !Tt && Xe && Ui(Xe), !Ct && Se && Ui(Se), xt || (Me ? Ui(Me) : (Ee && Ui(Ee), Ae && Ui(Ae)));
        }function On() {
            Tt && Xe && _i(Xe), Ct && Se && _i(Se), xt && (Me ? _i(Me) : (Ee && _i(Ee), Ae && _i(Ae)));
        }function Dn() {
            if (!ie) {
                if (ut && (V.style.margin = "0px"), Dt) for (var t = "tns-transparent", e = Dt; e--;) {
                    I && Vi(Y[e], t), Vi(Y[Ht - e - 1], t);
                }Sn(), ie = !0;
            }
        }function Hn() {
            if (!te) {
                if (Bt.disabled = !0, G.className = G.className.replace(_t.substring(1), ""), Ki(G, ["style"]), yt) for (var t = Dt; t--;) {
                    I && Ui(Y[t]), Ui(Y[Ht - t - 1]);
                }if (q && I || Ki(V, ["style"]), !I) for (var e = qt, n = qt + K; e < n; e++) {
                    var i = Y[e];Ki(i, ["style"]), Gi(i, P), Gi(i, W);
                }Sn(), te = !0;
            }
        }function kn() {
            var t = Rn();$.innerHTML !== t && ($.innerHTML = t);
        }function Rn() {
            var t = In(),
                e = t[0] + 1,
                n = t[1] + 1;return e === n ? e + "" : e + " to " + n;
        }function In(t) {
            null == t && (t = ii());var n,
                i,
                a,
                r = qt;if (ct || ut ? (rt || ot) && (i = -(parseFloat(t) + ut), a = i + st + 2 * ut) : rt && (i = _[qt], a = i + st), rt) _.forEach(function (t, e) {
                e < Ht && ((ct || ut) && t <= i + .5 && (r = e), .5 <= a - t && (n = e));
            });else {
                if (ot) {
                    var e = ot + lt;ct || ut ? (r = Math.floor(i / e), n = Math.ceil(a / e - 1)) : n = r + Math.ceil(st / e) - 1;
                } else if (ct || ut) {
                    var o = ft - 1;if (ct ? (r -= o / 2, n = qt + o / 2) : n = qt + o, ut) {
                        var u = ut * ft / st;r -= u, n += u;
                    }r = Math.floor(r), n = Math.ceil(n);
                } else n = r + ft - 1;r = Math.max(r, 0), n = Math.min(n, Ht - 1);
            }return [r, n];
        }function Pn() {
            St && !$t && Fn.apply(null, In()).forEach(function (t) {
                if (!ji(t, ge)) {
                    var e = {};e[C] = function (t) {
                        t.stopPropagation();
                    }, ea(t, e), ea(t, xe), t.src = Xi(t, "data-src");var n = Xi(t, "data-srcset");n && (t.srcset = n), Vi(t, "loading");
                }
            });
        }function zn(t) {
            Vi(t, "loaded"), Wn(t);
        }function Wn(t) {
            Vi(t, "tns-complete"), Gi(t, "loading"), na(t, xe);
        }function Fn(t, e) {
            for (var n = []; t <= e;) {
                qi(Y[t].querySelectorAll("img"), function (t) {
                    n.push(t);
                }), t++;
            }return n;
        }function qn() {
            var t = Fn.apply(null, In());Oi(function () {
                jn(t, Xn);
            });
        }function jn(n, t) {
            return Z ? t() : (n.forEach(function (t, e) {
                ji(t, ge) && n.splice(e, 1);
            }), n.length ? void Oi(function () {
                jn(n, t);
            }) : t());
        }function Vn() {
            Pn(), Kn(), kn(), $n(), function () {
                if (Ct && (Re = 0 <= ke ? ke : ln(), ke = -1, Re !== Ie)) {
                    var t = Be[Ie],
                        e = Be[Re];Yi(t, { tabindex: "-1", "aria-label": ze + (Ie + 1) }), Gi(t, Pe), Yi(e, { "aria-label": ze + (Re + 1) + We }), Ki(e, "tabindex"), Vi(e, Pe), Ie = Re;
                }
            }();
        }function Gn() {
            I && gt && (S.style[x] = mt / 1e3 + "s");
        }function Qn(t, e) {
            for (var n = [], i = t, a = Math.min(t + e, Ht); i < a; i++) {
                n.push(Y[i].offsetHeight);
            }return Math.max.apply(null, n);
        }function Xn() {
            var t = gt ? Qn(qt, ft) : Qn(Dt, K),
                e = S || V;e.style.height !== t && (e.style.height = t + "px");
        }function Yn() {
            _ = [0];var n = q ? "left" : "top",
                i = q ? "right" : "bottom",
                a = Y[0].getBoundingClientRect()[n];qi(Y, function (t, e) {
                e && _.push(t.getBoundingClientRect()[n] - a), e === Ht - 1 && _.push(t.getBoundingClientRect()[i] - a);
            });
        }function Kn() {
            var t = In(),
                n = t[0],
                i = t[1];qi(Y, function (t, e) {
                n <= e && e <= i ? Qi(t, "aria-hidden") && (Ki(t, ["aria-hidden", "tabindex"]), Vi(t, ye)) : Qi(t, "aria-hidden") || (Yi(t, { "aria-hidden": "true", tabindex: "-1" }), Gi(t, ye));
            });
        }function Jn(t) {
            return t.nodeName.toLowerCase();
        }function Un(t) {
            return "button" === Jn(t);
        }function _n(t) {
            return "true" === t.getAttribute("aria-disabled");
        }function Zn(t, e, n) {
            t ? e.disabled = n : e.setAttribute("aria-disabled", n.toString());
        }function $n() {
            if (xt && !ht && !yt) {
                var t = Ce ? Ee.disabled : _n(Ee),
                    e = we ? Ae.disabled : _n(Ae),
                    n = qt <= Vt,
                    i = !ht && Gt <= qt;n && !t && Zn(Ce, Ee, !0), !n && t && Zn(Ce, Ee, !1), i && !e && Zn(we, Ae, !0), !i && e && Zn(we, Ae, !1);
            }
        }function ti(t, e) {
            x && (t.style[x] = e);
        }function ei(t) {
            return null == t && (t = qt), rt ? (st - (ut ? lt : 0) - (_[t + 1] - _[t] - lt)) / 2 : ot ? (st - ot) / 2 : (ft - 1) / 2;
        }function ni() {
            var t = st + (ut ? lt : 0) - (ot ? (ot + lt) * Ht : _[Ht]);return ct && !yt && (t = ot ? -(ot + lt) * (Ht - 1) - ei() : ei(Ht - 1) - _[Ht - 1]), 0 < t && (t = 0), t;
        }function ii(t) {
            var e;if (null == t && (t = qt), q && !rt) {
                if (ot) e = -(ot + lt) * t, ct && (e += ei());else {
                    var n = d ? Ht : ft;ct && (t -= ei()), e = 100 * -t / n;
                }
            } else e = -_[t], ct && rt && (e += ei());return kt && (e = Math.max(e, Rt)), e += !q || rt || ot ? "px" : "%";
        }function ai(t) {
            ti(G, "0s"), ri(t);
        }function ri(t) {
            null == t && (t = ii()), G.style[Pt] = zt + t + Wt;
        }function oi(t, e, n, i) {
            var a = t + ft;yt || (a = Math.min(a, Ht));for (var r = t; r < a; r++) {
                var o = Y[r];i || (o.style.left = 100 * (r - qt) / ft + "%"), B && p && (o.style[p] = o.style[m] = B * (r - t) / 1e3 + "s"), Gi(o, e), Vi(o, n), i && Ot.push(o);
            }
        }function ui(t, e) {
            It && en(), (qt !== jt || e) && (Ut.emit("indexChanged", Si()), Ut.emit("transitionStart", Si()), gt && qn(), qe && t && 0 <= ["click", "keydown"].indexOf(t.type) && hi(), Kt = !0, nn());
        }function li(t) {
            return t.toLowerCase().replace(/-/g, "");
        }function si(t) {
            if (I || Kt) {
                if (Ut.emit("transitionEnd", Si(t)), !I && 0 < Ot.length) for (var e = 0; e < Ot.length; e++) {
                    var n = Ot[e];n.style.left = "", m && p && (n.style[m] = "", n.style[p] = ""), Gi(n, z), Vi(n, W);
                }if (!t || !I && t.target.parentNode === G || t.target === G && li(t.propertyName) === li(Pt)) {
                    if (!It) {
                        var i = qt;en(), qt !== i && (Ut.emit("indexChanged", Si()), ai());
                    }"inner" === R && Ut.emit("innerLoaded", Si()), Kt = !1, jt = qt;
                }
            }
        }function ci(t, e) {
            if (!ne) if ("prev" === t) fi(e, -1);else if ("next" === t) fi(e, 1);else {
                if (Kt) {
                    if (Qt) return;si();
                }var n = un(),
                    i = 0;if ("first" === t ? i = -n : "last" === t ? i = I ? K - ft - n : K - 1 - n : ("number" != typeof t && (t = parseInt(t)), isNaN(t) || (e || (t = Math.max(0, Math.min(K - 1, t))), i = t - n)), !I && i && Math.abs(i) < ft) {
                    var a = 0 < i ? 1 : -1;i += Vt <= qt + i - K ? K * a : 2 * K * a * -1;
                }qt += i, I && yt && (qt < Vt && (qt += K), Gt < qt && (qt -= K)), un(qt) !== un(jt) && ui(e);
            }
        }function fi(t, e) {
            if (Kt) {
                if (Qt) return;si();
            }var n;if (!e) {
                for (var i = bi(t = xi(t)); i !== Me && [Ee, Ae].indexOf(i) < 0;) {
                    i = i.parentNode;
                }var a = [Ee, Ae].indexOf(i);0 <= a && (n = !0, e = 0 === a ? -1 : 1);
            }if (ht) {
                if (qt === Vt && -1 === e) return void ci("last", t);if (qt === Gt && 1 === e) return void ci("first", t);
            }e && (qt += dt * e, rt && (qt = Math.floor(qt)), ui(n || t && "keydown" === t.type ? t : null));
        }function di() {
            Fe = setInterval(function () {
                fi(null, Qe);
            }, Et), qe = !0;
        }function vi() {
            clearInterval(Fe), qe = !1;
        }function pi(t, e) {
            Yi(Xe, { "data-action": t }), Xe.innerHTML = Ke[0] + t + Ke[1] + e;
        }function mi() {
            di(), Xe && pi("stop", At[1]);
        }function hi() {
            vi(), Xe && pi("start", At[0]);
        }function yi() {
            qe ? (hi(), Ve = !0) : (mi(), Ve = !1);
        }function gi(t) {
            t.focus();
        }function xi(t) {
            return Ci(t = t || h.event) ? t.changedTouches[0] : t;
        }function bi(t) {
            return t.target || h.event.srcElement;
        }function Ci(t) {
            return 0 <= t.type.indexOf("touch");
        }function wi(t) {
            t.preventDefault ? t.preventDefault() : t.returnValue = !1;
        }function Mi() {
            return a = Ze.y - _e.y, r = Ze.x - _e.x, t = Math.atan2(a, r) * (180 / Math.PI), e = Xt, n = !1, i = Math.abs(90 - Math.abs(t)), 90 - e <= i ? n = "horizontal" : i <= e && (n = "vertical"), n === O.axis;var t, e, n, i, a, r;
        }function Ti(t) {
            if (Kt) {
                if (Qt) return;si();
            }Tt && qe && vi(), $e = !0, Ue && (Di(Ue), Ue = null);var e = xi(t);Ut.emit(Ci(t) ? "touchStart" : "dragStart", Si(t)), !Ci(t) && 0 <= ["img", "a"].indexOf(Jn(bi(t))) && wi(t), Ze.x = _e.x = e.clientX, Ze.y = _e.y = e.clientY, I && (Je = parseFloat(G.style[Pt].replace(zt, "")), ti(G, "0s"));
        }function Ei(t) {
            if ($e) {
                var e = xi(t);Ze.x = e.clientX, Ze.y = e.clientY, I ? Ue || (Ue = Oi(function () {
                    !function t(e) {
                        if (!Yt) return void ($e = !1);Di(Ue);$e && (Ue = Oi(function () {
                            t(e);
                        }));"?" === Yt && (Yt = Mi());if (Yt) {
                            !be && Ci(e) && (be = !0);try {
                                e.type && Ut.emit(Ci(e) ? "touchMove" : "dragMove", Si(e));
                            } catch (t) {}var n = Je,
                                i = tn(Ze, _e);if (!q || ot || rt) n += i, n += "px";else {
                                var a = d ? i * ft * 100 / ((st + lt) * Ht) : 100 * i / (st + lt);n += a, n += "%";
                            }G.style[Pt] = zt + n + Wt;
                        }
                    }(t);
                })) : ("?" === Yt && (Yt = Mi()), Yt && (be = !0)), be && t.preventDefault();
            }
        }function Ai(i) {
            if ($e) {
                Ue && (Di(Ue), Ue = null), I && ti(G, ""), $e = !1;var t = xi(i);Ze.x = t.clientX, Ze.y = t.clientY;var a = tn(Ze, _e);if (Math.abs(a)) {
                    if (!Ci(i)) {
                        var n = bi(i);ea(n, { click: function t(e) {
                                wi(e), na(n, { click: t });
                            } });
                    }I ? Ue = Oi(function () {
                        if (q && !rt) {
                            var t = -a * ft / (st + lt);t = 0 < a ? Math.floor(t) : Math.ceil(t), qt += t;
                        } else {
                            var e = -(Je + a);if (e <= 0) qt = Vt;else if (e >= _[Ht - 1]) qt = Gt;else for (var n = 0; n < Ht && e >= _[n];) {
                                e > _[qt = n] && a < 0 && (qt += 1), n++;
                            }
                        }ui(i, a), Ut.emit(Ci(i) ? "touchEnd" : "dragEnd", Si(i));
                    }) : Yt && fi(i, 0 < a ? -1 : 1);
                }
            }"auto" === O.preventScrollOnTouch && (be = !1), Xt && (Yt = "?"), Tt && !qe && di();
        }function Ni() {
            (S || V).style.height = _[qt + ft] - _[qt] + "px";
        }function Li() {
            var t = ot ? (ot + lt) * K / st : K / ft;return Math.min(Math.ceil(t), K);
        }function Bi() {
            if (Ct && !ve && De !== He) {
                var t = He,
                    e = De,
                    n = _i;for (De < He && (t = De, e = He, n = Ui); t < e;) {
                    n(Be[t]), t++;
                }He = De;
            }
        }function Si(t) {
            return { container: G, slideItems: Y, navContainer: Se, navItems: Be, controlsContainer: Me, hasControls: fe, prevButton: Ee, nextButton: Ae, items: ft, slideBy: dt, cloneCount: Dt, slideCount: K, slideCountNew: Ht, index: qt, indexCached: jt, displayIndex: rn(), navCurrentIndex: Re, navCurrentIndexCached: Ie, pages: De, pagesCached: He, sheet: Bt, isOn: U, event: t || {} };
        }M && console.warn("No slides found in", O.container);
    };return aa;
}();

/*!
    Colorbox 1.6.4
    license: MIT
    http://www.jacklmoore.com/colorbox
*/
(function ($, document, window) {
    var
    // Default settings object.
    // See http://jacklmoore.com/colorbox for details.
    defaults = {
        // data sources
        html: false,
        photo: false,
        iframe: false,
        inline: false,

        // behavior and appearance
        transition: "elastic",
        speed: 300,
        fadeOut: 300,
        width: false,
        initialWidth: "600",
        innerWidth: false,
        maxWidth: false,
        height: false,
        initialHeight: "450",
        innerHeight: false,
        maxHeight: false,
        scalePhotos: true,
        scrolling: true,
        opacity: 0.9,
        preloading: true,
        className: false,
        overlayClose: true,
        escKey: true,
        arrowKey: true,
        top: false,
        bottom: false,
        left: false,
        right: false,
        fixed: false,
        data: undefined,
        closeButton: true,
        fastIframe: true,
        open: false,
        reposition: true,
        loop: true,
        slideshow: false,
        slideshowAuto: true,
        slideshowSpeed: 2500,
        slideshowStart: "start slideshow",
        slideshowStop: "stop slideshow",
        photoRegex: /\.(gif|png|jp(e|g|eg)|bmp|ico|webp|jxr|svg)((#|\?).*)?$/i,

        // alternate image paths for high-res displays
        retinaImage: false,
        retinaUrl: false,
        retinaSuffix: '@2x.$1',

        // internationalization
        current: "image {current} of {total}",
        previous: "previous",
        next: "next",
        close: "close",
        xhrError: "This content failed to load.",
        imgError: "This image failed to load.",

        // accessbility
        returnFocus: true,
        trapFocus: true,

        // callbacks
        onOpen: false,
        onLoad: false,
        onComplete: false,
        onCleanup: false,
        onClosed: false,

        rel: function rel() {
            return this.rel;
        },
        href: function href() {
            // using this.href would give the absolute url, when the href may have been inteded as a selector (e.g. '#container')
            return $(this).attr('href');
        },
        title: function title() {
            return this.title;
        },
        createImg: function createImg() {
            var img = new Image();
            var attrs = $(this).data('cbox-img-attrs');

            if ((typeof attrs === 'undefined' ? 'undefined' : _typeof(attrs)) === 'object') {
                $.each(attrs, function (key, val) {
                    img[key] = val;
                });
            }

            return img;
        },
        createIframe: function createIframe() {
            var iframe = document.createElement('iframe');
            var attrs = $(this).data('cbox-iframe-attrs');

            if ((typeof attrs === 'undefined' ? 'undefined' : _typeof(attrs)) === 'object') {
                $.each(attrs, function (key, val) {
                    iframe[key] = val;
                });
            }

            if ('frameBorder' in iframe) {
                iframe.frameBorder = 0;
            }
            if ('allowTransparency' in iframe) {
                iframe.allowTransparency = "true";
            }
            iframe.name = new Date().getTime(); // give the iframe a unique name to prevent caching
            iframe.allowFullscreen = true;

            return iframe;
        }
    },


    // Abstracting the HTML and event identifiers for easy rebranding
    colorbox = 'colorbox',
        prefix = 'cbox',
        boxElement = prefix + 'Element',


    // Events
    event_open = prefix + '_open',
        event_load = prefix + '_load',
        event_complete = prefix + '_complete',
        event_cleanup = prefix + '_cleanup',
        event_closed = prefix + '_closed',
        event_purge = prefix + '_purge',


    // Cached jQuery Object Variables
    $overlay,
        $box,
        $wrap,
        $content,
        $topBorder,
        $leftBorder,
        $rightBorder,
        $bottomBorder,
        $related,
        $window,
        $loaded,
        $loadingBay,
        $loadingOverlay,
        $title,
        $current,
        $slideshow,
        $next,
        $prev,
        $close,
        $groupControls,
        $events = $('<a/>'),
        // $({}) would be preferred, but there is an issue with jQuery 1.4.2

    // Variables for cached values or use across multiple functions
    settings,
        interfaceHeight,
        interfaceWidth,
        loadedHeight,
        loadedWidth,
        index,
        photo,
        open,
        active,
        closing,
        loadingTimer,
        publicMethod,
        div = "div",
        requests = 0,
        previousCSS = {},
        init;

    // ****************
    // HELPER FUNCTIONS
    // ****************

    // Convenience function for creating new jQuery objects
    function $tag(tag, id, css) {
        var element = document.createElement(tag);

        if (id) {
            element.id = prefix + id;
        }

        if (css) {
            element.style.cssText = css;
        }

        return $(element);
    }

    // Get the window height using innerHeight when available to avoid an issue with iOS
    // http://bugs.jquery.com/ticket/6724
    function winheight() {
        return window.innerHeight ? window.innerHeight : $(window).height();
    }

    function Settings(element, options) {
        if (options !== Object(options)) {
            options = {};
        }

        this.cache = {};
        this.el = element;

        this.value = function (key) {
            var dataAttr;

            if (this.cache[key] === undefined) {
                dataAttr = $(this.el).attr('data-cbox-' + key);

                if (dataAttr !== undefined) {
                    this.cache[key] = dataAttr;
                } else if (options[key] !== undefined) {
                    this.cache[key] = options[key];
                } else if (defaults[key] !== undefined) {
                    this.cache[key] = defaults[key];
                }
            }

            return this.cache[key];
        };

        this.get = function (key) {
            var value = this.value(key);
            return $.isFunction(value) ? value.call(this.el, this) : value;
        };
    }

    // Determine the next and previous members in a group.
    function getIndex(increment) {
        var max = $related.length,
            newIndex = (index + increment) % max;

        return newIndex < 0 ? max + newIndex : newIndex;
    }

    // Convert '%' and 'px' values to integers
    function setSize(size, dimension) {
        return Math.round((/%/.test(size) ? (dimension === 'x' ? $window.width() : winheight()) / 100 : 1) * parseInt(size, 10));
    }

    // Checks an href to see if it is a photo.
    // There is a force photo option (photo: true) for hrefs that cannot be matched by the regex.
    function isImage(settings, url) {
        return settings.get('photo') || settings.get('photoRegex').test(url);
    }

    function retinaUrl(settings, url) {
        return settings.get('retinaUrl') && window.devicePixelRatio > 1 ? url.replace(settings.get('photoRegex'), settings.get('retinaSuffix')) : url;
    }

    function trapFocus(e) {
        if ('contains' in $box[0] && !$box[0].contains(e.target) && e.target !== $overlay[0]) {
            e.stopPropagation();
            $box.focus();
        }
    }

    function setClass(str) {
        if (setClass.str !== str) {
            $box.add($overlay).removeClass(setClass.str).addClass(str);
            setClass.str = str;
        }
    }

    function getRelated(rel) {
        index = 0;

        if (rel && rel !== false && rel !== 'nofollow') {
            $related = $('.' + boxElement).filter(function () {
                var options = $.data(this, colorbox);
                var settings = new Settings(this, options);
                return settings.get('rel') === rel;
            });
            index = $related.index(settings.el);

            // Check direct calls to Colorbox.
            if (index === -1) {
                $related = $related.add(settings.el);
                index = $related.length - 1;
            }
        } else {
            $related = $(settings.el);
        }
    }

    function trigger(event) {
        // for external use
        $(document).trigger(event);
        // for internal use
        $events.triggerHandler(event);
    }

    var slideshow = function () {
        var active,
            className = prefix + "Slideshow_",
            click = "click." + prefix,
            timeOut;

        function clear() {
            clearTimeout(timeOut);
        }

        function set() {
            if (settings.get('loop') || $related[index + 1]) {
                clear();
                timeOut = setTimeout(publicMethod.next, settings.get('slideshowSpeed'));
            }
        }

        function start() {
            $slideshow.html(settings.get('slideshowStop')).unbind(click).one(click, stop);

            $events.bind(event_complete, set).bind(event_load, clear);

            $box.removeClass(className + "off").addClass(className + "on");
        }

        function stop() {
            clear();

            $events.unbind(event_complete, set).unbind(event_load, clear);

            $slideshow.html(settings.get('slideshowStart')).unbind(click).one(click, function () {
                publicMethod.next();
                start();
            });

            $box.removeClass(className + "on").addClass(className + "off");
        }

        function reset() {
            active = false;
            $slideshow.hide();
            clear();
            $events.unbind(event_complete, set).unbind(event_load, clear);
            $box.removeClass(className + "off " + className + "on");
        }

        return function () {
            if (active) {
                if (!settings.get('slideshow')) {
                    $events.unbind(event_cleanup, reset);
                    reset();
                }
            } else {
                if (settings.get('slideshow') && $related[1]) {
                    active = true;
                    $events.one(event_cleanup, reset);
                    if (settings.get('slideshowAuto')) {
                        start();
                    } else {
                        stop();
                    }
                    $slideshow.show();
                }
            }
        };
    }();

    function launch(element) {
        var options;

        if (!closing) {

            options = $(element).data(colorbox);

            settings = new Settings(element, options);

            getRelated(settings.get('rel'));

            if (!open) {
                open = active = true; // Prevents the page-change action from queuing up if the visitor holds down the left or right keys.

                setClass(settings.get('className'));

                // Show colorbox so the sizes can be calculated in older versions of jQuery
                $box.css({ visibility: 'hidden', display: 'block', opacity: '' });

                $loaded = $tag(div, 'LoadedContent', 'width:0; height:0; overflow:hidden; visibility:hidden');
                $content.css({ width: '', height: '' }).append($loaded);

                // Cache values needed for size calculations
                interfaceHeight = $topBorder.height() + $bottomBorder.height() + $content.outerHeight(true) - $content.height();
                interfaceWidth = $leftBorder.width() + $rightBorder.width() + $content.outerWidth(true) - $content.width();
                loadedHeight = $loaded.outerHeight(true);
                loadedWidth = $loaded.outerWidth(true);

                // Opens inital empty Colorbox prior to content being loaded.
                var initialWidth = setSize(settings.get('initialWidth'), 'x');
                var initialHeight = setSize(settings.get('initialHeight'), 'y');
                var maxWidth = settings.get('maxWidth');
                var maxHeight = settings.get('maxHeight');

                settings.w = Math.max((maxWidth !== false ? Math.min(initialWidth, setSize(maxWidth, 'x')) : initialWidth) - loadedWidth - interfaceWidth, 0);
                settings.h = Math.max((maxHeight !== false ? Math.min(initialHeight, setSize(maxHeight, 'y')) : initialHeight) - loadedHeight - interfaceHeight, 0);

                $loaded.css({ width: '', height: settings.h });
                publicMethod.position();

                trigger(event_open);
                settings.get('onOpen');

                $groupControls.add($title).hide();

                $box.focus();

                if (settings.get('trapFocus')) {
                    // Confine focus to the modal
                    // Uses event capturing that is not supported in IE8-
                    if (document.addEventListener) {

                        document.addEventListener('focus', trapFocus, true);

                        $events.one(event_closed, function () {
                            document.removeEventListener('focus', trapFocus, true);
                        });
                    }
                }

                // Return focus on closing
                if (settings.get('returnFocus')) {
                    $events.one(event_closed, function () {
                        $(settings.el).focus();
                    });
                }
            }

            var opacity = parseFloat(settings.get('opacity'));
            $overlay.css({
                opacity: opacity === opacity ? opacity : '',
                cursor: settings.get('overlayClose') ? 'pointer' : '',
                visibility: 'visible'
            }).show();

            if (settings.get('closeButton')) {
                $close.html(settings.get('close')).appendTo($content);
            } else {
                $close.appendTo('<div/>'); // replace with .detach() when dropping jQuery < 1.4
            }

            load();
        }
    }

    // Colorbox's markup needs to be added to the DOM prior to being called
    // so that the browser will go ahead and load the CSS background images.
    function appendHTML() {
        if (!$box) {
            init = false;
            $window = $(window);
            $box = $tag(div).attr({
                id: colorbox,
                'class': $.support.opacity === false ? prefix + 'IE' : '', // class for optional IE8 & lower targeted CSS.
                role: 'dialog',
                tabindex: '-1'
            }).hide();
            $overlay = $tag(div, "Overlay").hide();
            $loadingOverlay = $([$tag(div, "LoadingOverlay")[0], $tag(div, "LoadingGraphic")[0]]);
            $wrap = $tag(div, "Wrapper");
            $content = $tag(div, "Content").append($title = $tag(div, "Title"), $current = $tag(div, "Current"), $prev = $('<button type="button"/>').attr({ id: prefix + 'Previous' }), $next = $('<button type="button"/>').attr({ id: prefix + 'Next' }), $slideshow = $('<button type="button"/>').attr({ id: prefix + 'Slideshow' }), $loadingOverlay);

            $close = $('<button type="button"/>').attr({ id: prefix + 'Close' });

            $wrap.append( // The 3x3 Grid that makes up Colorbox
            $tag(div).append($tag(div, "TopLeft"), $topBorder = $tag(div, "TopCenter"), $tag(div, "TopRight")), $tag(div, false, 'clear:left').append($leftBorder = $tag(div, "MiddleLeft"), $content, $rightBorder = $tag(div, "MiddleRight")), $tag(div, false, 'clear:left').append($tag(div, "BottomLeft"), $bottomBorder = $tag(div, "BottomCenter"), $tag(div, "BottomRight"))).find('div div').css({ 'float': 'left' });

            $loadingBay = $tag(div, false, 'position:absolute; width:9999px; visibility:hidden; display:none; max-width:none;');

            $groupControls = $next.add($prev).add($current).add($slideshow);
        }
        if (document.body && !$box.parent().length) {
            $(document.body).append($overlay, $box.append($wrap, $loadingBay));
        }
    }

    // Add Colorbox's event bindings
    function addBindings() {
        function clickHandler(e) {
            // ignore non-left-mouse-clicks and clicks modified with ctrl / command, shift, or alt.
            // See: http://jacklmoore.com/notes/click-events/
            if (!(e.which > 1 || e.shiftKey || e.altKey || e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                launch(this);
            }
        }

        if ($box) {
            if (!init) {
                init = true;

                // Anonymous functions here keep the public method from being cached, thereby allowing them to be redefined on the fly.
                $next.click(function () {
                    publicMethod.next();
                });
                $prev.click(function () {
                    publicMethod.prev();
                });
                $close.click(function () {
                    publicMethod.close();
                });
                $overlay.click(function () {
                    if (settings.get('overlayClose')) {
                        publicMethod.close();
                    }
                });

                // Key Bindings
                $(document).bind('keydown.' + prefix, function (e) {
                    var key = e.keyCode;
                    if (open && settings.get('escKey') && key === 27) {
                        e.preventDefault();
                        publicMethod.close();
                    }
                    if (open && settings.get('arrowKey') && $related[1] && !e.altKey) {
                        if (key === 37) {
                            e.preventDefault();
                            $prev.click();
                        } else if (key === 39) {
                            e.preventDefault();
                            $next.click();
                        }
                    }
                });

                if ($.isFunction($.fn.on)) {
                    // For jQuery 1.7+
                    $(document).on('click.' + prefix, '.' + boxElement, clickHandler);
                } else {
                    // For jQuery 1.3.x -> 1.6.x
                    // This code is never reached in jQuery 1.9, so do not contact me about 'live' being removed.
                    // This is not here for jQuery 1.9, it's here for legacy users.
                    $('.' + boxElement).live('click.' + prefix, clickHandler);
                }
            }
            return true;
        }
        return false;
    }

    // Don't do anything if Colorbox already exists.
    if ($[colorbox]) {
        return;
    }

    // Append the HTML when the DOM loads
    $(appendHTML);

    // ****************
    // PUBLIC FUNCTIONS
    // Usage format: $.colorbox.close();
    // Usage from within an iframe: parent.jQuery.colorbox.close();
    // ****************

    publicMethod = $.fn[colorbox] = $[colorbox] = function (options, callback) {
        var settings;
        var $obj = this;

        options = options || {};

        if ($.isFunction($obj)) {
            // assume a call to $.colorbox
            $obj = $('<a/>');
            options.open = true;
        }

        if (!$obj[0]) {
            // colorbox being applied to empty collection
            return $obj;
        }

        appendHTML();

        if (addBindings()) {

            if (callback) {
                options.onComplete = callback;
            }

            $obj.each(function () {
                var old = $.data(this, colorbox) || {};
                $.data(this, colorbox, $.extend(old, options));
            }).addClass(boxElement);

            settings = new Settings($obj[0], options);

            if (settings.get('open')) {
                launch($obj[0]);
            }
        }

        return $obj;
    };

    publicMethod.position = function (speed, loadedCallback) {
        var css,
            top = 0,
            left = 0,
            offset = $box.offset(),
            scrollTop,
            scrollLeft;

        $window.unbind('resize.' + prefix);

        // remove the modal so that it doesn't influence the document width/height
        $box.css({ top: -9e4, left: -9e4 });

        scrollTop = $window.scrollTop();
        scrollLeft = $window.scrollLeft();

        if (settings.get('fixed')) {
            offset.top -= scrollTop;
            offset.left -= scrollLeft;
            $box.css({ position: 'fixed' });
        } else {
            top = scrollTop;
            left = scrollLeft;
            $box.css({ position: 'absolute' });
        }

        // keeps the top and left positions within the browser's viewport.
        if (settings.get('right') !== false) {
            left += Math.max($window.width() - settings.w - loadedWidth - interfaceWidth - setSize(settings.get('right'), 'x'), 0);
        } else if (settings.get('left') !== false) {
            left += setSize(settings.get('left'), 'x');
        } else {
            left += Math.round(Math.max($window.width() - settings.w - loadedWidth - interfaceWidth, 0) / 2);
        }

        if (settings.get('bottom') !== false) {
            top += Math.max(winheight() - settings.h - loadedHeight - interfaceHeight - setSize(settings.get('bottom'), 'y'), 0);
        } else if (settings.get('top') !== false) {
            top += setSize(settings.get('top'), 'y');
        } else {
            top += Math.round(Math.max(winheight() - settings.h - loadedHeight - interfaceHeight, 0) / 2);
        }

        $box.css({ top: offset.top, left: offset.left, visibility: 'visible' });

        // this gives the wrapper plenty of breathing room so it's floated contents can move around smoothly,
        // but it has to be shrank down around the size of div#colorbox when it's done.  If not,
        // it can invoke an obscure IE bug when using iframes.
        $wrap[0].style.width = $wrap[0].style.height = "9999px";

        function modalDimensions() {
            $topBorder[0].style.width = $bottomBorder[0].style.width = $content[0].style.width = parseInt($box[0].style.width, 10) - interfaceWidth + 'px';
            $content[0].style.height = $leftBorder[0].style.height = $rightBorder[0].style.height = parseInt($box[0].style.height, 10) - interfaceHeight + 'px';
        }

        css = { width: settings.w + loadedWidth + interfaceWidth, height: settings.h + loadedHeight + interfaceHeight, top: top, left: left };

        // setting the speed to 0 if the content hasn't changed size or position
        if (speed) {
            var tempSpeed = 0;
            $.each(css, function (i) {
                if (css[i] !== previousCSS[i]) {
                    tempSpeed = speed;
                    return;
                }
            });
            speed = tempSpeed;
        }

        previousCSS = css;

        if (!speed) {
            $box.css(css);
        }

        $box.dequeue().animate(css, {
            duration: speed || 0,
            complete: function complete() {
                modalDimensions();

                active = false;

                // shrink the wrapper down to exactly the size of colorbox to avoid a bug in IE's iframe implementation.
                $wrap[0].style.width = settings.w + loadedWidth + interfaceWidth + "px";
                $wrap[0].style.height = settings.h + loadedHeight + interfaceHeight + "px";

                if (settings.get('reposition')) {
                    setTimeout(function () {
                        // small delay before binding onresize due to an IE8 bug.
                        $window.bind('resize.' + prefix, publicMethod.position);
                    }, 1);
                }

                if ($.isFunction(loadedCallback)) {
                    loadedCallback();
                }
            },
            step: modalDimensions
        });
    };

    publicMethod.resize = function (options) {
        var scrolltop;

        if (open) {
            options = options || {};

            if (options.width) {
                settings.w = setSize(options.width, 'x') - loadedWidth - interfaceWidth;
            }

            if (options.innerWidth) {
                settings.w = setSize(options.innerWidth, 'x');
            }

            $loaded.css({ width: settings.w });

            if (options.height) {
                settings.h = setSize(options.height, 'y') - loadedHeight - interfaceHeight;
            }

            if (options.innerHeight) {
                settings.h = setSize(options.innerHeight, 'y');
            }

            if (!options.innerHeight && !options.height) {
                scrolltop = $loaded.scrollTop();
                $loaded.css({ height: "auto" });
                settings.h = $loaded.height();
            }

            $loaded.css({ height: settings.h });

            if (scrolltop) {
                $loaded.scrollTop(scrolltop);
            }

            publicMethod.position(settings.get('transition') === "none" ? 0 : settings.get('speed'));
        }
    };

    publicMethod.prep = function (object) {
        if (!open) {
            return;
        }

        var callback,
            speed = settings.get('transition') === "none" ? 0 : settings.get('speed');

        $loaded.remove();

        $loaded = $tag(div, 'LoadedContent').append(object);

        function getWidth() {
            settings.w = settings.w || $loaded.width();
            settings.w = settings.mw && settings.mw < settings.w ? settings.mw : settings.w;
            return settings.w;
        }
        function getHeight() {
            settings.h = settings.h || $loaded.height();
            settings.h = settings.mh && settings.mh < settings.h ? settings.mh : settings.h;
            return settings.h;
        }

        $loaded.hide().appendTo($loadingBay.show()) // content has to be appended to the DOM for accurate size calculations.
        .css({ width: getWidth(), overflow: settings.get('scrolling') ? 'auto' : 'hidden' }).css({ height: getHeight() }) // sets the height independently from the width in case the new width influences the value of height.
        .prependTo($content);

        $loadingBay.hide();

        // floating the IMG removes the bottom line-height and fixed a problem where IE miscalculates the width of the parent element as 100% of the document width.

        $(photo).css({ 'float': 'none' });

        setClass(settings.get('className'));

        callback = function callback() {
            var total = $related.length,
                iframe,
                complete;

            if (!open) {
                return;
            }

            function removeFilter() {
                // Needed for IE8 in versions of jQuery prior to 1.7.2
                if ($.support.opacity === false) {
                    $box[0].style.removeAttribute('filter');
                }
            }

            complete = function complete() {
                clearTimeout(loadingTimer);
                $loadingOverlay.hide();
                trigger(event_complete);
                settings.get('onComplete');
            };

            $title.html(settings.get('title')).show();
            $loaded.show();

            if (total > 1) {
                // handle grouping
                if (typeof settings.get('current') === "string") {
                    $current.html(settings.get('current').replace('{current}', index + 1).replace('{total}', total)).show();
                }

                $next[settings.get('loop') || index < total - 1 ? "show" : "hide"]().html(settings.get('next'));
                $prev[settings.get('loop') || index ? "show" : "hide"]().html(settings.get('previous'));

                slideshow();

                // Preloads images within a rel group
                if (settings.get('preloading')) {
                    $.each([getIndex(-1), getIndex(1)], function () {
                        var img,
                            i = $related[this],
                            settings = new Settings(i, $.data(i, colorbox)),
                            src = settings.get('href');

                        if (src && isImage(settings, src)) {
                            src = retinaUrl(settings, src);
                            img = document.createElement('img');
                            img.src = src;
                        }
                    });
                }
            } else {
                $groupControls.hide();
            }

            if (settings.get('iframe')) {

                iframe = settings.get('createIframe');

                if (!settings.get('scrolling')) {
                    iframe.scrolling = "no";
                }

                $(iframe).attr({
                    src: settings.get('href'),
                    'class': prefix + 'Iframe'
                }).one('load', complete).appendTo($loaded);

                $events.one(event_purge, function () {
                    iframe.src = "//about:blank";
                });

                if (settings.get('fastIframe')) {
                    $(iframe).trigger('load');
                }
            } else {
                complete();
            }

            if (settings.get('transition') === 'fade') {
                $box.fadeTo(speed, 1, removeFilter);
            } else {
                removeFilter();
            }
        };

        if (settings.get('transition') === 'fade') {
            $box.fadeTo(speed, 0, function () {
                publicMethod.position(0, callback);
            });
        } else {
            publicMethod.position(speed, callback);
        }
    };

    function load() {
        var href,
            setResize,
            prep = publicMethod.prep,
            $inline,
            request = ++requests;

        active = true;

        photo = false;

        trigger(event_purge);
        trigger(event_load);
        settings.get('onLoad');

        settings.h = settings.get('height') ? setSize(settings.get('height'), 'y') - loadedHeight - interfaceHeight : settings.get('innerHeight') && setSize(settings.get('innerHeight'), 'y');

        settings.w = settings.get('width') ? setSize(settings.get('width'), 'x') - loadedWidth - interfaceWidth : settings.get('innerWidth') && setSize(settings.get('innerWidth'), 'x');

        // Sets the minimum dimensions for use in image scaling
        settings.mw = settings.w;
        settings.mh = settings.h;

        // Re-evaluate the minimum width and height based on maxWidth and maxHeight values.
        // If the width or height exceed the maxWidth or maxHeight, use the maximum values instead.
        if (settings.get('maxWidth')) {
            settings.mw = setSize(settings.get('maxWidth'), 'x') - loadedWidth - interfaceWidth;
            settings.mw = settings.w && settings.w < settings.mw ? settings.w : settings.mw;
        }
        if (settings.get('maxHeight')) {
            settings.mh = setSize(settings.get('maxHeight'), 'y') - loadedHeight - interfaceHeight;
            settings.mh = settings.h && settings.h < settings.mh ? settings.h : settings.mh;
        }

        href = settings.get('href');

        loadingTimer = setTimeout(function () {
            $loadingOverlay.show();
        }, 100);

        if (settings.get('inline')) {
            var $target = $(href).eq(0);
            // Inserts an empty placeholder where inline content is being pulled from.
            // An event is bound to put inline content back when Colorbox closes or loads new content.
            $inline = $('<div>').hide().insertBefore($target);

            $events.one(event_purge, function () {
                $inline.replaceWith($target);
            });

            prep($target);
        } else if (settings.get('iframe')) {
            // IFrame element won't be added to the DOM until it is ready to be displayed,
            // to avoid problems with DOM-ready JS that might be trying to run in that iframe.
            prep(" ");
        } else if (settings.get('html')) {
            prep(settings.get('html'));
        } else if (isImage(settings, href)) {

            href = retinaUrl(settings, href);

            photo = settings.get('createImg');

            $(photo).addClass(prefix + 'Photo').bind('error.' + prefix, function () {
                prep($tag(div, 'Error').html(settings.get('imgError')));
            }).one('load', function () {
                if (request !== requests) {
                    return;
                }

                // A small pause because some browsers will occasionally report a
                // img.width and img.height of zero immediately after the img.onload fires
                setTimeout(function () {
                    var percent;

                    if (settings.get('retinaImage') && window.devicePixelRatio > 1) {
                        photo.height = photo.height / window.devicePixelRatio;
                        photo.width = photo.width / window.devicePixelRatio;
                    }

                    if (settings.get('scalePhotos')) {
                        setResize = function setResize() {
                            photo.height -= photo.height * percent;
                            photo.width -= photo.width * percent;
                        };
                        if (settings.mw && photo.width > settings.mw) {
                            percent = (photo.width - settings.mw) / photo.width;
                            setResize();
                        }
                        if (settings.mh && photo.height > settings.mh) {
                            percent = (photo.height - settings.mh) / photo.height;
                            setResize();
                        }
                    }

                    if (settings.h) {
                        photo.style.marginTop = Math.max(settings.mh - photo.height, 0) / 2 + 'px';
                    }

                    if ($related[1] && (settings.get('loop') || $related[index + 1])) {
                        photo.style.cursor = 'pointer';

                        $(photo).bind('click.' + prefix, function () {
                            publicMethod.next();
                        });
                    }

                    photo.style.width = photo.width + 'px';
                    photo.style.height = photo.height + 'px';
                    prep(photo);
                }, 1);
            });

            photo.src = href;
        } else if (href) {
            $loadingBay.load(href, settings.get('data'), function (data, status) {
                if (request === requests) {
                    prep(status === 'error' ? $tag(div, 'Error').html(settings.get('xhrError')) : $(this).contents());
                }
            });
        }
    }

    // Navigates to the next page/image in a set.
    publicMethod.next = function () {
        if (!active && $related[1] && (settings.get('loop') || $related[index + 1])) {
            index = getIndex(1);
            launch($related[index]);
        }
    };

    publicMethod.prev = function () {
        if (!active && $related[1] && (settings.get('loop') || index)) {
            index = getIndex(-1);
            launch($related[index]);
        }
    };

    // Note: to use this within an iframe use the following format: parent.jQuery.colorbox.close();
    publicMethod.close = function () {
        if (open && !closing) {

            closing = true;
            open = false;
            trigger(event_cleanup);
            settings.get('onCleanup');
            $window.unbind('.' + prefix);
            $overlay.fadeTo(settings.get('fadeOut') || 0, 0);

            $box.stop().fadeTo(settings.get('fadeOut') || 0, 0, function () {
                $box.hide();
                $overlay.hide();
                trigger(event_purge);
                $loaded.remove();

                setTimeout(function () {
                    closing = false;
                    trigger(event_closed);
                    settings.get('onClosed');
                }, 1);
            });
        }
    };

    // Removes changes Colorbox made to the document, but does not remove the plugin.
    publicMethod.remove = function () {
        if (!$box) {
            return;
        }

        $box.stop();
        $[colorbox].close();
        $box.stop(false, true).remove();
        $overlay.remove();
        closing = false;
        $box = null;
        $('.' + boxElement).removeData(colorbox).removeClass(boxElement);

        $(document).unbind('click.' + prefix).unbind('keydown.' + prefix);
    };

    // A method for fetching the current element Colorbox is referencing.
    // returns a jQuery object.
    publicMethod.element = function () {
        return $(settings.el);
    };

    publicMethod.settings = defaults;
})(jQuery, document, window);

/* Nick Goodrum's FAUX SELECT Modified by: Fernando Peña
================================================================ */

$(".faux-select").each(function () {
    var $selectWrap = $(this),
        $expander = $selectWrap.children("a"),
        $expandable = $expander.siblings("ul"),
        $expandableChildren = $expandable.children();
    if ($expandableChildren.length <= 0) {
        $selectWrap.hide();
    }
    $expander.on("click", function (e) {
        e.preventDefault();

        if ($selectWrap.hasClass("opened")) {

            $("body").off("click", fauxSelectHandler);
            $expandable.off("keydown", keyboardSelect);
            $expandable.slideUp(function () {
                $selectWrap.removeClass("opened");
            });
        } else {

            $(".faux-select.opened").children("a").trigger("click");

            $selectWrap.addClass("opened");
            $expandable.slideDown(function () {
                $expandable.find("a").attr("tabIndex", -1);
                $expandable.find("li:first-child a").attr("tabIndex", 0).focus();

                $expandable.on("keydown", keyboardSelect);
            });
            $("body").on("click", fauxSelectHandler);
        }

        $expandableChildren.on("click", function (e) {
            $expandableChildren.removeClass("selected");
            $(this).addClass("selected");
            $expander.find(".value").text($(this).text());

            $("body").off("click", fauxSelectHandler);

            $expandable.off("keydown", keyboardSelect);

            $expandable.slideUp(function () {
                $selectWrap.removeClass("opened");
            });
        });
    });

    function keyboardSelect(event) {
        if (event.keyCode !== 27 && event.keyCode !== 9) {
            var $currItem = $(document.activeElement).parent(),
                idx = $currItem.index(),
                $anchor;

            $(event.target).attr("tabIndex", -1);

            // decide what do do based on the keyCode
            event.preventDefault();

            switch (event.keyCode) {
                // move to previous item
                case 37: // left
                case 38:
                    // up
                    if ($currItem.prev().length >= 0) {
                        $anchor = $expandable.find("li:eq(" + (idx - 1) + ") a");
                    } else {
                        $anchor = $expandable.find("li:last-child a");
                    }
                    break;
                // move to next item
                case 39: // right
                case 40:
                    // down
                    if ($currItem.next().length >= 0) {
                        $anchor = $expandable.find("li:eq(" + (idx + 1) + ") a");
                    } else {
                        $anchor = $expandable.find("li:first-child a");
                    }
                    break;
                // go to the beginning of the list
                case 33: // page up
                case 36:
                    // home
                    $anchor = $expandable.find("li:first-child a");
                    break;
                // go to the end of the list
                case 34: // page down
                case 35:
                    // end
                    $anchor = $expandable.find("li:last-child a");
                    break;
            }
            if ($anchor) {
                $currItem.attr("tabIndex", -1);
                $anchor.attr("tabIndex", 0).focus();
            }
        } else {
            if (event.keyCode === 27) {
                $expander.focus();
            }
            $expander.trigger("click");
        }
    }

    function fauxSelectHandler(e) {
        if ($(e.target).parents(".faux-select").length <= 0 && e.originalEvent) {
            $(".faux-select.opened").children("a").trigger("click");
            $("body").off("click", fauxSelectHandler);
        }
    }
});

/* ******************************************************
    - Expandable
   ****************************************************** */
(function ($) {
    $(function () {
        $('[data-sf-role=toggleLink]').on('click', function () {
            var link = $(this);

            expandElement(link);

            var wrapper = link.closest('[data-sf-role=lists]');

            var linkCount = wrapper.find('[data-sf-role=toggleLink]').length;
            var expandedLinkCount = wrapper.find('[data-sf-role=toggleLink].expanded').length;

            if (linkCount === expandedLinkCount) {
                hideExpandAllLink(wrapper);
            } else {
                hideCollapseAllLink(wrapper);
            }
        });

        $('[data-sf-role=expandAll]').on('click', function () {
            var wrapper = $(this).closest('[data-sf-role=lists]');
            wrapper.find('[data-sf-role=expandAll]').css('display', 'none');
            wrapper.find('[data-sf-role=collapseAll]').css('display', 'block');
            var links = wrapper.find('[data-sf-role=toggleLink]');
            links.addClass('expanded');
            links.next('div').css('display', 'block');
        });

        $('[data-sf-role=collapseAll]').on('click', function () {
            var wrapper = $(this).closest('[data-sf-role=lists]');
            wrapper.find('[data-sf-role=expandAll]').css('display', 'block');
            wrapper.find('[data-sf-role=collapseAll]').css('display', 'none');
            var links = wrapper.find('[data-sf-role=toggleLink]');
            links.removeClass('expanded');
            links.next('div').css('display', 'none');
        });

        function expandElement(link) {
            if (link.hasClass('expanded')) link.removeClass('expanded');else link.addClass('expanded');

            var content = link.next();
            if (content.css('display') === 'none') content.css('display', 'block');else content.css('display', 'none');
        }

        function hideExpandAllLink(wrapper) {
            wrapper.find('[data-sf-role=expandAll]').css('display', 'none');
            wrapper.find('[data-sf-role=collapseAll]').css('display', 'block');
        }

        function hideCollapseAllLink(wrapper) {
            wrapper.find('[data-sf-role=expandAll]').css('display', 'block');
            wrapper.find('[data-sf-role=collapseAll]').css('display', 'none');
        }
    });
})(jQuery);

/*! ________________
*   ___  ____/_  __ \
*   __  /_   _  / / /
*   _  __/   / /_/ /
*   /_/      \____/
*   Focus Overlay
*
*  Version: 0.9.3
*  Author: Maurice Mahan
*  License: MIT
*  Repo: https://github.com/MauriceMahan/FocusOverlay
*/
!function (e) {
    "function" == typeof define && define.amd ? define(["jquery"], function (t) {
        return e(t, window);
    }) : "object" == (typeof module === 'undefined' ? 'undefined' : _typeof(module)) && module.exports ? module.exports = function (t, o) {
        return void 0 === o && (o = "undefined" != typeof window ? require("jquery") : require("jquery")(t)), e(o, window), o;
    } : e(jQuery, window);
}(function (e, t) {
    function o(t, o) {
        var n = this;n.active = !1, n.$el = e(t), n.$focusBox = e("<div aria-hidden='true' />"), n.$previousTarget, n.$nextTarget, n.timeout = 0, n.inScope = !1, n.transitionEvent = n._whichTransitionEvent(), n.options = e.extend({}, e.fn.focusOverlay.defaults, o), n.onFocusHandler = e.proxy(n.onFocusHandler, n), n.createFocusBox = e.proxy(n.createFocusBox, n), n.onKeyDownHandler = e.proxy(n.onKeyDownHandler, n), n._repositionBox = e.proxy(n._repositionBox, n), n.moveFocusBox = e.proxy(n.moveFocusBox, n), n.cleanup = e.proxy(n.cleanup, n), n.stop = e.proxy(n.stop, n), n.destroy = e.proxy(n.destroy, n), n.init();
    }o.prototype = { init: function init() {
            var e = this;e.options.alwaysActive ? (e.active = !0, t.addEventListener("focus", e.onFocusHandler, !0)) : (t.addEventListener("keydown", e.onKeyDownHandler, !1), e.options.inactiveOnClick && t.addEventListener("mousedown", e.stop, !1)), e.createFocusBox(), e.$el.trigger("foInit", [e]);
        }, onKeyDownHandler: function onKeyDownHandler(o) {
            var n = this,
                i = o.which;e.inArray(i, n.options.triggerKeys) >= 0 ? !1 === n.active && (n.active = !0, t.addEventListener("focus", n.onFocusHandler, !0)) : n.options.inactiveOnNonTriggerKey && n.stop();
        }, createFocusBox: function createFocusBox() {
            var e = this;e.$focusBox.appendTo(e.$el).attr("id", e.options.id).css({ position: "absolute", zIndex: e.options.zIndex, pointerEvents: "none" });
        }, cleanup: function cleanup() {
            var e = this;null != e.$nextTarget && (e.$previousTarget = e.$nextTarget, e.$previousTarget.removeClass(e.options.targetClass), e.transitionEvent && e.options.watchTransitionEnd && e.$previousTarget[0].removeEventListener(e.transitionEvent, e._repositionBox));
        }, onFocusHandler: function onFocusHandler(t) {
            var o = this,
                n = e(t.target);if (o.cleanup(), n.closest(o.$el).length > 0) {
                var i = o.$nextTarget,
                    r = o.$previousTarget;if (o.inScope = !0, n.data("focus")) o.$nextTarget = e(n.data("focus")).first();else if (n.is("[data-focus-label]")) {
                    var s = e("[for='" + n.attr("id") + "']");s.length < 1 && (s = n.closest("label")), o.$nextTarget = s;
                } else {
                    if (n.is("[data-focus-ignore]")) return;o.$nextTarget = n;
                }clearTimeout(o.timeout), o.transitionEvent && o.options.watchTransitionEnd && o.$nextTarget[0].addEventListener(o.transitionEvent, o._repositionBox), o.$el.trigger("foBeforeMove", [o, r, i, o.$nextTarget]), o.moveFocusBox(o.$nextTarget);
            } else o.options.alwaysActive ? o.inScope = !1 : (o.inScope = !1, o.stop());
        }, stop: function stop() {
            var e = this;e.active = !1, t.removeEventListener("focus", e.onFocusHandler, !0), e.cleanup(), e.$focusBox.removeClass(e.options.activeClass);
        }, moveFocusBox: function moveFocusBox(e) {
            var t = this;if (e.addClass(t.options.targetClass), e.length > 0 && e[0] instanceof Element) {
                var o = t._getAbsoluteBoundingRect(e[0]),
                    n = o.width,
                    i = o.height,
                    r = o.left,
                    s = o.top;t.$focusBox.addClass(t.options.animatingClass).addClass(t.options.activeClass).css({ width: n, height: i, left: r, top: s }), t.timeout = setTimeout(function () {
                    t.$focusBox.removeClass(t.options.animatingClass), t.options.inactiveAfterDuration && t.$focusBox.removeClass(t.options.activeClass), t.$el.trigger("foAfterMove", [t, t.$previousTarget, e]);
                }, t.options.duration);
            } else t.cleanup();
        }, _repositionBox: function _repositionBox(t) {
            var o = this,
                n = e(t.target);o.moveFocusBox(n);
        }, destroy: function destroy() {
            var e = this;e.$el.removeData(), e.$focusBox.remove(), null != e.$previousTarget && e.$previousTarget.removeClass(e.options.targetClass), null != e.$nextTarget && e.$nextTarget.removeClass(e.options.targetClass), t.removeEventListener("focus", e.onFocusHandler, !0), t.removeEventListener("keydown", e.onKeyDownHandler, !1), t.removeEventListener("mousedown", e.stop, !1), e.$el.trigger("foDestroyed", [e]);
        }, _getAbsoluteBoundingRect: function _getAbsoluteBoundingRect(e) {
            var o = document,
                n = t,
                i = o.body,
                r = void 0 !== n.pageXOffset ? n.pageXOffset : (o.documentElement || i.parentNode || i).scrollLeft,
                s = void 0 !== n.pageYOffset ? n.pageYOffset : (o.documentElement || i.parentNode || i).scrollTop,
                a = e.getBoundingClientRect();if (e !== i) for (var c = e.parentNode; c !== i && c;) {
                r += c.scrollLeft, s += c.scrollTop, c = c.parentNode;
            }return { bottom: a.bottom + s, height: a.height, left: a.left + r, right: a.right + r, top: a.top + s, width: a.width };
        }, _whichTransitionEvent: function _whichTransitionEvent() {
            var e,
                t = document.createElement("fakeelement"),
                o = { transition: "transitionend", OTransition: "oTransitionEnd", MozTransition: "transitionend", WebkitTransition: "webkitTransitionEnd" };for (e in o) {
                if (void 0 !== t.style[e]) return o[e];
            }
        } }, e.fn.focusOverlay = function (t) {
        var n = arguments;if (void 0 === t || "object" == (typeof t === 'undefined' ? 'undefined' : _typeof(t))) return this.each(function () {
            e.data(this, "plugin_" + o) || e.data(this, "plugin_" + o, new o(this, t));
        });if ("string" == typeof t && "_" !== t[0] && "init" !== t) {
            if (0 == Array.prototype.slice.call(n, 1).length && -1 != e.inArray(t, e.fn.focusOverlay.getters)) {
                var i = e.data(this[0], "plugin_" + o);return i[t].apply(i, Array.prototype.slice.call(n, 1));
            }return this.each(function () {
                var i = e.data(this, "plugin_" + o);i instanceof o && "function" == typeof i[t] && i[t].apply(i, Array.prototype.slice.call(n, 1));
            });
        }
    }, e.fn.focusOverlay.getters = ["destroy"], e.fn.focusOverlay.defaults = { id: "focus-overlay", activeClass: "focus-overlay-active", animatingClass: "focus-overlay-animating", targetClass: "focus-overlay-target", zIndex: 9001, duration: 500, inactiveAfterDuration: !1, triggerKeys: [9, 36, 37, 38, 39, 40, 13, 32, 16, 17, 18, 27], inactiveOnNonTriggerKey: !0, inactiveOnClick: !0, alwaysActive: !1, watchTransitionEnd: !0 };
});

/*!
  hey, [be]Lazy.js - v1.8.2 - 2016.10.25
  A fast, small and dependency free lazy load script (https://github.com/dinbror/blazy)
  (c) Bjoern Klinggaard - @bklinggaard - http://dinbror.dk/blazy
  * Edited to where q=window since it was undefined initially
*/
(function (q, m) {
    q = window;"function" === typeof define && define.amd ? define(m) : "object" === (typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) ? module.exports = m() : q.Blazy = m();
})(undefined, function () {
    function q(b) {
        var c = b._util;c.elements = E(b.options);c.count = c.elements.length;c.destroyed && (c.destroyed = !1, b.options.container && l(b.options.container, function (a) {
            n(a, "scroll", c.validateT);
        }), n(window, "resize", c.saveViewportOffsetT), n(window, "resize", c.validateT), n(window, "scroll", c.validateT));m(b);
    }function m(b) {
        for (var c = b._util, a = 0; a < c.count; a++) {
            var d = c.elements[a],
                e;a: {
                var g = d;e = b.options;var p = g.getBoundingClientRect();if (e.container && y && (g = g.closest(e.containerClass))) {
                    g = g.getBoundingClientRect();e = r(g, f) ? r(p, { top: g.top - e.offset, right: g.right + e.offset, bottom: g.bottom + e.offset, left: g.left - e.offset }) : !1;break a;
                }e = r(p, f);
            }if (e || t(d, b.options.successClass)) b.load(d), c.elements.splice(a, 1), c.count--, a--;
        }0 === c.count && b.destroy();
    }function r(b, c) {
        return b.right >= c.left && b.bottom >= c.top && b.left <= c.right && b.top <= c.bottom;
    }function z(b, c, a) {
        if (!t(b, a.successClass) && (c || a.loadInvisible || 0 < b.offsetWidth && 0 < b.offsetHeight)) if (c = b.getAttribute(u) || b.getAttribute(a.src)) {
            c = c.split(a.separator);var d = c[A && 1 < c.length ? 1 : 0],
                e = b.getAttribute(a.srcset),
                g = "img" === b.nodeName.toLowerCase(),
                p = (c = b.parentNode) && "picture" === c.nodeName.toLowerCase();if (g || void 0 === b.src) {
                var h = new Image(),
                    w = function w() {
                    a.error && a.error(b, "invalid");v(b, a.errorClass);k(h, "error", w);k(h, "load", f);
                },
                    f = function f() {
                    g ? p || B(b, d, e) : b.style.backgroundImage = 'url("' + d + '")';x(b, a);k(h, "load", f);k(h, "error", w);
                };p && (h = b, l(c.getElementsByTagName("source"), function (b) {
                    var c = a.srcset,
                        e = b.getAttribute(c);e && (b.setAttribute("srcset", e), b.removeAttribute(c));
                }));n(h, "error", w);n(h, "load", f);B(h, d, e);
            } else b.src = d, x(b, a);
        } else "video" === b.nodeName.toLowerCase() ? (l(b.getElementsByTagName("source"), function (b) {
            var c = a.src,
                e = b.getAttribute(c);e && (b.setAttribute("src", e), b.removeAttribute(c));
        }), b.load(), x(b, a)) : (a.error && a.error(b, "missing"), v(b, a.errorClass));
    }function x(b, c) {
        v(b, c.successClass);c.success && c.success(b);b.removeAttribute(c.src);b.removeAttribute(c.srcset);l(c.breakpoints, function (a) {
            b.removeAttribute(a.src);
        });
    }function B(b, c, a) {
        a && b.setAttribute("srcset", a);b.src = c;
    }function t(b, c) {
        return -1 !== (" " + b.className + " ").indexOf(" " + c + " ");
    }function v(b, c) {
        t(b, c) || (b.className += " " + c);
    }function E(b) {
        var c = [];b = b.root.querySelectorAll(b.selector);for (var a = b.length; a--; c.unshift(b[a])) {}return c;
    }function C(b) {
        f.bottom = (window.innerHeight || document.documentElement.clientHeight) + b;f.right = (window.innerWidth || document.documentElement.clientWidth) + b;
    }function n(b, c, a) {
        b.attachEvent ? b.attachEvent && b.attachEvent("on" + c, a) : b.addEventListener(c, a, { capture: !1, passive: !0 });
    }function k(b, c, a) {
        b.detachEvent ? b.detachEvent && b.detachEvent("on" + c, a) : b.removeEventListener(c, a, { capture: !1, passive: !0 });
    }function l(b, c) {
        if (b && c) for (var a = b.length, d = 0; d < a && !1 !== c(b[d], d); d++) {}
    }function D(b, c, a) {
        var d = 0;return function () {
            var e = +new Date();e - d < c || (d = e, b.apply(a, arguments));
        };
    }var u, f, A, y;return function (b) {
        if (!document.querySelectorAll) {
            var c = document.createStyleSheet();document.querySelectorAll = function (a, b, d, h, f) {
                f = document.all;b = [];a = a.replace(/\[for\b/gi, "[htmlFor").split(",");for (d = a.length; d--;) {
                    c.addRule(a[d], "k:v");for (h = f.length; h--;) {
                        f[h].currentStyle.k && b.push(f[h]);
                    }c.removeRule(0);
                }return b;
            };
        }var a = this,
            d = a._util = {};d.elements = [];d.destroyed = !0;a.options = b || {};a.options.error = a.options.error || !1;a.options.offset = a.options.offset || 100;a.options.root = a.options.root || document;a.options.success = a.options.success || !1;a.options.selector = a.options.selector || ".b-lazy";a.options.separator = a.options.separator || "|";a.options.containerClass = a.options.container;a.options.container = a.options.containerClass ? document.querySelectorAll(a.options.containerClass) : !1;a.options.errorClass = a.options.errorClass || "b-error";a.options.breakpoints = a.options.breakpoints || !1;a.options.loadInvisible = a.options.loadInvisible || !1;a.options.successClass = a.options.successClass || "b-loaded";a.options.validateDelay = a.options.validateDelay || 25;a.options.saveViewportOffsetDelay = a.options.saveViewportOffsetDelay || 50;a.options.srcset = a.options.srcset || "data-srcset";a.options.src = u = a.options.src || "data-src";y = Element.prototype.closest;A = 1 < window.devicePixelRatio;f = {};f.top = 0 - a.options.offset;f.left = 0 - a.options.offset;a.revalidate = function () {
            q(a);
        };a.load = function (a, b) {
            var c = this.options;void 0 === a.length ? z(a, b, c) : l(a, function (a) {
                z(a, b, c);
            });
        };a.destroy = function () {
            var a = this._util;this.options.container && l(this.options.container, function (b) {
                k(b, "scroll", a.validateT);
            });k(window, "scroll", a.validateT);k(window, "resize", a.validateT);k(window, "resize", a.saveViewportOffsetT);a.count = 0;a.elements.length = 0;a.destroyed = !0;
        };d.validateT = D(function () {
            m(a);
        }, a.options.validateDelay, a);d.saveViewportOffsetT = D(function () {
            C(a.options.offset);
        }, a.options.saveViewportOffsetDelay, a);C(a.options.offset);l(a.options.breakpoints, function (a) {
            if (a.width >= window.screen.width) return u = a.src, !1;
        });setTimeout(function () {
            q(a);
        });
    };
});

/**
* svg4everybody v2.1.9
* https://github.com/jonathantneal/svg4everybody
* Edited to where a=window since it was undefined initially
*/
!function (a, b) {
    a = window;"function" == typeof define && define.amd ? define([], function () {
        return a.svg4everybody = b();
    }) : "object" == (typeof module === 'undefined' ? 'undefined' : _typeof(module)) && module.exports ? module.exports = b() : a.svg4everybody = b();
}(undefined, function () {
    function a(a, b, c) {
        if (c) {
            var d = document.createDocumentFragment(),
                e = !b.hasAttribute("viewBox") && c.getAttribute("viewBox");e && b.setAttribute("viewBox", e);for (var f = c.cloneNode(!0); f.childNodes.length;) {
                d.appendChild(f.firstChild);
            }a.appendChild(d);
        }
    }function b(b) {
        b.onreadystatechange = function () {
            if (4 === b.readyState) {
                var c = b._cachedDocument;c || (c = b._cachedDocument = document.implementation.createHTMLDocument(""), c.body.innerHTML = b.responseText, b._cachedTarget = {}), b._embeds.splice(0).map(function (d) {
                    var e = b._cachedTarget[d.id];e || (e = b._cachedTarget[d.id] = c.getElementById(d.id)), a(d.parent, d.svg, e);
                });
            }
        }, b.onreadystatechange();
    }function c(c) {
        function e() {
            for (var c = 0; c < o.length;) {
                var h = o[c],
                    i = h.parentNode,
                    j = d(i),
                    k = h.getAttribute("xlink:href") || h.getAttribute("href");if (!k && g.attributeName && (k = h.getAttribute(g.attributeName)), j && k) {
                    if (f) if (!g.validate || g.validate(k, j, h)) {
                        i.removeChild(h);var l = k.split("#"),
                            q = l.shift(),
                            r = l.join("#");if (q.length) {
                            var s = m[q];s || (s = m[q] = new XMLHttpRequest(), s.open("GET", q), s.send(), s._embeds = []), s._embeds.push({ parent: i, svg: j, id: r }), b(s);
                        } else a(i, j, document.getElementById(r));
                    } else ++c, ++p;
                } else ++c;
            }(!o.length || o.length - p > 0) && n(e, 67);
        }var f,
            g = Object(c),
            h = /\bTrident\/[567]\b|\bMSIE (?:9|10)\.0\b/,
            i = /\bAppleWebKit\/(\d+)\b/,
            j = /\bEdge\/12\.(\d+)\b/,
            k = /\bEdge\/.(\d+)\b/,
            l = window.top !== window.self;f = "polyfill" in g ? g.polyfill : h.test(navigator.userAgent) || (navigator.userAgent.match(j) || [])[1] < 10547 || (navigator.userAgent.match(i) || [])[1] < 537 || k.test(navigator.userAgent) && l;var m = {},
            n = window.requestAnimationFrame || setTimeout,
            o = document.getElementsByTagName("use"),
            p = 0;f && e();
    }function d(a) {
        for (var b = a; "svg" !== b.nodeName.toLowerCase() && (b = b.parentNode);) {}return b;
    }return c;
});
/* ================================================================
        POLYFILLS
    ================================================================ */

/** iOS FIX to incorrect focus bug with keyboard not showing up and then the last touchup element gets clicked. **/
if (/iPad|iPhone|iPod/g.test(navigator.userAgent)) {
    (function ($) {
        return $.fn.focus = function () {
            return arguments[0];
        };
    })(jQuery);
}

/* ================================================================
 UTILITY FUNCTIONS AND GLOBAL VARS
================================================================ */

(function ($, talonUtil, undefined) {
    "use strict";

    // Fast for most debouncers, etc. but for transitions try and match typicall css transition length

    talonUtil.speeds = {
        fast: 200,
        transition: 300,
        long: 500
    };

    // Generate Random ID
    talonUtil.generateID = function () {
        var globalIdCounter = 0;
        return function (baseStr) {
            baseStr = baseStr ? baseStr : "generatedID-";
            return baseStr + globalIdCounter++;
        };
    }();

    // Initialize vendor plugins that requires little to no configuration
    talonUtil.vendorPlugins = function () {
        /** Cross browser SVG loading support **/
        svg4everybody();

        /** FocusOverlay **/
        $("body").focusOverlay();

        /** Lazy loading */
        var bLazy = new Blazy({
            loadInvisible: true,
            offset: 200,
            success: function success(el) {
                // For images that are wrapped in aspect ratio containers
                if ($(el).parent().hasClass('lazy-aspect-ratio')) {
                    $(el).parent().addClass('lazy-aspect-ratio-done');
                }

                // Adding another class for a non-instant CSS transitions
                setTimeout(function () {
                    el.classList.add('b-done');
                }, talonUtil.speeds.long);
            },
            error: function error(el, msg) {
                console.log(msg, el);
            }
        });
    };

    /**
     * Setup expanding functionality for [data-expander] elements (e.g. accordions,
     * tabs, expanders, menus, etc.)
     */
    talonUtil.setupToggles = function () {
        $("[data-expander]:not([data-expander-loaded])").each(function (key) {
            var $this = $(this),
                $toggle,
                // Toggle element
            $target,
                // Target element
            $relatedToggles,
                // All toggles with same target ID
            toggleID,
                // ID of toggle
            animateTime,
                // Animation duration (ms)
            useCss,
                // If CSS animations will be used instead of JS
            isOverlay,
                // If toggle should be used for site overlay
            isHold,
                // If toggle should remain active on outside clicks
            isNoFocus,
                // If should not focus inside after opening
            isActive,
                // If $toggle is active
            standAlone,
                // If no unique ID is specified
            existingTabindex,
                // If the target element already has a tabindex
            $html = $("html");

            /**
             * Setting toggle/target depending on if an ID is specified or not.
             * If no ID is supplied then it is treated as an expander container.
             */
            if ($this.data("expander").length > 0) {
                $toggle = $this;
                $relatedToggles = $("[data-expander='" + $this.data("expander") + "']").not(this);
                $target = $("#" + $this.data("expander"));
            } else {
                $toggle = $this.find("[data-expander-toggle]");
                $target = $this.find("[data-expander-target]");

                standAlone = true;
            }

            // Setting up expander configurations for later
            toggleID = $this.attr("id");
            animateTime = $this.data("expander-time") || 300;
            useCss = $this.is("[data-expander-css]");
            isOverlay = $this.is("[data-expander-overlay]");
            isHold = $this.is("[data-expander-hold]");
            isNoFocus = $this.is("[data-expander-nofocus]");
            isActive = $this.hasClass("active");

            // By default `jsAnimation` will be used unless data-expander-css is added
            var jsAnimation = {
                hide: function hide($el) {
                    $el = $el || $target;

                    // Remove `active` state after slide animation
                    $el.slideUp(animateTime, function () {
                        $el.removeClass("active");

                        // Update a11y to describe as closed
                        $toggle.add($relatedToggles).attr("aria-expanded", "false");
                    });
                },
                show: function show($el) {
                    $el = $el || $target;

                    // Add `active` state after slide animation
                    $el.slideDown(animateTime, function () {
                        $el.addClass("active");
                    });
                }

                /**
                 * Only used if data-expander-css is added to the toggle. Should be
                 * used with appropriate show/hide CSS animations if you go this route
                 */
            };var cssAnimation = {
                hide: function hide($el) {
                    $el = $el || $target;

                    /**
                     * Classes to use CSS animation for show/hiding.
                     * This will also allow us to set display to block/none
                     */
                    $el.removeClass("target-show");
                    $el.addClass("target-hide");

                    setTimeout(function () {
                        // At the end of the animation timer remove classes
                        $el.removeClass("active");
                        $el.removeClass("target-hide");

                        // Update a11y to describe as closed
                        $toggle.add($relatedToggles).attr("aria-expanded", "false");
                    }, animateTime);
                },
                show: function show($el) {
                    $el = $el || $target;

                    // Should set to display block
                    $el.addClass("active");

                    // CSS animation for show/hiding.
                    $el.addClass("target-show");
                }

                // Functionality for showing/hiding
            };function toggleTarget() {
                // Clear out handler for easy exit of toggle if it exists
                $html.off("click touchstart keyup", dataToggleHandler);
                $html.off("click touchstart keyup", checkOutsideClick);

                if ($target.hasClass("active")) {
                    // If the current clicked element is a tab do nothing
                    if (!$toggle.is("[data-expander-tabs]")) {
                        $toggle.add($relatedToggles).removeClass("active");

                        // Removing class on wrapper element if it exists
                        if (standAlone === true) $this.removeClass("active");

                        // Removing class on html element for site overlay effects
                        if (isOverlay) {
                            $html.removeClass("js-data-toggled");
                            $("html").removeClass("js-data-toggled-" + $target.attr("id"));
                        }

                        // Show/hide animation depending on if you want to use CSS animations or not
                        useCss ? cssAnimation.hide() : jsAnimation.hide();
                    }
                } else {
                    $toggle.add($relatedToggles).addClass("active");

                    // Adding class on wrapper element if it exists
                    if (standAlone === true) $this.addClass("active");

                    // Adding class on html element for site overlay effects
                    if (isOverlay) {
                        $html.addClass("js-data-toggled");
                        $("html").addClass("js-data-toggled-" + $target.attr("id"));
                    }

                    // Hide other expanders if 'tabs' is enabled
                    if ($toggle.is("[data-expander-tabs]")) {
                        var $otherTabs = $("[data-expander-tabs]").not($toggle);

                        $otherTabs.each(function () {
                            var $this = $(this),
                                $newTarget;

                            if ($this.data("expander").length > 0) {
                                $newTarget = $("#" + $this.data("expander")).not($target);
                            } else {
                                $newTarget = $this.find("[data-expander-target]").not($target);
                            }

                            $this.not($relatedToggles).removeClass("active");

                            useCss ? cssAnimation.hide($newTarget) : jsAnimation.hide($newTarget);
                        });
                    }

                    // Show/hide animation depending on if you want to use CSS animations or not
                    useCss ? cssAnimation.show() : jsAnimation.show();

                    // Update a11y to describe as opened
                    $toggle.attr("aria-expanded", "true");

                    /**
                     * Setup `later` timeout functionality to make sure
                     * we can clearout if other data toggles are pressed.
                     * Then we focus an item inside (input, select, etc)
                     * otherwise focusable the whole target
                     */
                    var later = function later() {
                        var $focusable = $target.find("input, select, textarea, a").first();

                        if (isNoFocus !== true) {
                            if ($focusable.length > 0) {
                                $focusable.focus();
                            } else {
                                $target.focus();
                            }
                        }
                    };

                    // Timeout preferably same as or longer than the animation's duration
                    window.dataExpTimeOut = setTimeout(later, animateTime);

                    /**
                     * If isHold is true then when a user clicks outside of the $target
                     * nothing will happen. If false then add event listener to check for
                     * clicks outside the $target.
                     */
                    if (!isHold) $html.on("click touchstart keyup", dataToggleHandler);
                }
            }

            /**
             * Namespaced function for use in $html event checks
             * @param {Object} event Click/keyboard event object
             */
            function dataToggleHandler(e) {
                if (e.which === 27) {
                    // If ESC is pressed or a click happens then trigger the target
                    $toggle.focus();
                    triggerTarget();
                } else {
                    // Otherwise check if touch/click is outside of bounds of $target
                    checkOutsideClick(e);
                }
            }

            /**
             * Checks if the click/keyboard event happened outside of the bounds of $target
             * @param {Object} event Click/keyboard event object
             */
            function checkOutsideClick(e) {
                var $eTarget = $(e.target);

                if ($eTarget.closest($target).length <= 0 && $eTarget.closest("#" + toggleID).length <= 0) {
                    triggerTarget();
                }
            }

            /**
             * Trigger function to toggle the target while also refreshing the timeout
             */
            function triggerTarget() {
                // Show/hide $target
                toggleTarget();

                // Clear timeout to help prevent focus / other data toggle press conflicts
                window.dataExpTimeOut = null;
            }

            // If target element exist run the data-expander functionality
            if ($target.length > 0) {
                // Set global timeout to null so it doesn't conflict with other targets
                window.dataExpTimeOut = null;

                // Make sure there is an ID set for the toggle for a11y purposes
                if (!toggleID) {
                    $toggle.first().attr("id", "data-expander-" + key);
                    toggleID = $toggle.attr("id");
                }

                // Finish up a11y setup for related element
                $target.attr({ "aria-labelledby": toggleID });

                // Setup proper roles for a11y and then bind interaction functionality
                $toggle.attr({
                    "role": "button",
                    "aria-haspopup": "true",
                    "aria-expanded": "false"
                }).on("click keypress", function (e) {
                    if (talonUtil.a11yClick(e) === true) {
                        e.preventDefault();
                        toggleTarget();
                    }
                });

                if (!isHold && isActive) $html.on("click touchstart keyup", checkOutsideClick);

                // Add attr to target for CSS to hook onto
                $target.attr("data-expander-target", "");

                /**
                 * Make sure the target can be focused if no items inside
                 * are not auto-focused when opened. Also makes sure the toggle element
                 * is visible so extra tabindexes on all screen sizes are avoided.
                 * Debounced because this will be ran on page load and resize
                 */
                var addRequiredTabIndex = talonUtil.debounce(function () {
                    /**
                     * If a tabindex already exists exit. Related $relatedToggles
                     * targeting the same element will also not interfere.
                     */
                    if (existingTabindex) return;

                    // Look to see if any of the toggles are visible
                    if ($toggle.add($relatedToggles).is(":visible")) {
                        $target.attr("tabindex", "0");
                    } else {
                        $target.removeAttr("tabindex");
                    }
                }, 250);

                $(window).on("load resize", addRequiredTabIndex);

                // After everything is done add this so other JS can interact
                $this.attr("data-expander-loaded", "");
            }
        });
    };

    //Debouncer to be used for scrolling and resize bindings
    talonUtil.debounce = function (func, wait, immediate) {
        var timeout;
        return function () {
            var context = this,
                args = arguments;
            var later = function later() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    //Get correct viewport size helper - don't use $(window).width();
    talonUtil.getViewportW = window.getViewportW || function () {
        var win = typeof window != 'undefined' && window,
            doc = typeof document != 'undefined' && document,
            docElem = doc && doc.documentElement;

        var a = docElem.clientWidth,
            b = win.innerWidth;
        return a < b ? b : a;
    };

    //For faux buttons, etc. to handle keyboard events such as space and enter on top of click/touch
    talonUtil.a11yClick = function (event) {
        if (event.type === 'click' || event.type === 'touchstart') {
            return true;
        } else if (event.type === 'keypress') {
            var code = event.charCode || event.keyCode;

            if (code === 32) {
                event.preventDefault();
            }

            if (code === 32 || code === 13) {
                return true;
            }
        } else {
            return false;
        }
    };

    // Remove pointer events when scrolling via overlay div to assist with FPS
    talonUtil.setupScrollPointerBlocker = function () {
        var body = document.body,
            cover = document.createElement('div'),
            timer;

        cover.setAttribute('class', 'scroll-cover');

        window.addEventListener('scroll', function () {
            clearTimeout(timer);
            body.appendChild(cover);

            timer = setTimeout(function () {
                body.removeChild(cover);
            }, talonUtil.speeds.fast);
        }, false);
    };

    /** Click vs. Keyboard user **/
    talonUtil.setupUserBinds = function () {
        var $body = $("body"),
            $html = $("html");

        if (!$html.hasClass("js-user-bind-init")) {
            $html.addClass("js-user-bind-init");
            $body.on("keyup", function () {
                if (!$html.hasClass("js-keyboard-user")) {
                    $html.removeClass("js-click-user").addClass("js-keyboard-user");
                }
            });

            $body.on("click", function () {
                if (!$html.hasClass("js-click-user")) {
                    $html.removeClass("js-keyboard-user").addClass("js-click-user");
                }
            });
        }
    };

    // Default Kentico form ADA and styling adjustments
    talonUtil.setupKenticoForms = function () {
        $('.FormPanel').each(function () {
            var $form = $(this);
            var $rows = $form.find('.FieldLabel').closest('tr');

            // Add specific styling classes for controls that need extra styling options
            // All fields will have a label except the submit field
            $rows.each(function () {
                var $row = $(this);

                // Single checkbox
                if ($row.find('.CheckBoxField').length > 0) {
                    var $labels = $row.find('label');

                    $row.addClass('single-checkbox-field');

                    /**
                     * ADA: By default Kentico adds 2 labels for the same control
                     * so we're removing the extra one. (Starting from last in DOM)
                     */
                    if ($labels.length > 1) {
                        $($labels.get().reverse()).each(function () {
                            var forAttr = $(this).attr('for');

                            if ($labels.not($(this)).is('[for=\'' + forAttr + '\']')) {
                                $(this).remove();
                                $labels = $labels.not($(this));
                            }
                        });
                    }
                }

                // Multi checkbox
                if ($row.find('[class*="checkbox-list"]').length > 0) {
                    var labelText = $row.find('.EditingFormLabel').text().replace(':', '');

                    $row.addClass('multi-checkbox-field');
                    $row.attr('role', 'group');
                    $row.attr('aria-label', labelText);
                }

                // Radio button group
                if ($row.find('[class*="radio-list"]').length > 0) {
                    var _labelText = $row.find('.EditingFormLabel').text().replace(':', '');

                    $row.addClass('radio-list-field');
                    $row.attr('role', 'radiogroup');
                    $row.attr('aria-label', _labelText);
                }

                // Date picker and ADA fixes
                if ($row.find('.CalendarTextBox').length > 0) {
                    var $input = $row.find('input');
                    var $calendarBtn = $row.find('button[title="Calendar"]');
                    var $popup = void 0;

                    $row.addClass('date-picker-field');

                    /**
                     * When clicking on the calendar button the focus will automatically
                     * be placed on the newly opened calendar popup. Settimeout added because
                     * of the slight delay of the popup being interactive.
                     */
                    $calendarBtn.on('click keypress', function (e) {
                        $popup = $('#ui-datepicker-div');

                        if (talonUtil.a11yClick(e) === true) {
                            setTimeout(function () {
                                $popup.attr('tabindex', '0');
                                $popup.focus();
                                $popup.on('click focusout', handlePopup);
                            }, 250);
                        }
                    });

                    /**
                     * When clicking on a date number it will automatically be assigned,
                     * close the popup, and re-focus the initial input. Clicking or tabbing
                     * outside the popup will also re-focus the intial input.
                     */
                    var handlePopup = function handlePopup(e) {
                        var $target = $(e.target);
                        var $relatedTarget = $(e.relatedTarget);
                        var $calendarSubmit = $popup.find('.action-buttons .btn-primary');

                        // Automatically submit calendar date when clicking an item
                        if (talonUtil.a11yClick(e) === true && $target.is('.datetime-ui-state-default')) {
                            $calendarSubmit.trigger('click');
                        }

                        // If the focus is outside of the popup close it and focus it's related input
                        if ($relatedTarget.closest($popup).length <= 0) {
                            $input.focus();
                            $popup.hide();
                            $popup.off('click', handlePopup);
                        }
                    };
                }

                // Security code
                if ($row.find('.CaptchaTable').length > 0) $row.addClass('captcha-field');

                // Phone (Nothing to really target so a pseudo check)
                if ($row.find('[class*="input-width-"]').length === 3) $row.addClass('phone-field');

                // Select dropdowns and multiples
                if ($row.find('select').length > 0) {
                    var $allSelects = $row.find('select');

                    // Wrap selects in a DIV for additional styling
                    $allSelects.each(function () {
                        var $select = $(this);
                        var multi = $select.attr("multiple") || false;

                        $select.wrap('<div class="select ' + (multi ? 'select-multi' : '') + '"></div>');
                    });

                    $row.addClass('dropdown-field');
                }
            });
        });
    };
})(jQuery, window.talonUtil = window.talonUtil || {});

(function ($, talonUtil) {
    /** Click Navigation **/
    $(".main-nav").clickMenu();

    $('.hero-slider-section').each(function () {
        var slider = this.querySelector('.hero-slider');
        var prev = this.querySelector('.hero-slider-btn-prev');
        var next = this.querySelector('.hero-slider-btn-next');

        var hero = tns({
            container: slider,
            prevButton: prev,
            nextButton: next,
            autoplay: true
        });
    });

    $(".photo-overlay").colorbox({ rel: 'group1' });

    /** List Tool on load */
    $('.list-tool.expand-list, .list-tool.accordion-list').each(function () {
        var $this = $(this);

        $this.find('.item:first-child > a').addClass('active');
        $this.find('.item .item-content').hide();
        $this.find('.item:first-child .item-content').show();
    });

    $('.talon-tabs').each(function () {
        var $this = $(this);

        $this.find('.talon-tab:first-child > a').addClass('active');
        $this.find('.talon-tab-pane').hide();
        $this.find('.talon-tab-pane:first-child').show();
    });

    /** Stop referrer Phishing hack + ADA */
    $("a[target=_blank], a[target=new]").each(function () {
        $(this).attr("rel", "noopener noreferrer").append("<span class='visually-hidden'>(Opens in a new window)</span>");
    });

    talonUtil.vendorPlugins();
    talonUtil.setupToggles();
    talonUtil.setupScrollPointerBlocker();
    talonUtil.setupUserBinds();
    talonUtil.setupKenticoForms();
})(jQuery, window.talonUtil);