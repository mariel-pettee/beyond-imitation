window.formSubmitted = function() {
  var elem = document.querySelector('#form-submitted');
  elem.className += ' displayed';
  setTimeout(function(elem) {
    elem.className = elem.className.replace(' displayed', '');
  }.bind(this, elem), 3000)
}
