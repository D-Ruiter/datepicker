QUnit.test('method.getDate', function (assert) {
  var $input = window.createInput();
  var initialDate = new Date(2014, 1, 14, 14, 50);
  var initialDateString = '14/02/2014 14:50';

  $input.datepicker({
    date: initialDate
  });

  assert.equal($input.datepicker('getDate').getTime(), initialDate.getTime());
  assert.equal($input.datepicker('getDate', true), initialDateString);
});
