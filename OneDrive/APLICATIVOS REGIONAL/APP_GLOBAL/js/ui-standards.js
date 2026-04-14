(function (window, document) {
    'use strict';

    var palette = {
        primary: '#1e4b7a',
        primaryLight: '#eef4fa',
        success: '#1ab394',
        warning: '#f8ac59',
        danger: '#ed5565'
    };

    var actionIcons = {
        view: 'fa-eye',
        edit: 'fa-pencil-square-o',
        delete: 'fa-trash-o'
    };

    var colorAliases = {
        '#1ab394': palette.primary,
        '#23c6c8': palette.primary,
        '#1e4b7a': palette.primary,
        '#eef4fa': palette.primaryLight
    };

    function normalizeText(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    function normalizeColor(value) {
        var normalized = String(value || '').toLowerCase();
        return colorAliases[normalized] || value;
    }

    function hasMojibake(value) {
        return /Ã.|Â.|�/.test(String(value || ''));
    }

    function decodeMojibakeOnce(value) {
        try {
            return decodeURIComponent(escape(value));
        } catch (error) {
            return value;
        }
    }

    function repairText(value) {
        var current = String(value || '');
        var next = current;
        var attempts = 0;

        if (!hasMojibake(current)) {
            return current;
        }

        while (attempts < 3) {
            next = decodeMojibakeOnce(next).replace(/Â(?=\S)/g, '');

            if (next === current) {
                break;
            }

            current = next;
            attempts += 1;

            if (!hasMojibake(current)) {
                break;
            }
        }

        return current;
    }

    function translateAlertMessage(value) {
        var message = repairText(value);
        var exactTranslations = {
            'User already registered': 'Usuário já cadastrado.',
            'Email already registered': 'E-mail já cadastrado.',
            'Invalid login credentials': 'E-mail, usuário ou senha inválidos.',
            'Email not confirmed': 'E-mail ainda não foi confirmado.',
            'User not found': 'Usuário não encontrado.',
            'Too many requests': 'Muitas tentativas. Tente novamente mais tarde.',
            'Signup is disabled': 'O cadastro está desativado no momento.',
            'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
            'Email rate limit exceeded': 'Limite de envio para este e-mail excedido. Tente novamente mais tarde.'
        };

        if (exactTranslations[message]) {
            return exactTranslations[message];
        }

        if (/already registered/i.test(message)) {
            return 'Usuário já cadastrado.';
        }

        if (/invalid login credentials/i.test(message)) {
            return 'E-mail, usuário ou senha inválidos.';
        }

        return message;
    }

    function inferActionKind(element) {
        var title = normalizeText(element.getAttribute('title'));
        var text = normalizeText(element.textContent || '');
        var source = (title + ' ' + text).trim();

        if (!source) return null;

        if (source.indexOf('apagar') !== -1 || source.indexOf('excluir') !== -1 || source.indexOf('delete') !== -1 || source.indexOf('remove') !== -1) {
            return 'delete';
        }

        if (source.indexOf('editar') !== -1 || source.indexOf('edit') !== -1) {
            return 'edit';
        }

        if (source.indexOf('detalhes') !== -1 || source.indexOf('detalhe') !== -1 || source.indexOf('visualizar') !== -1 || source.indexOf('ver') !== -1 || source.indexOf('view') !== -1) {
            return 'view';
        }

        return null;
    }

    function normalizeActionButtonIcon(element) {
        var kind = inferActionKind(element);
        var icon;
        var iconClass;
        var $element;

        if (!kind || !window.jQuery) return;

        $element = window.jQuery(element);
        icon = $element.find('i.fa').first();
        if (!icon.length) return;

        iconClass = actionIcons[kind];
        $element
            .addClass('app-action-btn app-action-' + kind)
            .removeClass('btn-primary btn-info btn-warning btn-danger');
        icon.removeClass('fa-folder fa-folder-open fa-folder-o fa-folder-open-o fa-pencil fa-pencil-square fa-pencil-square-o fa-trash fa-trash-o fa-eye');
        icon.addClass(iconClass);
    }

    function applyActionIcons(root) {
        if (!window.jQuery) return;

        window.jQuery(root || document).find('button.btn, a.btn').each(function () {
            normalizeActionButtonIcon(this);
        });
    }

    function repairElementAttributes(element) {
        var placeholder = element.getAttribute('placeholder');
        var title = element.getAttribute('title');
        var value = element.getAttribute('value');

        if (placeholder && hasMojibake(placeholder)) {
            element.setAttribute('placeholder', repairText(placeholder));
        }

        if (title && hasMojibake(title)) {
            element.setAttribute('title', repairText(title));
        }

        if (value && hasMojibake(value) && /^(button|submit|reset)$/i.test(element.type || '')) {
            element.setAttribute('value', repairText(value));
        }
    }

    function repairVisibleText(root) {
        var walker;
        var node;
        var base = root || document.body;

        if (!base || !document.createTreeWalker) return;

        walker = document.createTreeWalker(base, window.NodeFilter.SHOW_TEXT, {
            acceptNode: function (textNode) {
                var parent = textNode.parentNode;
                var value = textNode.nodeValue;
                var tagName;

                if (!parent || !value || !hasMojibake(value)) {
                    return window.NodeFilter.FILTER_REJECT;
                }

                tagName = parent.nodeName.toLowerCase();
                if (/^(script|style|noscript|textarea)$/i.test(tagName)) {
                    return window.NodeFilter.FILTER_REJECT;
                }

                return window.NodeFilter.FILTER_ACCEPT;
            }
        });

        while ((node = walker.nextNode())) {
            node.nodeValue = repairText(node.nodeValue);
        }

        if (!base.querySelectorAll) return;

        Array.prototype.forEach.call(base.querySelectorAll('[placeholder], [title], input[type="button"], input[type="submit"], input[type="reset"]'), function (element) {
            repairElementAttributes(element);
        });
    }

    function normalizePdfDefinition(node) {
        var clone;

        if (!node || typeof node !== 'object') {
            return node;
        }

        if (Object.prototype.toString.call(node) === '[object Array]') {
            return node.map(normalizePdfDefinition);
        }

        clone = {};
        Object.keys(node).forEach(function (key) {
            var value = node[key];

            if ((key === 'color' || key === 'fillColor' || key === 'lineColor') && typeof value === 'string') {
                clone[key] = normalizeColor(value);
                return;
            }

            clone[key] = normalizePdfDefinition(value);
        });

        return clone;
    }

    function withGlobalPdfDefaults(docDefinition) {
        var normalized = normalizePdfDefinition(docDefinition || {});
        var baseStyles = createPdfStyles();

        if (window.jQuery) {
            normalized.styles = window.jQuery.extend(true, {}, baseStyles, normalized.styles || {});
        } else {
            normalized.styles = normalized.styles || baseStyles;
        }

        normalized.defaultStyle = normalized.defaultStyle || {};
        if (!normalized.defaultStyle.fontSize) {
            normalized.defaultStyle.fontSize = 10;
        }

        return normalized;
    }

    function patchPdfMake() {
        var originalCreatePdf;

        if (!window.pdfMake || window.pdfMake.__appUiPatched) return;

        originalCreatePdf = window.pdfMake.createPdf.bind(window.pdfMake);
        window.pdfMake.createPdf = function (docDefinition) {
            return originalCreatePdf(withGlobalPdfDefaults(docDefinition));
        };
        window.pdfMake.__appUiPatched = true;
    }

    function isDeleteAlertOptions(options) {
        var title = normalizeText(options && options.title);
        var text = normalizeText(options && options.text);
        var confirmText = normalizeText(options && options.confirmButtonText);

        return !!(options &&
            options.showCancelButton &&
            (options.type === 'warning' || options.icon === 'warning') &&
            (
                title.indexOf('remover') !== -1 ||
                title.indexOf('excluir') !== -1 ||
                title.indexOf('tem certeza') !== -1 ||
                text.indexOf('excluir') !== -1 ||
                text.indexOf('remover') !== -1 ||
                confirmText.indexOf('excluir') !== -1
            ));
    }

    function extractDeleteTargetName(text) {
        var source = String(text || '').replace(/\s+/g, ' ').trim();
        var match = null;

        if (!source) return '';

        match = source.match(/(?:cadastro|registro|dados|aula)\s+de\s+(.+?)(\?|$)/i);
        if (match && match[1]) return match[1].trim();

        match = source.match(/excluir\s+(.+?)(\?|$)/i);
        if (match && match[1]) return match[1].trim();

        return source.replace(/\?$/, '').trim();
    }

    function extractDeleteSupportText(text) {
        var source = String(text || '').replace(/\s+/g, ' ').trim();
        var parts;

        if (!source) return '';

        parts = source.split('?');
        if (parts.length < 2) return '';

        return parts.slice(1).join('?').trim();
    }

    function buildDeleteAlertHtml(text) {
        var targetName = extractDeleteTargetName(text);

        if (!targetName) {
            return 'Você deseja mesmo excluir este registro?<br><small>Esta ação não poderá ser revertida.</small>';
        }

        return 'Você deseja mesmo excluir o registro de<br><strong>' +
            targetName.toUpperCase() +
            '</strong>?<br><small>Esta ação não poderá ser revertida.</small>';
    }

    // Override em ASCII para evitar textos corrompidos em ambientes com charset legado.
    function buildDeleteAlertHtml(text) {
        var targetName = extractDeleteTargetName(text);
        var supportText = extractDeleteSupportText(text);
        var emphasisStyle = 'display:inline-block;margin-top:8px;font-size:14px;line-height:1.55;font-weight:600;color:#3f4a5a;letter-spacing:0.1px;max-width:360px;';
        var helperStyle = 'display:inline-block;margin-top:10px;font-size:12px;line-height:1.6;color:#6b7788;max-width:360px;';
        var fallbackTarget = 'este registro';

        if (!targetName) {
            targetName = fallbackTarget;
        }

        supportText = repairText(supportText || 'Esta ação não poderá ser revertida.');

        return 'Você deseja mesmo excluir o cadastro de<br><span style="' +
            emphasisStyle +
            '">' +
            repairText(targetName) +
            '</span><br><span style="' +
            helperStyle +
            '">' +
            supportText +
            '</span>';
    }

    function enhanceActiveSweetAlert(isDeleteAlert) {
        var $alert;
        var $confirm;
        var $cancel;
        var $actions;

        if (!window.jQuery) return;

        $alert = window.jQuery('.sweet-alert:visible').last();
        if (!$alert.length) return;

        $actions = $alert.find('.sa-button-container').first();
        if (!$actions.length) return;

        $confirm = $actions.find('button').not('.cancel').first();
        $cancel = $actions.find('button.cancel').first();

        if ($confirm.length && $cancel.length) {
            $confirm.insertBefore($cancel);
        }

        if (!isDeleteAlert) return;

        if ($confirm.length) {
            $confirm.html('<i class="fa fa-check"></i> Sim, excluir');
        }

        if ($cancel.length) {
            $cancel.html('<i class="fa fa-times"></i> Cancelar');
        }
    }

    function shouldForceUppercaseField(element) {
        var type = String((element && element.getAttribute('type')) || '').toLowerCase();
        var model = String((element && element.getAttribute('ng-model')) || '').toLowerCase();
        var name = String((element && element.getAttribute('name')) || '').toLowerCase();
        var placeholder = String((element && element.getAttribute('placeholder')) || '').toLowerCase();
        var title = String((element && element.getAttribute('title')) || '').toLowerCase();
        var inputMode = String((element && element.getAttribute('inputmode')) || '').toLowerCase();
        var fieldKey = [model, name, placeholder, title].join(' ');

        if (!element) return false;
        if (element.tagName === 'TEXTAREA') return true;
        if (element.tagName !== 'INPUT') return false;
        if (type && ['email', 'password', 'search', 'number', 'date', 'time', 'datetime-local', 'month', 'week', 'url', 'tel'].indexOf(type) !== -1) return false;
        if (inputMode === 'numeric' || inputMode === 'decimal') return false;
        if (/data_nascimento|nascimento|celular|telefone|whatsapp|cep|email|senha|search|buscar|dd\/mm\/aaaa|\(11\)|00000-000/.test(fieldKey)) return false;

        return true;
    }

    function applyUppercaseValue(element) {
        if (!shouldForceUppercaseField(element)) return;
        element.style.textTransform = 'uppercase';
    }

    function setupFormUppercase() {
        if (!window.jQuery || document.__appUppercaseReady) return;

        document.__appUppercaseReady = true;

        window.jQuery(document).on('focus', 'form input[type="text"], form textarea', function () {
            applyUppercaseValue(this);
        });

        window.jQuery(function () {
            window.jQuery('form input[type="text"], form textarea').each(function () {
                applyUppercaseValue(this);
            });
        });
    }

    function shouldAutoClearNumericZero(element) {
        var type = String((element && element.getAttribute('type')) || '').toLowerCase();
        var value = String(element && element.value != null ? element.value : '').trim();

        if (!element || element.tagName !== 'INPUT') return false;
        if (type !== 'number') return false;
        if (element.disabled || element.readOnly) return false;

        return value === '0' || value === '0.0' || value === '0,0';
    }

    function syncNumericFieldValue(element, nextValue) {
        if (!element) return;

        element.value = nextValue;

        if (typeof Event === 'function') {
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        if (window.jQuery) {
            window.jQuery(element).trigger('input').trigger('change');
        }
    }

    function clearNumericZeroOnFocus(element) {
        if (!shouldAutoClearNumericZero(element)) return;
        if (element.__appZeroCleared) return;

        element.__appZeroCleared = true;
        syncNumericFieldValue(element, '');

        window.setTimeout(function () {
            element.__appZeroCleared = false;
        }, 0);
    }

    function setupNumberFieldFocusBehavior() {
        if (!window.jQuery || document.__appNumberFieldReady) return;

        document.__appNumberFieldReady = true;

        window.jQuery(document).on('focus', 'form input[type="number"]', function () {
            clearNumericZeroOnFocus(this);
        });

        window.jQuery(document).on('touchstart mousedown', 'form input[type="number"]', function () {
            clearNumericZeroOnFocus(this);
        });
    }

    function setupSweetAlertDefaults() {
        var originalSwal;

        if (!window.swal || window.swal.__appUiDefaults) return;

        if (typeof window.swal.setDefaults === 'function') {
            window.swal.setDefaults({
                confirmButtonColor: palette.primary
            });
        }

        originalSwal = window.swal;
        window.swal = function (arg1, arg2, arg3) {
            var isDeleteAlert = false;
            var options;
            var result;

            if (arg1 && typeof arg1 === 'object' && Object.prototype.toString.call(arg1) !== '[object Array]') {
                options = window.jQuery ? window.jQuery.extend(true, {}, arg1) : arg1;
                if (typeof options.title === 'string') {
                    options.title = translateAlertMessage(options.title);
                }
                if (typeof options.text === 'string') {
                    options.text = translateAlertMessage(options.text);
                }
                if (typeof options.confirmButtonText === 'string') {
                    options.confirmButtonText = translateAlertMessage(options.confirmButtonText);
                }
                if (typeof options.cancelButtonText === 'string') {
                    options.cancelButtonText = translateAlertMessage(options.cancelButtonText);
                }
                isDeleteAlert = isDeleteAlertOptions(options);

                if (isDeleteAlert) {
                    options.title = 'Tem certeza?';
                    options.text = buildDeleteAlertHtml(options.text);
                    options.html = true;
                    options.confirmButtonText = '<i class="fa fa-check"></i> Sim, excluir';
                    options.cancelButtonText = '<i class="fa fa-times"></i> Cancelar';
                    options.confirmButtonColor = '#255ec8';
                }

                result = originalSwal.call(this, options, arg2);
                window.setTimeout(function () {
                    enhanceActiveSweetAlert(isDeleteAlert);
                }, 0);
                return result;
            }

            if (typeof arg1 === 'string') {
                arguments[0] = translateAlertMessage(arg1);
            }
            if (typeof arg2 === 'string') {
                arguments[1] = translateAlertMessage(arg2);
            }

            result = originalSwal.apply(this, arguments);
            window.setTimeout(function () {
                enhanceActiveSweetAlert(false);
            }, 0);
            return result;
        };

        Object.keys(originalSwal).forEach(function (key) {
            window.swal[key] = originalSwal[key];
        });
        window.swal.__appUiDefaults = true;
    }

    function createPdfStyles(overrides) {
        var base = {
            header: { fontSize: 18, bold: true, color: palette.primary, margin: [0, 0, 0, 10] },
            moduleName: { fontSize: 14, bold: true, color: palette.primary, alignment: 'center', margin: [0, 8, 0, 0] },
            groupTitle: { fontSize: 11, bold: true, color: palette.primary, margin: [0, 8, 0, 4] },
            tableHeader: { color: '#ffffff', bold: true, alignment: 'center', fillColor: palette.primary }
        };

        if (window.jQuery && overrides) {
            return window.jQuery.extend(true, {}, base, overrides);
        }

        return base;
    }

    function createPdfTableLayout() {
        return {
            hLineWidth: function () { return 1; },
            vLineWidth: function () { return 1; },
            hLineColor: function (index, node) {
                return (index === 0 || index === node.table.body.length) ? palette.primary : '#eeeeee';
            },
            vLineColor: function () { return '#eeeeee'; },
            paddingLeft: function () { return 6; },
            paddingRight: function () { return 6; },
            paddingTop: function () { return 6; },
            paddingBottom: function () { return 6; }
        };
    }

    function exportWorkbook(options) {
        var workbook;
        var worksheet;
        var rows;

        if (!window.XLSX) {
            throw new Error('XLSX não está disponível.');
        }

        rows = options && options.rows ? options.rows : [];
        worksheet = options && options.worksheet ? options.worksheet : window.XLSX.utils.aoa_to_sheet(rows);
        workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, (options && options.sheetName) || 'Relatorio');
        window.XLSX.writeFile(workbook, (options && options.fileName) || 'relatorio.xlsx');
    }

    window.AppUiStandards = {
        palette: palette,
        actionIcons: actionIcons,
        applyActionIcons: applyActionIcons,
        applyUppercaseValue: applyUppercaseValue,
        setupFormUppercase: setupFormUppercase,
        setupNumberFieldFocusBehavior: setupNumberFieldFocusBehavior,
        repairText: repairText,
        repairVisibleText: repairVisibleText,
        normalizePdfDefinition: normalizePdfDefinition,
        withGlobalPdfDefaults: withGlobalPdfDefaults,
        patchPdfMake: patchPdfMake,
        setupSweetAlertDefaults: setupSweetAlertDefaults,
        createPdfStyles: createPdfStyles,
        createPdfTableLayout: createPdfTableLayout,
        exportWorkbook: exportWorkbook
    };

    if (window.jQuery) {
        window.jQuery(function () {
            applyActionIcons(document.body);
            repairVisibleText(document.body);
            patchPdfMake();
            setupSweetAlertDefaults();
            setupFormUppercase();
            setupNumberFieldFocusBehavior();
        });
    }
})(window, document);
