QUnit.test('method.parseDate', function (assert) {
  var $input = window.createInput();

  assert.equal($input.datepicker('parseDate', '14/02/2014 14:50').getTime(), new Date(2014, 1, 14, 14, 50).getTime());
});
