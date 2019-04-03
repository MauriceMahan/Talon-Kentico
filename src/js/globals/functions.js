(function ($, talonUtil) {
    /** Click Navigation **/
    $(".main-nav").clickMenu();

    $('.hero-slider-section').each(function () {
        const slider = this.querySelector('.hero-slider');
        const prev = this.querySelector('.hero-slider-btn-prev');
        const next = this.querySelector('.hero-slider-btn-next');

        const hero = tns({
            container: slider,
            prevButton: prev,
            nextButton: next,
            autoplay: true
        });
    });

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

    talonUtil.vendorPlugins();
    talonUtil.setupToggles();
    talonUtil.setupScrollPointerBlocker();
    talonUtil.setupUserBinds();
    talonUtil.setupKenticoForms();
})(jQuery, window.talonUtil);