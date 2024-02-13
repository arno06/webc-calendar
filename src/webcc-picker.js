const WebCPicker = (function(){
    let instances = [];
    let API = {
        instance:function(pElement){
            return instances[pElement.getAttribute("name")]||null;
        },
        setup:function(pElement){
            let div = document.createElement('div');
            div.classList.add('datePicker');
            let parent = pElement.parentNode;
            pElement.parentNode.removeChild(pElement);
            parent.appendChild(div);
            div.appendChild(pElement);
            pElement.value = pElement.value.split(" ")[0];
            let calendar = document.createElement('webc-calendar');
            calendar.style.display = "none";
            calendar.setAttribute("format", pElement.getAttribute("data-format")||"DD-MM-YYYY");
            if(pElement.value){
                pElement.value = calendar.formatDate(new Date(pElement.value));
                calendar.setAttribute("selected-dates", pElement.value);
            }
            pElement.parentNode.style.position = "relative";
            pElement.parentNode.appendChild(calendar);

            pElement.addEventListener('focus', function(){
                if(pElement.value && pElement.value.length){
                    calendar.setAttribute("selected-dates", "");
                    calendar.setAttribute("selected-dates", pElement.value);
                }else{
                    calendar.removeAttribute('selected-dates');
                    calendar.setAttribute('current-date', calendar.formatDate(new Date()));
                }
                calendar.style.display = "block";
                let dateMinSelector = pElement.getAttribute("data-date-min");
                if(dateMinSelector && document.querySelector(dateMinSelector) &&document.querySelector(dateMinSelector).value){
                    calendar.setAttribute("date-min", document.querySelector(dateMinSelector).value);
                }else{
                    calendar.removeAttribute("date-min");
                }
                let dateMaxSelector = pElement.getAttribute("data-date-max");
                if(dateMaxSelector && document.querySelector(dateMaxSelector) &&document.querySelector(dateMaxSelector).value){
                    calendar.setAttribute("date-max", document.querySelector(dateMaxSelector).value);
                }else{
                    calendar.removeAttribute("date-max");
                }
            });

            document.addEventListener('click', function(e){
                if(e.target === pElement || e.target === calendar){
                    return;
                }
                calendar.style.display = "none";
            });

            calendar.addEventListener(WebCCalendar.EVENT_DAY_SELECTED, function(e){
                pElement.setAttribute("value", e.detail.value);
                pElement.value = e.detail.value;
                calendar.style.display = "none";
            });
            instances[pElement.getAttribute("name")] = calendar;
        }
    };

    function init(){
        document.querySelectorAll('input.webcc-picker').forEach(API.setup);
    }

    document.addEventListener('DOMContentLoaded', init);

    return API;
})();