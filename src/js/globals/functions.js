(function ($, talonUtil) {
    /** Click Navigation **/
    $(".main-nav").clickMenu();

    /** FocusOverlay **/
    $("body").focusOverlay();

    const hero = tns({
        container: '.hero-banner',
        mouseDrag: true,
        autoplay: true
    })

    $(".photo-overlay").colorbox({rel:'group1'});

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

    /** Stop referrer Phishing hack + ADA */
    $("a[target=_blank], a[target=new]").each(function () {
        $(this)
            .attr("rel", "noopener noreferrer")
            .append("<span class='visually-hidden'>(Opens in a new window)</span>");
    });

    talonUtil.setupToggles();
    talonUtil.setupScrollPointerBlocker();
    talonUtil.setupUserBinds();
    talonUtil.setupKenticoForms();
})(jQuery, window.talonUtil);