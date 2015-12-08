QUnit.test('method.reset', function (assert) {
  var initialValue = '14/02/2014 14:50';
  var $input = window.createInput({
        value: initialValue
      });

  $input.datepicker('show');
  $input.datepicker('setDate', '28/02/2014 14:50');
  $input.datepicker('reset');
  assert.equal($input.datepicker('getDate', true), initialValue);
  $input.datepicker('hide');
});
