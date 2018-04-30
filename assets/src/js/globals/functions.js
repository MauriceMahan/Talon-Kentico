/* ================================================================
    UTILITY FUNCTIONS AND GLOBAL VARS
   ================================================================ */

   (function ($, talonUtil, undefined) {
    "use strict";


    // Fast for most debouncers, etc. but for transitions try and match typicall css transition length
    talonUtil.speeds = {
        fast: 200,
        transition: 300
    };

    // Generate Random ID
    talonUtil.generateID = function () {
        var globalIdCounter = 0;
        return function (baseStr) {
            baseStr = baseStr ? baseStr : "generatedID-";
            return baseStr + globalIdCounter++;
        };
    }();

    //Setup expanding functionality for [data-toggle] elements (e.g. accordions, tabs, expanders)
    talonUtil.setupToggles = function () {
        $("[data-toggle]:not([data-init])").each(function (key, val) {
            var $toggle = $(this),
                relatedData = $toggle.data("target"),
                toggleID = $toggle.attr("id"),
                parentID = $toggle.data("parent"),
                isOverlay = $toggle.data("toggle") === "overlay" || false,
                isTabs = $toggle.data("toggle") === "tab" && parentID || false,
                isHold = $toggle.data("hold") || false,
                $bodyTag = $("body"),
                $htmlTag = $("html");

            if (isTabs) {
                var $parentWrap = $("#" + parentID),
                    $relatedTabs = $parentWrap.find("[data-toggle=tab]");
            }

            // POPOVER/DROPDOWN functionality
            function toggleControl() {
                // Clear out Toggle Handler for easy exit of toggle if it exists

                if (isOverlay) {
                    $htmlTag.removeClass("js-data-toggled");
                }

                if ($toggle.hasClass("active")) {
                    //update a11y and classes, etc. if already opened
                    var shouldSlideUp = false;

                    if (!isTabs) {
                        shouldSlideUp = true;
                    } else {
                        //Check to see if any other of your tab siblings are also open... if so close
                        if ($relatedTabs.filter("[aria-expanded=true]").length > 1) {
                            shouldSlideUp = true;
                        }
                    }

                    if (shouldSlideUp) {
                        $htmlTag.off("click touchstart keyup", dataToggleHandler);
                        if($toggle.hasClass('search-toggle')){
                            $bodyTag.removeClass('search-active');
                        }
                        $controls.slideUp();
                        $toggle.removeClass("active").attr("aria-expanded", "false");
                    }
                } else {
                    // Set up attributes and classes for styling and a11y
                    $toggle.addClass("active").attr("aria-expanded", "true");

                    if($toggle.hasClass('search-toggle')){
                        $bodyTag.addClass('search-active');
                    }

                    $controls.slideDown(function () {

                        if (isOverlay) {
                            $htmlTag.addClass("js-data-toggled");
                        }

                        // Set up later timeout functionality to make sure we can clearout if other data toggles are pressed
                        var later = function later() {
                            if ($controls.find("input, select, textarea").length > 0) {
                                $controls.find("input, select, textarea").first().focus();
                            } else {
                                $controls.focus();
                            }
                        };

                        timeoutItem = setTimeout(later, talonUtil.speeds.transition);
                    });

                    // Set up Toggle Handler for easy exit of toggle
                    if (isOverlay) {
                        $htmlTag.addClass("js-data-toggled");
                    }

                    if (!isHold) {
                        $htmlTag.on("click touchstart keyup", dataToggleHandler);
                    }
                }
            }

            //namespaced function for use in html event checks from above
            function dataToggleHandler(e) {
                var requiresTrigger = false;
                //Check if escape is keyup-ed
                if (e.which === 27) {
                    requiresTrigger = true;
                    $toggle.focus();
                } else {
                    //otherwise check if touch/click is outside of bounds
                    var $target = $(e.target);
                    if ($target.closest("#" + relatedData).length <= 0 && $target.closest("#" + toggleID).length <= 0) {
                        requiresTrigger = true;
                    }
                }

                if (requiresTrigger) {
                    toggleControl();
                    //Clear timeout to help prevent focus / other data toggle press conflicts
                    clearTimeout(timeoutItem);
                    timeoutItem = null;
                }
            }

            // No point in doing anything if there isn't a proper related element set
            if (relatedData) {
                var $controls = $("#" + relatedData),
                    timeoutItem = null,
                    isExpanded = $toggle.hasClass("active");

                // make sure there is an ID set for the toggle for a11y needs
                if (!toggleID) {
                    $toggle.attr("id", talonUtil.generateID("data-toggle-"));
                    toggleID = $toggle.attr("id");
                }

                //Indicate initialization
                $toggle.attr("data-init", "");

                // finish up a11y setup for related element
                $controls.attr({ "aria-labelledby": toggleID });

                //Setup proper roles for a11y and then bind interaction functionality

                $toggle.attr({ "role": "button", "aria-haspopup": "true", "aria-expanded": isExpanded }).on("click", function (e) {
                    if (talonUtil.a11yClick(e) === true) {
                        e.preventDefault();
                        //Call function that controls show/hide
                        toggleControl();
                    }
                });

                if (isExpanded && !isHold) {
                    $htmlTag.on("click touchstart keyup", dataToggleHandler);
                }
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
})(jQuery, window.talonUtil = window.talonUtil || {});





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
        SITE INIT
    ================================================================ */

(function ($, talonUtil) {

    /** Click Navigation **/
    $(".main-nav").clickMenu();

    /** Image Gallery **/

    $('.photo-gallery.rotating').slick({
        dots: false,
        speed: 300,
        slidesToShow:4,
        arrows: true,
        slidesToScroll: 1,
        responsive: [
        {
          breakpoint: 960,
          settings: {
            slidesToShow: 2
          }
        },
        {
          breakpoint: 768,
          settings: {
            slidesToShow: 2
          }
        },
        {
          breakpoint: 640,
          settings: {
            slidesToShow: 1
          }
        }
      ]
    });

    $(".photo-overlay").colorbox({rel:'group1'});

    $('.photo-gallery-thumbs').slick({
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      fade: true,
      asNavFor: '.photo-thumbs'
    });

    $('.photo-thumbs').slick({
      slidesToShow: 4,
      slidesToScroll: 1,
      asNavFor: '.photo-gallery-thumbs',
      dots: false,
      centerMode: true,
      focusOnSelect: true,
      arrows:true,

      responsive: [
        {
          breakpoint: 960,
          settings: {
            slidesToShow: 3
          }
        },
        {
          breakpoint: 767,
          settings: {
            slidesToShow: 2
          }
        },

        {
          breakpoint: 479,
          settings: {
            slidesToShow: 1
          }
        }
      ]
    });

    /** List Tool on load */
    $('.list-tool.expand-list, .list-tool.accordion-list').each(function(){
        var $this = $(this);

        $this.find('.item:first-child > a').addClass('active');
        $this.find('.item .item-content').hide();
        $this.find('.item:first-child .item-content').show();
    });

    $('.talon-tabs').each(function(){
        var $this = $(this);

        $this.find('.talon-tab:first-child > a').addClass('active');
        $this.find('.talon-tab-pane').hide();
        $this.find('.talon-tab-pane:first-child').show();
    });

    /** Stop referrer Phishing hack */
    $("a[target=_blank], a[target=new]").attr("rel", "noopener noreferrer");


    talonUtil.setupToggles();
    talonUtil.setupScrollPointerBlocker();
    talonUtil.setupUserBinds();
})(jQuery, window.talonUtil);