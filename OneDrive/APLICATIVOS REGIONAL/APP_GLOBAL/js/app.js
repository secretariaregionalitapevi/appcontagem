/**
 * INSPINIA - Responsive Admin Theme
 *
 */
(function () {
    angular.module('inspinia', [
        'ui.router',                    // Routing
        'oc.lazyLoad',                  // ocLazyLoad
        'ui.bootstrap',                 // Ui Bootstrap
        'pascalprecht.translate',       // Angular Translate
        'ngIdle',                       // Idle timer
        'ngSanitize',                   // ngSanitize
        'oitozero.ngSweetAlert'
    ])
    .filter('numberFixedLen', function () {
        return function (n, len) {
            var num = parseInt(n, 10);
            len = parseInt(len, 10);
            if (isNaN(num) || isNaN(len)) return n;
            num = '' + num;
            while (num.length < len) num = '0' + num;
            return num;
        };
    })
    .constant('UiStandards', window.AppUiStandards || {})
    .run(['$rootScope', '$timeout', function ($rootScope, $timeout) {
        angular.element(document).on('show.bs.modal', '.modal', function () {
            var $modal = angular.element(this);

            if (!$modal.parent().is('body')) {
                $modal.appendTo('body');
            }
        });

        function refreshUiStandards() {
            if (!window.AppUiStandards) return;

            $timeout(function () {
                window.AppUiStandards.applyActionIcons(document.body);
                window.AppUiStandards.repairVisibleText(document.body);
                window.AppUiStandards.patchPdfMake();
                window.AppUiStandards.setupSweetAlertDefaults();
            }, 0, false);
        }

        refreshUiStandards();
        $rootScope.$on('$stateChangeSuccess', refreshUiStandards);
        $rootScope.$on('$viewContentLoaded', refreshUiStandards);
    }]);
})();


// Other libraries are loaded dynamically in the config.js file using the library ocLazyLoad
