/*!
 * Datepicker v0.2.1
 * https://github.com/fengyuanchen/datepicker
 *
 * Copyright (c) 2014-2015 Fengyuan Chen
 * Released under the MIT license
 *
 * Date: 2015-12-09T10:59:48.516Z
 */

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define('datepicker', ['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {

  'use strict';

  var $window = $(window);
  var document = window.document;
  var $document = $(document);
  var NAMESPACE = 'datepicker';

  // Events
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_KEYUP = 'keyup.' + NAMESPACE;
  var EVENT_FOCUS = 'focus.' + NAMESPACE;
  var EVENT_RESIZE = 'resize.' + NAMESPACE;
  var EVENT_SHOW = 'show.' + NAMESPACE;
  var EVENT_HIDE = 'hide.' + NAMESPACE;
  var EVENT_PICK = 'pick.' + NAMESPACE;

  // RegExps
  var REGEXP_FORMAT = /y+|m+|d+|h+|M+/g;
  var REGEXP_DIGITS = /\d+/g;
  var REGEXP_YEAR = /^\d{2,4}$/;

  // Classes
  var CLASS_INLINE = 'datepicker-inline';
  var CLASS_DROPDOWN = 'datepicker-dropdown';
  var CLASS_TOP_LEFT = 'datepicker-top-left';
  var CLASS_TOP_RIGHT = 'datepicker-top-right';
  var CLASS_BOTTOM_LEFT = 'datepicker-bottom-left';
  var CLASS_BOTTOM_RIGHT = 'datepicker-bottom-right';
  var CLASS_PLACEMENTS = [
        CLASS_TOP_LEFT,
        CLASS_TOP_RIGHT,
        CLASS_BOTTOM_LEFT,
        CLASS_BOTTOM_RIGHT
      ].join(' ');
  var CLASS_HIDE = 'datepicker-hide';

  // Maths
  var num = Number;
  var min = Math.min;

  // Utilities
  var toString = Object.prototype.toString;

  function isString(str) {
    return typeof str === 'string';
  }

  function isNumber(num) {
    return typeof num === 'number' && !isNaN(num);
  }

  function isUndefined(obj) {
    return typeof obj === 'undefined';
  }

  function isDate(date) {
    if (typeof date !== 'object' || date === null) {
      return false;
    }

    return toString.call(date) === '[object Date]';
  }

  function toArray(obj, offset) {
    var args = [];

    // This is necessary for IE8
    if (isNumber(offset)) {
      args.push(offset);
    }

    return args.slice.apply(obj, args);
  }

  // Custom proxy to avoid jQuery's guid
  function proxy(fn, context) {
    var args = toArray(arguments, 2);

    return function () {
      return fn.apply(context, args.concat(toArray(arguments)));
    };
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function getDaysInMonth(year, month) {
    return [31, (isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
  }

  function parseFormat(format) {
    var source = format;
    var parts = source.match(REGEXP_FORMAT);
    var length;
    var i;

    if (!parts || parts.length === 0) {
      throw new Error('Invalid date format.');
    }

    format = {
      source: source,
      parts: parts
    };

    length = parts.length;

    for (i = 0; i < length; i++) {
      switch (parts[i]) {
        case 'dd':
        case 'd':
          format.hasDay = true;
          break;

        case 'mm':
        case 'm':
          format.hasMonth = true;
          break;

        case 'yyyy':
        case 'yy':
          format.hasYear = true;
          break;

        case 'h':
        case 'hh':
          format.hasHours = true;
          break;

        case 'M':
        case 'MM':
          format.hasMinutes = true;
          break;
        // No default
      }
    }

    return format;
  }

  function Datepicker(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, Datepicker.DEFAULTS, $.isPlainObject(options) && options);
    this.isBuilt = false;
    this.isShown = false;
    this.isInput = false;
    this.isInline = false;
    this.initialValue = '';
    this.initialDate = null;
    this.startDate = null;
    this.endDate = null;
    this.init();
  }

  Datepicker.prototype = {
    constructor: Datepicker,

    version: '0.2.1',

    init: function () {
      var options = this.options;
      var $this = this.$element;
      var startDate = options.startDate;
      var endDate = options.endDate;
      var date = options.date;

      if (options.language) {
        $.extend(options, Datepicker.LANGUAGES[options.language]);
      }

      this.$trigger = $(options.trigger || $this);
      this.isInput = $this.is('input') || $this.is('textarea');
      this.isInline = options.inline && (options.container || !this.isInput);
      this.format = parseFormat(options.format);
      this.initialValue = this.getValue();
      date = this.parseDate(date || this.initialValue);

      if (startDate) {
        startDate = this.parseDate(startDate);

        if (date.getTime() < startDate.getTime()) {
          date = new Date(startDate);
        }

        this.startDate = startDate;
      }

      if (endDate) {
        endDate = this.parseDate(endDate);

        if (startDate && endDate.getTime() < startDate.getTime()) {
          endDate = new Date(startDate);
        }

        if (date.getTime() > endDate.getTime()) {
          date = new Date(endDate);
        }

        this.endDate = endDate;
      }

      this.date = date;
      this.viewDate = new Date(date);
      this.initialDate = new Date(this.date);

      this.bind();

      if (options.autoshow || this.isInline) {
        this.show();
      }

      if (options.autopick) {
        this.pick();
      }
    },

    build: function () {
      var options = this.options;
      var $this = this.$element;
      var $picker;

      if (this.isBuilt) {
        return;
      }

      this.isBuilt = true;

      this.$picker = $picker = $(options.template);
      this.$week = $picker.find('[data-view="week"]');

      // Years view
      this.$yearsPicker = $picker.find('[data-view="years picker"]');
      this.$yearsPrev = $picker.find('[data-view="years prev"]');
      this.$yearsNext = $picker.find('[data-view="years next"]');
      this.$yearsCurrent = $picker.find('[data-view="years current"]');
      this.$years = $picker.find('[data-view="years"]');

      // Months view
      this.$monthsPicker = $picker.find('[data-view="months picker"]');
      this.$yearPrev = $picker.find('[data-view="year prev"]');
      this.$yearNext = $picker.find('[data-view="year next"]');
      this.$yearCurrent = $picker.find('[data-view="year current"]');
      this.$months = $picker.find('[data-view="months"]');

      // Days view
      this.$daysPicker = $picker.find('[data-view="days picker"]');
      this.$monthPrev = $picker.find('[data-view="month prev"]');
      this.$monthNext = $picker.find('[data-view="month next"]');
      this.$monthCurrent = $picker.find('[data-view="month current"]');
      this.$days = $picker.find('[data-view="days"]');

      if (this.isInline) {
        $(options.container || $this).append($picker.addClass(CLASS_INLINE));
      } else {
        $(document.body).append($picker.addClass(CLASS_DROPDOWN));
        $picker.addClass(CLASS_HIDE);
      }

      this.fillWeek();

      var $dh     = this.$daysPicker.find('[data-hours]'),
          $dm     = this.$daysPicker.find('[data-minutes]'),
          hours   = {
            min: parseInt($dh.attr('min'), 10),
            max: parseInt($dh.attr('max'), 10)
          },
          minutes = {
            min: parseInt($dm.attr('min'), 10),
            max: parseInt($dm.attr('max'), 10)
          },
          self = this;

      $dh.on('change', function (e) {
        e.preventDefault();

        var $this = $(this),
            val   = parseInt($this.val(), 10);

        if (val > hours.max){
          val = hours.max;
        }

        if (val < hours.min){
          val = hours.min;
        }

        if (val < 10){
          val = '0' + val;
        }

        $this.val(val);

        self.date.setHours(parseInt(val, 10));
        self.viewDate.setHours(parseInt(val, 10));
        self.setValue(self.formatDate(self.viewDate));
        self.update();
      });

      $dm.on('change', function (e) {
        e.preventDefault();

        var $this = $(this),
            val   = parseInt($this.val(), 10);

        if (val > minutes.max){
          val = minutes.max;
        }

        if (val < minutes.min){
          val = minutes.min;
        }

        if (val < 10){
          val = '0' + val;
        }

        $this.val(val);

        self.date.setMinutes(parseInt(val, 10));
        self.viewDate.setMinutes(parseInt(val, 10));
        self.setValue(self.formatDate(self.viewDate));
        self.update();
      });
    },

    unbuild: function () {
      if (!this.isBuilt) {
        return;
      }

      this.isBuilt = false;
      this.$picker.remove();
    },

    bind: function () {
      var options = this.options;
      var $this = this.$element;

      if ($.isFunction(options.show)) {
        $this.on(EVENT_SHOW, options.show);
      }

      if ($.isFunction(options.hide)) {
        $this.on(EVENT_HIDE, options.hide);
      }

      if ($.isFunction(options.pick)) {
        $this.on(EVENT_PICK, options.pick);
      }

      if (this.isInput) {
        $this.on(EVENT_KEYUP, $.proxy(this.keyup, this));

        if (!options.trigger) {
          $this.on(EVENT_FOCUS, $.proxy(this.show, this));
        }
      }

      this.$trigger.on(EVENT_CLICK, $.proxy(this.show, this));
    },

    unbind: function () {
      var options = this.options;
      var $this = this.$element;

      if ($.isFunction(options.show)) {
        $this.off(EVENT_SHOW, options.show);
      }

      if ($.isFunction(options.hide)) {
        $this.off(EVENT_HIDE, options.hide);
      }

      if ($.isFunction(options.pick)) {
        $this.off(EVENT_PICK, options.pick);
      }

      if (this.isInput) {
        $this.off(EVENT_KEYUP, this.keyup);

        if (!options.trigger) {
          $this.off(EVENT_FOCUS, this.show);
        }
      }

      this.$trigger.off(EVENT_CLICK, this.show);
    },

    showView: function (view) {
      var $yearsPicker = this.$yearsPicker;
      var $monthsPicker = this.$monthsPicker;
      var $daysPicker = this.$daysPicker;
      var $timeWrapper = $daysPicker.find('div[data-time-wrapper]');

      var format = this.format;

      if (format.hasYear || format.hasMonth || format.hasDay) {
        switch (num(view)) {
          case 2:
          case 'years':
            $monthsPicker.addClass(CLASS_HIDE);
            $daysPicker.addClass(CLASS_HIDE);

            if (format.hasYear) {
              this.fillYears();
              $yearsPicker.removeClass(CLASS_HIDE);
            } else {
              this.showView(0);
            }

            break;

          case 1:
          case 'months':
            $yearsPicker.addClass(CLASS_HIDE);
            $daysPicker.addClass(CLASS_HIDE);

            if (format.hasMonth) {
              this.fillMonths();
              $monthsPicker.removeClass(CLASS_HIDE);
            } else {
              this.showView(2);
            }

            break;

          // case 0:
          // case 'days':
          default:
            $yearsPicker.addClass(CLASS_HIDE);
            $monthsPicker.addClass(CLASS_HIDE);

            if (!format.hasHours){
              $timeWrapper.addClass(CLASS_HIDE);
            } else {
              $timeWrapper.removeClass(CLASS_HIDE);
            }

            if (format.hasDay) {
              this.fillDays();
              $daysPicker.removeClass(CLASS_HIDE);
            } else {
              this.showView(1);
            }
        }
      }
    },

    hideView: function () {
      if (this.options.autohide) {
        this.hide();
      }
    },

    place: function () {
      var options = this.options;
      var $this = this.$element;
      var $picker = this.$picker;
      var containerWidth = $document.outerWidth();
      var containerHeight = $document.outerHeight();
      var elementWidth = $this.outerWidth();
      var elementHeight = $this.outerHeight();
      var width = $picker.width();
      var height = $picker.height();
      var offsets = $this.offset();
      var left = offsets.left;
      var top = offsets.top;
      var offset = parseFloat(options.offset) || 10;
      var placement = CLASS_TOP_LEFT;

      if (top > height && top + elementHeight + height > containerHeight) {
        top -= height + offset;
        placement = CLASS_BOTTOM_LEFT;
      } else {
        top += elementHeight + offset;
      }

      if (left + width > containerWidth) {
        left = left + elementWidth - width;
        placement = placement.replace('left', 'right');
      }

      $picker.removeClass(CLASS_PLACEMENTS).addClass(placement).css({
        top: top,
        left: left,
        zIndex: parseInt(options.zIndex, 10)
      });
    },

    // A shortcut for triggering custom events
    trigger: function (type, data) {
      var e = $.Event(type, data);

      this.$element.trigger(e);

      return e;
    },

    createItem: function (data) {
      var options = this.options;
      var itemTag = options.itemTag;
      var defaults = {
            text: '',
            view: '',
            muted: false,
            picked: false,
            disabled: false
          };

      $.extend(defaults, data);

      var classList = [];

      if (defaults.disabled){
        classList.push(options.disabledClass);
      }

      if (defaults.picked){
        classList.push(options.pickedClass);
      }

      if (defaults.muted){
        classList.push(options.mutedClass);
      }

      return (
        '<' + itemTag +
        (classList.length ? ' class="' + classList.join(' ') + '"' : '') +
        (defaults.view ? ' data-view="' + defaults.view + '"' : '') +
        '>' +
        defaults.text +
        '</' + itemTag + '>'
      );
    },

    fillAll: function () {
      this.fillYears();
      this.fillMonths();
      this.fillDays();
    },

    fillWeek: function () {
      var options = this.options;
      var weekStart = parseInt(options.weekStart, 10) % 7;
      var days = options.daysMin;
      var list = '';
      var i;

      days = $.merge(days.slice(weekStart), days.slice(0, weekStart));

      for (i = 0; i <= 6; i++) {
        list += this.createItem({
          text: days[i]
        });
      }

      this.$week.html(list);
    },

    fillYears: function () {
      var options = this.options;
      var disabledClass = options.disabledClass || '';
      var suffix = options.yearSuffix || '';
      var filter = $.isFunction(options.filter) && options.filter;
      var startDate = this.startDate;
      var endDate = this.endDate;
      var viewDate = this.viewDate;
      var viewYear = viewDate.getFullYear();
      var viewMonth = viewDate.getMonth();
      var viewDay = viewDate.getDate();
      var date = this.date;
      var year = date.getFullYear();
      var isPrevDisabled = false;
      var isNextDisabled = false;
      var isDisabled = false;
      var isPicked = false;
      var isMuted = false;
      var list = '';
      var start = -5;
      var end = 6;
      var i;

      for (i = start; i <= end; i++) {
        date = new Date(viewYear + i, viewMonth, viewDay);
        isMuted = i === start || i === end;
        isPicked = (viewYear + i) === year;
        isDisabled = false;

        if (startDate) {
          isDisabled = date.getFullYear() < startDate.getFullYear();

          if (i === start) {
            isPrevDisabled = isDisabled;
          }
        }

        if (!isDisabled && endDate) {
          isDisabled = date.getFullYear() > endDate.getFullYear();

          if (i === end) {
            isNextDisabled = isDisabled;
          }
        }

        if (!isDisabled && filter) {
          isDisabled = filter.call(this.$element, date) === false;
        }

        list += this.createItem({
          text: viewYear + i,
          view: isDisabled ? 'year disabled' : isPicked ? 'year picked' : 'year',
          muted: isMuted,
          picked: isPicked,
          disabled: isDisabled
        });
      }

      this.$yearsPrev.toggleClass(disabledClass, isPrevDisabled);
      this.$yearsNext.toggleClass(disabledClass, isNextDisabled);
      this.$yearsCurrent.
        toggleClass(disabledClass, true).
        html((viewYear + start) + suffix + ' - ' + (viewYear + end) + suffix);
      this.$years.html(list);
    },

    fillMonths: function () {
      var options = this.options;
      var disabledClass = options.disabledClass || '';
      var months = options.monthsShort;
      var filter = $.isFunction(options.filter) && options.filter;
      var startDate = this.startDate;
      var endDate = this.endDate;
      var viewDate = this.viewDate;
      var viewYear = viewDate.getFullYear();
      var viewDay = viewDate.getDate();
      var date = this.date;
      var year = date.getFullYear();
      var month = date.getMonth();
      var isPrevDisabled = false;
      var isNextDisabled = false;
      var isDisabled = false;
      var isPicked = false;
      var list = '';
      var i;

      for (i = 0; i <= 11; i++) {
        date = new Date(viewYear, i, viewDay);
        isPicked = viewYear === year && i === month;
        isDisabled = false;

        if (startDate) {
          isPrevDisabled = date.getFullYear() === startDate.getFullYear();
          isDisabled = isPrevDisabled && date.getMonth() < startDate.getMonth();
        }

        if (!isDisabled && endDate) {
          isNextDisabled = date.getFullYear() === endDate.getFullYear();
          isDisabled = isNextDisabled && date.getMonth() > endDate.getMonth();
        }

        if (!isDisabled && filter) {
          isDisabled = filter.call(this.$element, date) === false;
        }

        list += this.createItem({
          index: i,
          text: months[i],
          view: isDisabled ? 'month disabled' : isPicked ? 'month picked' : 'month',
          picked: isPicked,
          disabled: isDisabled
        });
      }

      this.$yearPrev.toggleClass(disabledClass, isPrevDisabled);
      this.$yearNext.toggleClass(disabledClass, isNextDisabled);
      this.$yearCurrent.
        toggleClass(disabledClass, isPrevDisabled && isNextDisabled).
        html(viewYear + options.yearSuffix || '');
      this.$months.html(list);
    },

    fillDays: function () {
      var options = this.options;
      var disabledClass = options.disabledClass || '';
      var suffix = options.yearSuffix || '';
      var months = options.monthsShort;
      var weekStart = parseInt(options.weekStart, 10) % 7;
      var filter = $.isFunction(options.filter) && options.filter;
      var startDate = this.startDate;
      var endDate = this.endDate;
      var viewDate = this.viewDate;
      var viewYear = viewDate.getFullYear();
      var viewMonth = viewDate.getMonth();
      var prevViewYear = viewYear;
      var prevViewMonth = viewMonth;
      var nextViewYear = viewYear;
      var nextViewMonth = viewMonth;
      var date = this.date;
      var year = date.getFullYear();
      var month = date.getMonth();
      var day = date.getDate();
      var isPrevDisabled = false;
      var isNextDisabled = false;
      var isDisabled = false;
      var isPicked = false;
      var prevItems = [];
      var nextItems = [];
      var items = [];
      var total = 42; // 6 rows and 7 columns on the days picker
      var length;
      var i;
      var n;

      // Days of previous month
      // -----------------------------------------------------------------------

      if (viewMonth === 0) {
        prevViewYear -= 1;
        prevViewMonth = 11;
      } else {
        prevViewMonth -= 1;
      }

      // The length of the days of previous month
      length = getDaysInMonth(prevViewYear, prevViewMonth);

      // The first day of current month
      date = new Date(viewYear, viewMonth, 1);

      // The visible length of the days of previous month
      // [0,1,2,3,4,5,6] - [0,1,2,3,4,5,6] => [-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6]
      n = date.getDay() - weekStart;

      // [-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6] => [1,2,3,4,5,6,7]
      if (n <= 0) {
        n += 7;
      }

      if (startDate) {
        isPrevDisabled = date.getTime() <= startDate.getTime();
      }

      for (i = length - (n - 1); i <= length; i++) {
        date = new Date(prevViewYear, prevViewMonth, i);
        isDisabled = false;

        if (startDate) {
          isDisabled = date.getTime() < startDate.getTime();
        }

        if (!isDisabled && filter) {
          isDisabled = filter.call(this.$element, date) === false;
        }

        prevItems.push(this.createItem({
          text: i,
          view: 'day prev',
          muted: true,
          disabled: isDisabled
        }));
      }

      // Days of next month
      // -----------------------------------------------------------------------

      if (viewMonth === 11) {
        nextViewYear += 1;
        nextViewYear = 0;
      } else {
        nextViewMonth += 1;
      }

      // The length of the days of current month
      length = getDaysInMonth(viewYear, viewMonth);

      // The visible length of next month
      n = total - (prevItems.length + length);

      // The last day of current month
      date = new Date(viewYear, viewMonth, length);

      if (endDate) {
        isNextDisabled = date.getTime() >= endDate.getTime();
      }

      for (i = 1; i <= n; i++) {
        date = new Date(nextViewYear, nextViewMonth, i);
        isDisabled = false;

        if (endDate) {
          isDisabled = date.getTime() > endDate.getTime();
        }

        if (!isDisabled && filter) {
          isDisabled = filter.call(this.$element, date) === false;
        }

        nextItems.push(this.createItem({
          text: i,
          view: 'day next',
          muted: true,
          disabled: isDisabled
        }));
      }

      // Days of current month
      // -----------------------------------------------------------------------

      for (i = 1; i <= length; i++) {
        date = new Date(viewYear, viewMonth, i);
        isPicked = viewYear === year && viewMonth === month && i === day;
        isDisabled = false;

        if (startDate) {
          isDisabled = date.getTime() < startDate.getTime();
        }

        if (!isDisabled && endDate) {
          isDisabled = date.getTime() > endDate.getTime();
        }

        if (!isDisabled && filter) {
          isDisabled = filter.call(this.$element, date) === false;
        }

        items.push(this.createItem({
          text: i,
          view: isDisabled ? 'day disabled' : isPicked ? 'day picked' : 'day',
          picked: isPicked,
          disabled: isDisabled
        }));
      }

      // Render days picker
      // -----------------------------------------------------------------------

      this.$monthPrev.toggleClass(disabledClass, isPrevDisabled);
      this.$monthNext.toggleClass(disabledClass, isNextDisabled);
      this.$monthCurrent.
        toggleClass(disabledClass, isPrevDisabled && isNextDisabled).
        html(
          options.yearFirst ?
          viewYear + suffix + ' ' + months[viewMonth] :
          months[viewMonth] + ' ' + viewYear + suffix
        );
      this.$days.html(prevItems.join('') + items.join(' ') + nextItems.join(''));
    },

    click: function (e) {
      var $target = $(e.target);
      var viewDate = this.viewDate;
      var viewYear;
      var viewMonth;
      var viewDay;
      var viewHours;
      var viewMinutes;
      var isYear;
      var year;
      var view;

      e.stopPropagation();
      e.preventDefault();

      if ($target.hasClass('disabled')) {
        return;
      }

      viewYear    = viewDate.getFullYear();
      viewMonth   = viewDate.getMonth();
      viewDay     = viewDate.getDate();
      viewHours   = viewDate.getHours() || 0;
      viewMinutes = viewDate.getMinutes() || 0;
      view        = $target.data('view');

      switch (view) {
        case 'years prev':
        case 'years next':
          viewYear  = view === 'years prev' ? viewYear - 10 : viewYear + 10;
          year      = $target.text();
          isYear    = REGEXP_YEAR.test(year);

          if (isYear) {
            viewYear  = parseInt(year, 10);
            this.date = new Date(viewYear, viewMonth, min(viewDay, 28), viewHours, viewMinutes);
          }

          this.viewDate = new Date(viewYear, viewMonth, min(viewDay, 28), viewHours, viewMinutes);
          this.fillYears();

          if (isYear) {
            this.showView(1);
            this.pick('year');
          }

          break;

        case 'year prev':
        case 'year next':
          viewYear      = view === 'year prev' ? viewYear - 1 : viewYear + 1;
          this.viewDate = new Date(viewYear, viewMonth, min(viewDay, 28), viewHours, viewMinutes);
          this.fillMonths();
          break;

        case 'year current':

          if (this.format.hasYear) {
            this.showView(2);
          }

          break;

        case 'year picked':

          if (this.format.hasMonth) {
            this.showView(1);
          } else {
            this.hideView();
          }

          break;

        case 'year':
          viewYear      = parseInt($target.text(), 10);
          this.date     = new Date(viewYear, viewMonth, min(viewDay, 28), viewHours, viewMinutes);
          this.viewDate = new Date(viewYear, viewMonth, min(viewDay, 28), viewHours, viewMinutes);

          if (this.format.hasMonth) {
            this.showView(1);
          } else {
            this.hideView();
          }

          this.pick('year');
          break;

        case 'month prev':
        case 'month next':
          viewMonth     = view === 'month prev' ? viewMonth - 1 : view === 'month next' ? viewMonth + 1 : viewMonth;
          this.viewDate = new Date(viewYear, viewMonth, min(viewDay, 28), viewHours, viewMinutes);
          this.fillDays();
          break;

        case 'month current':

          if (this.format.hasMonth) {
            this.showView(1);
          }

          break;

        case 'month picked':

          if (this.format.hasDay) {
            this.showView(0);
          } else {
            this.hideView();
          }

          break;

        case 'month':
          viewMonth     = $.inArray($target.text(), this.options.monthsShort);
          this.date     = new Date(viewYear, viewMonth, min(viewDay, 28), viewHours, viewMinutes);
          this.viewDate = new Date(viewYear, viewMonth, min(viewDay, 28), viewHours, viewMinutes);

          if (this.format.hasDay) {
            this.showView(0);
          } else {
            this.hideView();
          }

          this.pick('month');
          break;

        case 'day prev':
        case 'day next':
        case 'day':
          viewMonth   = view === 'day prev' ? viewMonth - 1 : view === 'day next' ? viewMonth + 1 : viewMonth;
          viewDay     = parseInt($target.text(), 10);
          viewHours   = parseInt(this.$daysPicker.find('input[data-hours]').val(), 10) || 0;
          viewMinutes = parseInt(this.$daysPicker.find('input[data-minutes]').val(), 10) || 0;

          this.date     = new Date(viewYear, viewMonth, viewDay, viewHours, viewMinutes);
          this.viewDate = new Date(viewYear, viewMonth, viewDay, viewHours, viewMinutes);
          this.fillDays();

          if (view === 'day') {
            this.hideView();
          }

          this.pick('day');
          break;

        case 'day picked':
          viewMonth   = view === 'day prev' ? viewMonth - 1 : view === 'day next' ? viewMonth + 1 : viewMonth;
          viewDay     = parseInt($target.text(), 10);
          viewHours   = parseInt(this.$daysPicker.find('input[data-hours]').val(), 10) || 0;
          viewMinutes = parseInt(this.$daysPicker.find('input[data-minutes]').val(), 10) || 0;

          this.date     = new Date(viewYear, viewMonth, viewDay, viewHours, viewMinutes);
          this.viewDate = new Date(viewYear, viewMonth, viewDay, viewHours, viewMinutes);

          this.hideView();
          this.pick('day');
          break;

        // No default
      }
    },

    clickDoc: function (e) {
      var target = e.target;
      var trigger = this.$trigger[0];
      var ignored;

      while (target !== document) {
        if (target === trigger) {
          ignored = true;
          break;
        }

        target = target.parentNode;
      }

      if (!ignored) {
        this.hide();
      }
    },

    keyup: function () {
      this.update();
    },

    getValue: function () {
      var $this = this.$element;
      var val = '';

      if (this.isInput) {
        val = $this.val();
      } else if (this.isInline) {
        if (this.options.container) {
          val = $this.text();
        }
      } else {
        val = $this.text();
      }

      return val;
    },

    setValue: function (val) {
      var $this = this.$element;

      val = isString(val) ? val : '';

      if (this.isInput) {
        $this.val(val);
      } else if (this.isInline) {
        if (this.options.container) {
          $this.text(val);
        }
      } else {
        $this.text(val);
      }
    },


    // Methods
    // -------------------------------------------------------------------------

    // Show the datepicker
    show: function () {
      if (!this.isBuilt) {
        this.build();
      }

      if (this.isShown) {
        return;
      }

      if (this.trigger(EVENT_SHOW).isDefaultPrevented()) {
        return;
      }

      this.isShown = true;
      this.$picker.removeClass(CLASS_HIDE).on(EVENT_CLICK, $.proxy(this.click, this));
      this.showView(this.options.startView);

      if (!this.isInline) {
        $window.on(EVENT_RESIZE, (this._place = proxy(this.place, this)));
        $document.on(EVENT_CLICK, (this._clickDoc = proxy(this.clickDoc, this)));
        this.place();
      }
    },

    // Hide the datepicker
    hide: function () {
      if (!this.isShown) {
        return;
      }

      if (this.trigger(EVENT_HIDE).isDefaultPrevented()) {
        return;
      }

      this.isShown = false;
      this.$picker.addClass(CLASS_HIDE).off(EVENT_CLICK, this.click);

      if (!this.isInline) {
        $window.off(EVENT_RESIZE, this._place);
        $document.off(EVENT_CLICK, this._clickDoc);
      }
    },

    // Update the datepicker with the current input value
    update: function () {
      this.setDate(this.getValue(), true);

      var h = this.viewDate.getHours(),
          m = this.viewDate.getMinutes();

      $('input[data-hours]').val(h < 10 ? '0' + h : h);
      $('input[data-minutes]').val(m < 10 ? '0' + m : m);
    },

    /**
     * Pick the current date to the element
     *
     * @param {String} _view (private)
     */
    pick: function (_view) {
      var $this = this.$element;
      var date = this.date;

      if (this.trigger(EVENT_PICK, {
        view: _view || '',
        date: date
      }).isDefaultPrevented()) {
        return;
      }

      this.setValue(date = this.formatDate(this.date));

      if (this.isInput) {
        $this.trigger('change');
      }
    },

    // Reset the datepicker
    reset: function () {
      this.setDate(this.initialDate, true);
      this.setValue(this.initialValue);

      if (this.isShown) {
        this.showView(this.options.startView);
      }
    },

    /**
     * Get the month name with given argument or the current date
     *
     * @param {Number} month (optional)
     * @param {Boolean} short (optional)
     * @return {String} (month name)
     */
    getMonthName: function (month, short) {
      var options = this.options;
      var months = options.months;

      if ($.isNumeric(month)) {
        month = num(month);
      } else if (isUndefined(short)) {
        short = month;
      }

      if (short === true) {
        months = options.monthsShort;
      }

      return months[isNumber(month) ? month : this.date.getMonth()];
    },

    /**
     * Get the day name with given argument or the current date
     *
     * @param {Number} day (optional)
     * @param {Boolean} short (optional)
     * @param {Boolean} min (optional)
     * @return {String} (day name)
     */
    getDayName: function (day, short, min) {
      var options = this.options;
      var days = options.days;

      if ($.isNumeric(day)) {
        day = num(day);
      } else {
        if (isUndefined(min)) {
          min = short;
        }

        if (isUndefined(short)) {
          short = day;
        }
      }

      days = min === true ? options.daysMin : short === true ? options.daysShort : days;

      return days[isNumber(day) ? day : this.date.getDay()];
    },

    /**
     * Get the current date
     *
     * @param {Boolean} formatted (optional)
     * @return {Date|String} (date)
     */
    getDate: function (formatted) {
      var date = this.date;

      return formatted ? this.formatDate(date) : new Date(date);
    },

    /**
     * Set the current date with a new date
     *
     * @param {Date} date
     * @param {Boolean} _isUpdated (private)
     */
    setDate: function (date, _isUpdated) {
      var filter = this.options.filter;

      if (isDate(date) || isString(date)) {
        date = this.parseDate(date);

        if ($.isFunction(filter) && filter.call(this.$element, date) === false) {
          return;
        }

        this.date = date;
        this.viewDate = new Date(date);

        if (!_isUpdated) {
          this.pick();
        }

        if (this.isBuilt) {
          this.fillAll();
        }
      }
    },

    /**
     * Set the start view date with a new date
     *
     * @param {Date} date
     */
    setStartDate: function (date) {
      if (isDate(date) || isString(date)) {
        this.startDate = this.parseDate(date);

        if (this.isBuilt) {
          this.fillAll();
        }
      }
    },

    /**
     * Set the end view date with a new date
     *
     * @param {Date} date
     */
    setEndDate: function (date) {
      if (isDate(date) || isString(date)) {
        this.endDate = this.parseDate(date);

        if (this.isBuilt) {
          this.fillAll();
        }
      }
    },

    /**
     * Parse a date string with the set date format
     *
     * @param {String} date
     * @return {Date} (parsed date)
     */
    parseDate: function (date) {
      var format = this.format;
      var parts = [];
      var length;
      var year;
      var day;
      var month;
      var hours;
      var minutes;
      var val;
      var i;

      if (isDate(date)) {
        return new Date(date);
      } else if (isString(date)) {
        parts = date.match(REGEXP_DIGITS) || [];
      }

      date = new Date();
      year = date.getFullYear();
      day = date.getDate();
      month = date.getMonth();
      hours = date.getHours();
      minutes = date.getMinutes();
      length = format.parts.length;

      if (parts.length === length) {
        for (i = 0; i < length; i++) {
          val = parseInt(parts[i], 10) || 0;

          switch (format.parts[i]) {
            case 'dd':
            case 'd':
              day = val;
              break;

            case 'mm':
            case 'm':
              month = val - 1;
              break;

            case 'yy':
              year = 2000 + val;
              break;

            case 'yyyy':
              year = val;
              break;

            case 'h':
            case 'hh':
              hours = val;
              break;

            case 'M':
            case 'MM':
              minutes = val;
              break;

            // No default
          }
        }
      }

      return new Date(year, month, day, hours, minutes);
    },

    /**
     * Format a date object to a string with the set date format
     *
     * @param {Date} date
     * @return {String} (formatted date)
     */
    formatDate: function (date) {
      var format = this.format;
      var formatted = '';
      var length;
      var year;
      var part;
      var val;
      var i;

      if (isDate(date)) {
        formatted = format.source;
        year = date.getFullYear();
        val = {
          d: date.getDate(),
          m: date.getMonth() + 1,
          yy: year.toString().substring(2),
          yyyy: year,
          h: date.getHours(),
          M: date.getMinutes()
        };

        val.dd = (val.d < 10 ? '0' : '') + val.d;
        val.mm = (val.m < 10 ? '0' : '') + val.m;
        val.hh = (val.h < 10 ? '0' : '') + val.h;
        val.MM = (val.M < 10 ? '0' : '') + val.M;

        length = format.parts.length;

        for (i = 0; i < length; i++) {
          part = format.parts[i];
          formatted = formatted.replace(part, val[part]);
        }
      }

      return formatted;
    },

    // Destroy the datepicker and remove the instance from the target element
    destroy: function () {
      this.unbind();
      this.unbuild();
      this.$element.removeData(NAMESPACE);
    }
  };

  Datepicker.LANGUAGES = {};

  Datepicker.DEFAULTS = {
    // Show the datepicker automatically when initialized
    autoshow: false,

    // Hide the datepicker automatically when picked
    autohide: false,

    // Pick the initial date automatically when initialized
    autopick: false,

    // Enable inline mode
    inline: false,

    // A element (or selector) for putting the datepicker
    container: null,

    // A element (or selector) for triggering the datepicker
    trigger: null,

    // The ISO language code (built-in: en-US)
    language: '',

    // The date string format
    format: 'dd/mm/yyyy hh:MM',

    // The initial date
    date: null,

    // The start view date
    startDate: null,

    // The end view date
    endDate: null,

    // The start view when initialized
    startView: 0, // 0 for days, 1 for months, 2 for years

    // The start day of the week
    weekStart: 0, // 0 for Sunday, 1 for Monday, 2 for Tuesday, 3 for Wednesday, 4 for Thursday, 5 for Friday, 6 for Saturday

    // Show year before month on the datepicker header
    yearFirst: false,

    // A string suffix to the year number.
    yearSuffix: '',

    // Days' name of the week.
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],

    // Shorter days' name
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

    // Shortest days' name
    daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],

    // Months' name
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],

    // Shorter months' name
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

    // A element tag for each item of years, months and days
    itemTag: 'li',

    // A class (CSS) for muted date item
    mutedClass: 'muted',

    // A class (CSS) for picked date item
    pickedClass: 'picked',

    // A class (CSS) for disabled date item
    disabledClass: 'disabled',

    // The template of the datepicker
    template: (
      '<div class="datepicker-container">' +
        '<div class="datepicker-panel" data-view="years picker">' +
          '<ul>' +
            '<li data-view="years prev">&lsaquo;</li>' +
            '<li data-view="years current"></li>' +
            '<li data-view="years next">&rsaquo;</li>' +
          '</ul>' +
          '<ul data-view="years"></ul>' +
        '</div>' +
        '<div class="datepicker-panel" data-view="months picker">' +
          '<ul>' +
            '<li data-view="year prev">&lsaquo;</li>' +
            '<li data-view="year current"></li>' +
            '<li data-view="year next">&rsaquo;</li>' +
          '</ul>' +
          '<ul data-view="months"></ul>' +
        '</div>' +
        '<div class="datepicker-panel" data-view="days picker">' +
          '<ul>' +
            '<li data-view="month prev">&lsaquo;</li>' +
            '<li data-view="month current"></li>' +
            '<li data-view="month next">&rsaquo;</li>' +
          '</ul>' +
          '<ul data-view="week"></ul>' +
          '<ul data-view="days"></ul>' +
          '<div data-time-wrapper>' +
            '<input type="text" pattern="[0-9]*" data-hours min=0 max=23 value="00" />' +
            '<input type="text" pattern="[0-9]*" data-minutes min=0 max=59 step=5 value="00" />' +
          '</div>' +
        '</div>' +
      '</div>'
    ),

    // The offset top or bottom of the datepicker from the element
    offset: 10,

    // The `z-index` of the datepicker
    zIndex: 1,

    // Filter each date item (return `false` to disable a date item)
    filter: null,

    // Event shortcuts
    show: null,
    hide: null,
    pick: null
  };

  Datepicker.setDefaults = function (options) {
    $.extend(Datepicker.DEFAULTS, $.isPlainObject(options) && options);
  };

  // Save the other datepicker
  Datepicker.other = $.fn.datepicker;

  // Register as jQuery plugin
  $.fn.datepicker = function (option) {
    var args = toArray(arguments, 1);
    var result;

    this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var options;
      var fn;

      if (!data) {
        if (/destroy/.test(option)) {
          return;
        }

        options = $.extend({}, $this.data(), $.isPlainObject(option) && option);
        $this.data(NAMESPACE, (data = new Datepicker(this, options)));
      }

      if (isString(option) && $.isFunction(fn = data[option])) {
        result = fn.apply(data, args);
      }
    });

    return isUndefined(result) ? this : result;
  };

  $.fn.datepicker.Constructor = Datepicker;
  $.fn.datepicker.languages = Datepicker.LANGUAGES;
  $.fn.datepicker.setDefaults = Datepicker.setDefaults;

  // No conflict
  $.fn.datepicker.noConflict = function () {
    $.fn.datepicker = Datepicker.other;
    return this;
  };

});
