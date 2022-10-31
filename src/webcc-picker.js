const WebCCPicker = (function(){
    function register(pElement){
        let calendar = document.createElement('webc-calendar');
        calendar.setAttribute("selected-dates", pElement.getAttribute("value"));
        calendar.style.width = "350px";
        calendar.style.position = "absolute";
        calendar.style.top = "100%";
        calendar.style.left = "0";
        calendar.style.marginTop = "10px";
        calendar.style.display = "none";
        pElement.parentNode.style.position = "relative";
        pElement.parentNode.appendChild(calendar);

        pElement.addEventListener('focus', function(){
            calendar.setAttribute("selected-dates", "");
            calendar.setAttribute("selected-dates", pElement.getAttribute("value"));
            calendar.style.display = "block";
        });

        document.addEventListener('click', function(e){
            if(e.target === pElement || e.target === calendar){
                return;
            }
            calendar.style.display = "none";
        });

        calendar.addEventListener(WebCCalendar.EVENT_DAY_SELECTED, function(e){
            pElement.setAttribute("value", e.detail.value);
            calendar.style.display = "none";
        });
    }
    function init(){
        document.querySelectorAll('input[data-comp="webc-calendar"]').forEach(register);
    }
    document.addEventListener('DOMContentLoaded', init);
    return {
        'register':register
    };
})();