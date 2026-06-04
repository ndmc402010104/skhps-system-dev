(function(){
  if(typeof document === "undefined" || !document.head){
    return;
  }

  var svg =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>" +
    "<defs>" +
    "<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop stop-color='#2563eb'/>" +
    "<stop offset='1' stop-color='#0f766e'/>" +
    "</linearGradient>" +
    "</defs>" +
    "<rect width='64' height='64' rx='16' fill='url(#g)'/>" +
    "<text x='32' y='42' text-anchor='middle' font-family='Arial, sans-serif' font-size='34' font-weight='800' fill='white'>S</text>" +
    "</svg>";

  var href =
    "data:image/svg+xml," +
    encodeURIComponent(svg);

  document
    .querySelectorAll('link[rel~="icon"][data-skh-favicon], link[rel~="shortcut icon"][data-skh-favicon]')
    .forEach(function(node){
      node.remove();
    });

  var icon =
    document.createElement("link");

  icon.rel = "icon";
  icon.type = "image/svg+xml";
  icon.href = href;
  icon.setAttribute("data-skh-favicon", "1");

  document.head.appendChild(icon);
})();
