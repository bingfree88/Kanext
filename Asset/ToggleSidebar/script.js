(function () {
  var bodyElement = $('body');
  var sidebarElement = $('.sidebar');
  var sidebarContentElement = $('.sidebar-content');

  var toggleSidebarBtn = $(
    '<button class="btn button-minimize"><i class="fa fa-bars" aria-hidden="true"></i></button>'
  );
  var backDropElement = $('<div class="sidebar-content-overlay"></div>');

  // Expanded by default on desktop; drawer (collapsed) below 768px
  var desktopQuery = window.matchMedia('(min-width: 769px)');
  var isSidebarElementVisible = desktopQuery.matches;

  var apply = function () {
    if (isSidebarElementVisible) {
      bodyElement.addClass('toggle-sidebar--visible');
      sidebarElement.show();
      backDropElement.hide();

      return;
    }

    bodyElement.removeClass('toggle-sidebar--visible');
    sidebarElement.hide();
    backDropElement.hide();
  };

  var toggleFn = function () {
    isSidebarElementVisible = !isSidebarElementVisible;
    apply();
  };

  if (sidebarContentElement.length) {
    toggleSidebarBtn.click(toggleFn);
    backDropElement.click(toggleFn);

    // In drawer mode (small screens) tapping inside the sidebar closes it;
    // on the desktop the expanded sidebar must stay open while in use.
    sidebarElement.click(function () {
      if (!desktopQuery.matches) {
        toggleFn();
      }
    });

    sidebarContentElement.prepend(toggleSidebarBtn);
    bodyElement.append(backDropElement);

    if (isSidebarElementVisible) {
      bodyElement.addClass('toggle-sidebar--visible');
    } else {
      sidebarElement.hide();
    }
  }
})();
