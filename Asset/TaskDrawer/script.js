(function () {
    // Public and readonly boards don't load app.min.js, so KB is undefined there
    if (typeof KB === 'undefined') {
        return;
    }

    var currentUrl = null;
    var loadSequence = 0;
    var onDocumentKeydown = null;

    function buildDrawerUrl(taskId) {
        return '?plugin=Kanext&controller=TaskDrawerController&action=show&task_id=' + encodeURIComponent(taskId);
    }

    function isTaskFragment(html) {
        // the core "page not found" fragment has no #task-view,
        // the task layout fragment always has it
        return typeof html === 'string' && html.indexOf('id="task-view"') !== -1;
    }

    function onCardClick(e) {
        if (e.button !== 0) {
            return;
        }

        // The "assign to me" icon keeps its core modal behavior
        if (KB.dom(e.target).parent('.task-board-change-assignee')) {
            return;
        }

        var taskElement = KB.dom(e.target).parent('.task-board');
        if (! taskElement || ! KB.dom(taskElement).data('taskUrl')) {
            return; // not a private-board task card
        }

        var anchorElement = KB.dom(e.target).parent('a');
        if (anchorElement) {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
                return; // let the browser open the link in a new tab/window
            }

            // Modal links inside the card (edit icon, category name) are also
            // matched by the core ".js-modal-*" KB.onClick entry: KB.listen
            // runs every matching selector for one click, so the only way to
            // avoid drawer + modal opening together is to step aside here
            if (/(^|\s)js-modal/.test(anchorElement.className)) {
                return;
            }

            e.preventDefault();
        }

        var taskId = KB.dom(taskElement).data('taskId');
        if (taskId) {
            openDrawer(buildDrawerUrl(taskId));
        }
    }

    function openDrawer(url) {
        currentUrl = url;

        if (window._KB && window._KB.get('Dropdown')) {
            window._KB.get('Dropdown').close();
        }

        if (! KB.exists('#kanext-task-drawer')) {
            createDrawer();
        }

        document.body.classList.add('kanext-drawer-open');
        // compensate the scrollbar that disappears with the locked overflow
        var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = scrollbarWidth + 'px';
        }

        if (onDocumentKeydown === null) {
            onDocumentKeydown = function (e) {
                if (e.key !== 'Escape' || ! KB.exists('#kanext-task-drawer')) {
                    return;
                }

                // let the core close its own layers first
                if (KB.modal.isOpen() || KB.exists('#suggest-menu') || KB.exists('#dropdown')) {
                    return;
                }

                e.preventDefault();
                closeDrawer();
            };
            document.addEventListener('keydown', onDocumentKeydown, true);
        }

        loadContent(url);
    }

    function createDrawer() {
        var closeButtonElement = KB.dom('a')
            .attr('href', '#')
            .attr('id', 'kanext-drawer-close')
            .attr('aria-label', 'Close')
            .html('<i class="fa fa-times"></i>')
            .click(closeDrawer)
            .build();

        var headerElement = KB.dom('div')
            .attr('id', 'kanext-drawer-header')
            .add(closeButtonElement)
            .build();

        var contentElement = KB.dom('div')
            .attr('id', 'kanext-drawer-content')
            .html('<div class="kanext-drawer-loading"><i class="fa fa-spinner fa-pulse fa-2x"></i></div>')
            .build();

        var panelElement = KB.dom('aside')
            .attr('id', 'kanext-task-drawer')
            .add(headerElement)
            .add(contentElement)
            .build();

        var overlayElement = KB.dom('div')
            .attr('id', 'kanext-task-drawer-overlay')
            .add(panelElement)
            .build();

        overlayElement.addEventListener('click', function (e) {
            if (e.target === overlayElement) {
                closeDrawer();
            }
        }, false);

        document.body.appendChild(overlayElement);
    }

    function loadContent(url) {
        var sequence = ++loadSequence;

        setContent('<div class="kanext-drawer-loading"><i class="fa fa-spinner fa-pulse fa-2x"></i></div>');

        KB.http.get(url)
            .success(function (response) {
                if (sequence !== loadSequence || ! KB.exists('#kanext-task-drawer')) {
                    return; // stale response or the drawer was closed meanwhile
                }

                if (isTaskFragment(response)) {
                    setContent(response);
                } else {
                    // task not found: the core returns HTTP 200 with the notfound page
                    closeDrawer();
                    window.alert('Unable to load this task.');
                }
            })
            .error(function (response) {
                if (sequence !== loadSequence) {
                    return;
                }

                closeDrawer();

                if (response && typeof response === 'object' && response.message) {
                    window.alert(response.message);
                } else {
                    window.alert('Unable to load this task.');
                }
            })
            .authError(function () {
                if (sequence !== loadSequence) {
                    return;
                }

                closeDrawer();
            });
    }

    function refreshContent() {
        if (currentUrl) {
            loadContent(currentUrl);
        }
    }

    function setContent(html) {
        var contentElement = KB.find('#kanext-drawer-content');

        if (! contentElement) {
            return;
        }

        contentElement.replace(KB.dom('div')
            .attr('id', 'kanext-drawer-content')
            .html(html)
            .build()
        );

        afterRendering();
    }

    function afterRendering() {
        // same initialization as the core modal, minus Task.onPopoverOpened()
        // (it rebinds global listeners on every call)
        KB.render();
        _KB.datePicker();
        _KB.autoComplete();
        _KB.tagAutoComplete();

        if (KB.exists('#kanext-drawer-content .subtasks-table')) {
            KB.trigger('subtasks.reloaded');
        }

        // the drawer has its own context; the project header would bring a
        // search form and duplicate ids conflicting with the board page
        var headerElement = document.querySelector('#kanext-task-drawer .project-header');
        if (headerElement) {
            headerElement.remove();
        }

        bindForms();
        bindSidebarLinks();

        var panelElement = document.querySelector('#kanext-task-drawer');
        if (panelElement) {
            panelElement.scrollTop = 0;
        }
    }

    // Sidebar navigation links (Summary, Activity stream, Transitions,
    // Analytics, Time tracking) would navigate away from the board and
    // close the drawer; open them in the core modal instead, like the
    // Actions menu items do
    function bindSidebarLinks() {
        var links = document.querySelectorAll('#kanext-task-drawer .sidebar a[href]');

        for (var i = 0; i < links.length; i++) {
            if (/(^|\s)js-modal/.test(links[i].className)) {
                continue; // already handled by the core modal component
            }

            links[i].addEventListener('click', onSidebarLinkClick, false);
        }
    }

    function onSidebarLinkClick(e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
            return; // let the browser open the link in a new tab/window
        }

        e.preventDefault();
        KB.modal.open(this.getAttribute('href'), 'large', true);
    }

    function bindForms() {
        var forms = document.querySelectorAll('#kanext-drawer-content form:not(.js-modal-ignore-form)');

        for (var i = 0; i < forms.length; i++) {
            // never intercept search/filter forms: their action is a GET and
            // posting it would replace the drawer content with a task list
            if ((forms[i].getAttribute('method') || 'get').toLowerCase() !== 'post') {
                continue;
            }

            forms[i].addEventListener('submit', onFormSubmit, false);
        }
    }

    function onFormSubmit(e) {
        e.preventDefault();

        var form = e.target;
        var url = form.getAttribute('action');

        if (! url) {
            return;
        }

        // Own XHR instead of KB.http.postForm: KB.http would follow the
        // X-Ajax-Redirect header and reload the whole page, losing the drawer
        var request = new XMLHttpRequest();
        request.open('POST', url, true);
        request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        request.onreadystatechange = function () {
            if (request.readyState === XMLHttpRequest.DONE && request.status === 200) {
                if (request.responseText) {
                    // validation errors: re-render the form
                    setContent(request.responseText);
                } else {
                    // success: the server responded with a redirect, reload the details
                    refreshContent();
                }
            } else if (request.readyState === XMLHttpRequest.DONE) {
                var message = 'Unable to save this form.';

                try {
                    var data = JSON.parse(request.responseText);
                    if (data && data.message) {
                        message = data.message;
                    }
                } catch (exception) {}

                window.alert(message);
            }
        };
        request.send(new FormData(form));
    }

    function closeDrawer() {
        var overlayElement = KB.find('#kanext-task-drawer-overlay');

        if (overlayElement) {
            overlayElement.remove();
        }

        document.body.classList.remove('kanext-drawer-open');
        document.body.style.paddingRight = '';
        currentUrl = null;
        loadSequence++; // invalidate responses still in flight

        if (onDocumentKeydown !== null) {
            document.removeEventListener('keydown', onDocumentKeydown, true);
            onDocumentKeydown = null;
        }
    }

    KB.onClick('.task-board *', onCardClick, true);
    KB.onClick('.task-board', onCardClick, true);
}());
