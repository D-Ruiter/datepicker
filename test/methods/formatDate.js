QUnit.test('method.formatDate', function (assert) {
  var $input = window.createInput();

  assert.equal($input.datepicker('formatDate', new Date(2014, 1, 14, 14, 50)), '02/14/2014 14:50');
});
