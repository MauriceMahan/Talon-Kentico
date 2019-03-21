(function ($, talonUtil) {

    /** Click Navigation **/
    $(".main-nav").clickMenu();

    /** FocusOverlay **/
    $("body").focusOverlay();

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