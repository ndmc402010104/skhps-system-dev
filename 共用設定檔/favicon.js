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

  var hostname =
    String(window.location.hostname || "").toLowerCase();

  var shouldLoadFooter =
    hostname.indexOf("github.io") >= 0 ||
    hostname === "dev-skhps.jonaminz.com" ||
    hostname === "skhps.jonaminz.com";

  if(
    shouldLoadFooter &&
    !document.querySelector('script[data-skh-environment-footer]')
  ){
    var footerScript =
      document.createElement("script");

    footerScript.src =
      hostname.indexOf("github.io") >= 0
      ? "https://ndmc402010104.github.io/plastic-surgery-department-system/%E5%85%B1%E7%94%A8%E8%A8%AD%E5%AE%9A%E6%AA%94/EnvironmentFooter.js"
      : "/%E5%85%B1%E7%94%A8%E8%A8%AD%E5%AE%9A%E6%AA%94/EnvironmentFooter.js";
    footerScript.src += "?v=" + Date.now();
    footerScript.defer = true;
    footerScript.setAttribute("data-skh-environment-footer", "1");

    document.head.appendChild(footerScript);
  }
})();
