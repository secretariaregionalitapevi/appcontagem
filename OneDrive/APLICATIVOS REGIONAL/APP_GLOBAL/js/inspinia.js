/**
 * INSPINIA - Responsive Admin Theme
 * 2.7.1
 *
 * Custom scripts
 */

$(document).ready(function () {
    function cleanupBootstrapModalState() {
        var $visibleModals = $('.modal.in:visible');
        var $body = $('body');

        if ($visibleModals.length) {
            return;
        }

        $('.modal-backdrop').remove();
        $('.modal').each(function () {
            $(this)
                .removeClass('in')
                .css('display', '')
                .attr('aria-hidden', 'true');
        });

        $body.removeClass('modal-open');
        $body.css('padding-right', '');
    }

    window.cleanupBootstrapModalState = cleanupBootstrapModalState;

    // Full height of sidebar
    function fix_height() {
        var heightWithoutNavbar = $("#wrapper").height() - 61;
        $(".sidebar-panel").css("min-height", heightWithoutNavbar + "px");

        var navbarHeight = $('nav.navbar-default').height();
        var wrapperHeight = $('#page-wrapper').height();

        //$(".sidebar-panel").css("min-height", wrapperHeigh - 61 + "px");

        if(navbarHeight > wrapperHeight){
            $('#page-wrapper').css("min-height", navbarHeight + "px");
        }

        if(navbarHeight < wrapperHeight){
            $('#page-wrapper').css("min-height", $(window).height()  + "px");
        }

        if ($('body').hasClass('fixed-nav')) {
            if (navbarHeight > wrapperHeight) {
                $('#page-wrapper').css("min-height", navbarHeight + "px");
            } else {
                $('#page-wrapper').css("min-height", $(window).height() - 60 + "px");
            }
        }

    }


    $(window).bind("load resize scroll", function() {
        if(!$("body").hasClass('body-small')) {
            fix_height();
        }
    });

    // Move right sidebar top after scroll
    $(window).scroll(function(){
        if ($(window).scrollTop() > 0 && !$('body').hasClass('fixed-nav') ) {
            $('#right-sidebar').addClass('sidebar-top');
        } else {
            $('#right-sidebar').removeClass('sidebar-top');
        }
    });


    setTimeout(function(){
        fix_height();
    });

    $(document).on('keydown.modalEscape', function (event) {
        var $modalAberto;

        if (event.which !== 27) {
            return;
        }

        $modalAberto = $('.modal.in:visible').last();
        if (!$modalAberto.length) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        $modalAberto.modal('hide');
    });

    $(document).on('hidden.bs.modal', '.modal', function () {
        setTimeout(cleanupBootstrapModalState, 0);
    });

    $(document).on('shown.bs.modal', '.modal', function () {
        $('body').addClass('modal-open');
    });

    $(window).on('pageshow focus', function () {
        setTimeout(cleanupBootstrapModalState, 0);
    });

    setTimeout(cleanupBootstrapModalState, 0);
});

// Minimalize menu when screen is less than 768px
$(window).bind("load resize", function () {
    if ($(document).width() < 769) {
        $('body').addClass('body-small')
    } else {
        $('body').removeClass('body-small')
    }
});
