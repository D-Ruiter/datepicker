QUnit.test('method.setDate', function (assert) {
  var $input = window.createInput();
  var initialDate = new Date(2014, 1, 14, 14, 50);
  var initialDate2 = '02/28/2015 14:50';

  $input.datepicker('setDate', initialDate);
  assert.equal($input.datepicker('getDate').getTime(), initialDate.getTime());

  $input.datepicker('setDate', initialDate2);
  assert.equal($input.datepicker('getDate', true), initialDate2);
});
