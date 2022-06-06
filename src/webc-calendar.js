NodeList.prototype.forEach = NodeList.prototype.forEach||Array.prototype.forEach;
Function.prototype.proxy = Function.prototype.proxy||function(pInstance) {let ref = this;return function(){ref.apply(pInstance, arguments);};};
class WebCCalendar extends HTMLElement
{
    static EVENT_DAY_SELECTED = "day_selected";
    static EVENT_DAY_UNSELECTED = "day_unselected";
    static EVENT_SELECTION_UPDATED = "selection_updated";
    static EVENT_MONTH_CHANGED = "month_changed";
    static EVENT_DATE_CHANGED = "date_changed";

    static Localization = {
    'today':'Aujourd\'hui',
    'days':['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
    'months':['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
};

    static ARROW = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 330 330"><path d="M250.606,154.389l-150-149.996c-5.857-5.858-15.355-5.858-21.213,0.001 c-5.857,5.858-5.857,15.355,0.001,21.213l139.393,139.39L79.393,304.394c-5.857,5.858-5.857,15.355,0.001,21.213 C82.322,328.536,86.161,330,90,330s7.678-1.464,10.607-4.394l149.999-150.004c2.814-2.813,4.394-6.628,4.394-10.606 C255,161.018,253.42,157.202,250.606,154.389z"/></svg>';

    static SEPARATOR = ";";

    // component attributes
    static get observedAttributes() {
        return ['current-date','display', 'class', 'format', 'mode', 'disabled-dates', 'disabled-week-days', 'events', 'colors-scheme', 'date-min', 'date-max', 'selected-dates'];
    }

    constructor(){
        super();
        this.format = 'YYYY-MM-DD';
        this.currentDate = new Date();
        this.disabledDates = [];
        this.disabledWeekDays = [];
        this.display = 'month';
        this.dateMin = null;
        this.dateMax = null;
        this.selectedDates = [];
        this.range = false;//tbd
        this.mode = 'single';
        this.colors = {
            'border':'#eee',
            'disableBackground':'#f4f4f4',
            'disable':'#ccc',
            'todayBackground':'#00aeff',
            'today':'#fff',
            'hoverBackground':'#bceef5',
            'hover':'#000'
        };
        this.events = [];
    }

    attributeChangedCallback(pAttr, pOldValue, pNewValue){
        if(pOldValue===pNewValue){
            return;
        }
        switch(pAttr){
            case 'current-date':
                this.currentDate = this.strToDate(pNewValue);
                break;
            case 'display':
                if(['week', 'month'].indexOf(pNewValue)>-1){
                    this.display = pNewValue;
                }
                break;
            case "class":
                this.renderLabels();
                break;
            case "disabled-week-days":
                this.disabledWeekDays = pNewValue.split(WebCCalendar.SEPARATOR).map(Number);
                if(this.shadow){
                    this.disableWeekDays();
                }
                return;
            case "disabled-dates":
                this.disabledDates = pNewValue.split(WebCCalendar.SEPARATOR);
                break;
            case "events":
                let parsed = pNewValue.split(WebCCalendar.SEPARATOR).map(this.parseEvents);
                this.events = {};
                let ref = this;
                parsed.forEach(function(pInfo){
                    ref.events[pInfo.date] = pInfo.events;
                });
                break;
            case "format":
                this.format = pNewValue;
                break;
            case "colors-scheme":
                let colors = pNewValue.split(WebCCalendar.SEPARATOR);
                for(let c in colors){
                    let p = colors[c].split(':');
                    if(!this.colors.hasOwnProperty(p[0])){
                        continue;
                    }
                    this.colors[p[0]] = p[1];
                }
                break;
            case "date-min":
                this.dateMin = this.strToDate(pNewValue);
                break;
            case "date-max":
                this.dateMax = this.strToDate(pNewValue);
                break;
            case "selected-dates":
                this.selectedDates = pNewValue.split(WebCCalendar.SEPARATOR);
                if(!this.isMultiple() && this.selectedDates.length>1){
                    this.selectedDates = [this.selectedDates[0]];
                }
                let d = this.strToDate(this.selectedDates[0]);
                this.currentDate = d;
                break;
            case "mode":
                if(['single', 'multiple', 'range'].indexOf(pNewValue)>-1){
                    this.mode = pNewValue;
                }
                break;
        }
        this.render();
    }

    connectedCallback(){
        this.shadow = this.attachShadow({mode: 'closed'});
        let tpl = this.getTemplate();
        tpl = tpl.replaceAll('@date.formatted_today', this.formatDate(new Date()));
        tpl = tpl.replaceAll('@local.today', WebCCalendar.Localization.today);
        tpl = tpl.replaceAll('@svg', WebCCalendar.ARROW);
        for(let l in this.colors){
            tpl = tpl.replaceAll('@'+l, this.colors[l]);
        }
        this.shadow.innerHTML = tpl;
        let ref = this;
        this.shadow.querySelectorAll('header>div.picker .main.actions>.button').forEach(function(pButton){
            pButton.addEventListener('click', ref.mainNavHandler.proxy(ref));
        });
        this.shadow.querySelectorAll('header>div.picker .year .button').forEach(function(pButton){
            pButton.addEventListener('click', ref.yearNavHandler.proxy(ref));
        });
        this.shadow.querySelector('header>.button.today').addEventListener('click', this.todayClickedHandler.proxy(this));
        if(this.display === "month"){
            this.shadow.querySelector('.container .days').addEventListener('wheel', this.scrollHandler.proxy(this));
        }
        this.renderLabels();
        this.render();
    }

    renderLabels(){
        if(!this.shadow){
            return;
        }
        let labels = this.shadow.querySelector('.container .labels');
        labels.innerHTML = "";
        let shortLabels = (labels.offsetWidth/7)<60;
        let veryShortLabels = (labels.offsetWidth/7)<38;
        WebCCalendar.Localization.days.forEach(function(pDay){
            let div = document.createElement('div');
            div.classList.add('weekday');
            let l = pDay;
            if(veryShortLabels){
                l = l[0];
            }else if(shortLabels){
                l = l.slice(0, 3)+'.';
            }
            div.innerHTML = l;
            labels.appendChild(div);
        });
        let labelsNumbers = this.shadow.querySelector('.container .labels.numbers');
        if(this.display==="week" && !labelsNumbers){
            let days = document.createElement('div');
            days.classList.add('labels');
            days.classList.add('numbers');
            this.shadow.querySelector('.container').insertBefore(days, this.shadow.querySelector('.container .days'));
        }else if(this.display === "month" && labelsNumbers){
            labelsNumbers.remove();
        }
    }

    parseEvents(pDay){
        let parts = pDay.split(':');
        return {date:parts[0], events:parts[1].split('|')};
    }

    yearNavHandler(pEvent){
        let direction = pEvent.currentTarget.classList.contains('previous')?-1:1;
        this.currentDate.setFullYear(this.currentDate.getFullYear()+direction);
        this.render();
        this.dispatchEvent(new CustomEvent(WebCCalendar.EVENT_MONTH_CHANGED, {composed:true, detail:{currentDate:this.currentDate}}));
    }

    scrollHandler(pEvent){
        pEvent.preventDefault();
        let direction = (pEvent.deltaY>0?1:-1);
        this.handleNav(direction);
        this.render();
    }

    mainNavHandler(pEvent){
        let direction = pEvent.currentTarget.classList.contains('previous')?-1:1;
        this.handleNav(direction);
    }

    handleNav(pDirection){
        switch(this.display){
            case "week":
                this.currentDate.setDate(this.currentDate.getDate() + (pDirection *7));
                break;
            case "month":
                this.currentDate.setMonth(this.currentDate.getMonth() + (pDirection));
                break;
        }
        this.render();
        this.dispatchEvent(new CustomEvent(WebCCalendar.EVENT_MONTH_CHANGED, {composed:true, detail:{currentDate:this.currentDate}}));
        this.dispatchEvent(new CustomEvent(WebCCalendar.EVENT_DATE_CHANGED, {composed:true, detail:{currentDate:this.currentDate, formattedCurrentDate:this.formatDate(this.currentDate)}}));
    }

    todayClickedHandler(e){
        this.currentDate = new Date();
        this.render();
    }

    render(){
        if(!this.shadow){
            return;
        }
        this.shadow.querySelector('.container .days').innerHTML = "";
        switch(this.display){
            case "month":
                this.renderMonth();
                break;
            case "week":
                this.renderWeek();
                break;
        }
        if(this.disabledWeekDays){
            this.disableWeekDays();
        }
    }

    dayOverHandler(e){
        if(this.selectedDates.length!==1){
            return;
        }
        let val = e.currentTarget.getAttribute("data-value");
        if(val === this.selectedDates[0]){
            return;
        }
        let sd = this.strToDate(this.selectedDates[0]);
        let cd = this.strToDate(val);

        this.shadow.querySelectorAll('.days .col .day').forEach(function(pEl){
            if(pEl.classList.contains('in-range')){
                pEl.classList.remove('in-range');
                pEl.classList.remove('first');
                pEl.classList.remove('last');
            }
        });

        let selectedD = this.shadow.querySelector('.day[data-value="'+this.selectedDates[0]+'"]');//tbd : cas du jour sélectionné dans un autre mois
        selectedD.classList.add('in-range');
        let cls;
        if(sd.getTime()>cd.getTime()){
            selectedD.classList.add('last');
            cls = "first";
        }else{
            selectedD.classList.add('first');
            cls = "last";
        }
        e.currentTarget.classList.remove('in-range');
        e.currentTarget.classList.add('in-range');
        e.currentTarget.classList.add(cls);

        let ref = this;
        let fd = this.strToDate(this.shadow.querySelector('.day.first').getAttribute('data-value'));
        let ld = this.strToDate(this.shadow.querySelector('.day.last').getAttribute('data-value'));
        this.shadow.querySelectorAll('.days .col .day').forEach(function(pEl){
            let d = ref.strToDate(pEl.getAttribute('data-value'));
            if(fd.getTime()<d.getTime() && d.getTime()<ld.getTime()){
                pEl.classList.add('in-range');
            }
        });
    }

    dayClickedHandler(e){
        let val = e.currentTarget.getAttribute("data-value");
        let evt = null;
        switch(this.mode){
            case "range":
                if(this.selectedDates.length===2){
                    this.selectedDates = [];
                }
                if(!this.selectedDates.length){
                    this.selectedDates.push(val);
                }else{
                    if(this.strToDate(this.selectedDates[0]).getTime()>this.strToDate(val).getTime()){
                        this.selectedDates.unshift(val);
                    }else{
                        this.selectedDates.push(val);
                    }
                }
                evt = WebCCalendar.EVENT_DAY_SELECTED;
                break;
            default:
                if(this.selectedDates.indexOf(val)>-1){
                    this.selectedDates.splice(this.selectedDates.indexOf(val), 1);
                    evt = WebCCalendar.EVENT_DAY_UNSELECTED;
                }else{
                    if(!this.isMultiple()){
                        this.selectedDates = [];
                    }
                    this.selectedDates.push(val)
                    evt = WebCCalendar.EVENT_DAY_SELECTED;
                }
                break;
        }
        this.render();
        let detail = {
            value:val,
            selectedDates:this.selectedDates,
            mode:this.mode
        };
        this.dispatchEvent(new CustomEvent(evt, {composed:true, detail:detail}));
        this.dispatchEvent(new CustomEvent(WebCCalendar.EVENT_SELECTION_UPDATED, {composed:true, detail:detail}));
    }

    getWeekNumber(pDate){
        let fd = new Date(pDate.getFullYear(),0, 1);
        let day = fd.getDay()-1;
        if(day<0){
            day = 6;
        }
        fd.setDate(fd.getDate() + (7-day));
        let week = 0;
        while(fd.getTime()<=pDate.getTime()){
            fd.setDate(fd.getDate()+7);
            week++;
        }
        return week;
    }

    renderWeek(){
        let infos = this.getCurrentWeek();
        let month = infos.months.map((pMonth)=>WebCCalendar.Localization.months[pMonth]);
        this.shadow.querySelector('header>div.picker .month').innerHTML = month.join(' - ');
        let daysNumber = this.shadow.querySelector('.container .labels.numbers');
        daysNumber.innerHTML = "";
        let days = this.shadow.querySelector('.container .days');
        days.innerHTML = "";
        let hoursLabels = document.createElement('div');
        hoursLabels.classList.add('labels');
        for(let i = 0; i<24; i++){
            let h = document.createElement('div');
            h.innerHTML = (i<10?'0':'')+(i)+':00';
            hoursLabels.appendChild(h);
        }
        days.appendChild(hoursLabels);
        let hours = document.createElement('div');
        hours.classList.add('hours');
        days.appendChild(hours);
        let ref = this;
        infos.dates.forEach(function(pDate){
            let label = document.createElement('div');
            label.classList.add('weekday');
            label.classList.add('day');
            let span = document.createElement('span');
            if(pDate.css.length>0){
                pDate.css.forEach((pCls)=>span.classList.add(pCls));
            }
            span.innerHTML = pDate.label;
            label.appendChild(span);
            daysNumber.appendChild(label);

            let col = document.createElement('div');
            col.classList.add('col');
            for(let i = 0; i<24; i++){
                let h = document.createElement('div');
                h.classList.add('hour');
                col.appendChild(h);
            }
            hours.append(col);
        });
    }

    getCurrentWeek(){
        let d = this.currentDate.getDay();
        d-=1;
        if(d<0){
            d = 6;
        }
        let cd = new Date(this.currentDate.getTime());
        cd.setDate(cd.getDate() - d);
        let dates = [];
        let months = [];
        for(let i = 0; i<7; i++){
            dates.push(this.prepareDate(cd));
            cd.setDate(cd.getDate()+1);
            if(months.indexOf(cd.getMonth())===-1){
                months.push(cd.getMonth());
            }
        }
        return {
            dates:dates,
            week:this.getWeekNumber(this.currentDate),
            months:months
        };
    }

    renderMonth(){
        let ref = this;
        let month = this.getMonth(this.currentDate.getMonth());
        let colWeeks = document.createElement('div');
        colWeeks.classList.add('col');
        colWeeks.classList.add('weeks');
        month.weeks.forEach(function(pWeek){
            let d = document.createElement('div');
            d.classList.add('week');
            d.innerHTML = pWeek;
            colWeeks.appendChild(d);
        });
        this.shadow.querySelector('.container .days').appendChild(colWeeks);
        month.dates.forEach(function(pDays){
            let col = document.createElement('div');
            col.classList.add('col');
            pDays.forEach(function(pDay){
                let d = document.createElement('div');
                if(pDay.title){
                    d.setAttribute("title", pDay.title);
                }
                d.classList.add('day');
                d.setAttribute("data-value", pDay.value);
                if(pDay.css.length>0){
                    pDay.css.forEach((pCls)=>d.classList.add(pCls));
                }
                let s = document.createElement('span');
                s.innerHTML = pDay.label;
                d.appendChild(s);
                d.addEventListener('click', ref.dayClickedHandler.proxy(ref));
                if(ref.isRange()){
                    d.addEventListener('mouseover', ref.dayOverHandler.proxy(ref));
                }

                if(ref.events[pDay.value]){
                    let evts = document.createElement('div');
                    evts.classList.add('events');
                    ref.events[pDay.value].forEach(function(pColor){
                        let ele = document.createElement('div');
                        ele.style.backgroundColor = pColor;
                        evts.appendChild(ele);
                    });
                    d.appendChild(evts);
                }

                col.appendChild(d);
            });
            ref.shadow.querySelector('.container .days').appendChild(col);
        });
    }

    getMonth(pMonth){
        let dates = [[], [], [], [], [], [], []];
        let d = new Date();
        d.setFullYear(this.currentDate.getFullYear(), pMonth, 1);
        let month = d.getMonth();
        let d1 = d.getDay();
        let weeks = [];

        this.currentDate = new Date(d.getTime());
        this.shadow.querySelector('header>div.picker .month').innerHTML = WebCCalendar.Localization.months[this.currentDate.getMonth()];
        this.shadow.querySelector('header>div.picker .year label').innerHTML = this.currentDate.getFullYear().toString();

        let day;
        while(d.getMonth()===month){
            day = d.getDay();
            dates[day].push(this.prepareDate(d));
            if(day===1||weeks.length===0){
                weeks.push(this.getWeekNumber(d));
            }
            d.setDate(d.getDate()+1);
        }
        let sundays = dates.shift();
        dates.push(sundays);

        if(day===0){
            day = 7;
        }

        for(day;day<dates.length;day++){
            dates[day].push({label:'', value:'', css:['disabled']});
        }

        d1--;
        if(d1<0){
            d1 = 6;
        }
        for(let i = 0, max = d1; i<max; i++){
            dates[i].unshift({label:'', value:'', css:['disabled']});
        }
        return {
            weeks:weeks,
            dates:dates
        };
    }

    prepareDate(pDate){
        let formattedToday = this.formatDate(new Date());
        let formattedDate = this.formatDate(pDate);
        let cls = [];
        let title = null;
        if(formattedDate===formattedToday){
            cls.push("today");
            title = WebCCalendar.Localization.today;
        }
        if(this.disabledDates.indexOf(formattedDate)>-1
            || (this.dateMin && pDate.getTime()<this.dateMin.getTime())
            || (this.dateMax && pDate.getTime()>this.dateMax.getTime())){
            cls.push("disabled");
        }
        if(this.selectedDates.indexOf(formattedDate)>-1){
            cls.push("selected");
        }
        if(this.isRange()){
            if(this.selectedDates.indexOf(formattedDate)>-1){
                cls.push("in-range");
                cls.push(this.selectedDates.indexOf(formattedDate)===0?"first":"last");
            }
            if(this.selectedDates.length===2){
                let d1 = this.strToDate(this.selectedDates[0]);
                let d2 = this.strToDate(this.selectedDates[1]);
                if(d1.getTime()<pDate.getTime() && pDate.getTime()<d2.getTime()){
                    cls.push("in-range");
                }
            }
        }
        return {label:pDate.getDate(), value:formattedDate, css:cls, title:title};
    }

    disableWeekDays(){
        let ref = this;
        this.shadow.querySelectorAll('.container .days .col').forEach(function(pCol, pIndex){
            if(ref.disabledWeekDays.indexOf(pIndex)>-1){
                pCol.classList.add('disabled');
            }else{
                pCol.classList.remove('disabled');
            }
        });
    }

    formatDate(pDate){
        let parts = {
            'YYYY':pDate.getUTCFullYear(),
            'MM':pDate.getMonth() + 1,
            'DD':pDate.getDate()
        };
        if(parts.MM<10){
            parts.MM = "0"+parts.MM;
        }
        if(parts.DD<10){
            parts.DD = "0"+parts.DD;
        }

        let val = this.format;
        for(let j in parts){
            val = val.replace(j, parts[j]);
        }
        return val;
    }

    strToDate(pStr){
        let y = pStr.slice(this.format.indexOf('YYYY'), 4);
        let m = pStr.slice(this.format.indexOf('MM'), this.format.indexOf('MM')+2);
        let d = pStr.slice(this.format.indexOf('DD'), this.format.indexOf('DD')+2);
        return new Date(y,m-1,d);
    }

    isMultiple(){
        return this.mode === 'multiple';
    }

    isRange(){
        return this.mode === 'range';
    }

    isSingle(){
        return this.mode === 'single';
    }


    getTemplate(){
        return `<style>
    :host{--disable-color:#f4f4f4;--border-color:#eee;border-radius:5px;position:relative;user-select: none;display:flex;flex-direction: column;width:700px;background:#fff;box-shadow:0 0 3px rgba(0, 0, 0, .25);padding:0.9em;box-sizing: border-box;font-family: sans-serif;}
    :host .webc-calendar{flex:1;display:flex;flex-direction: column;}
    .button{display:flex;cursor: pointer;width:30px;height:30px;border-radius: 50%;justify-content: center;align-items: center;border:solid 1px transparent;}
    .button:hover{background:rgba(32,33,36,0.039);border:solid 1px rgba(32,33,36,0.19);}
    header{display:flex;justify-content: start;align-items: center;flex:0 0 auto;margin-bottom:0.5em;}
    header .button.today{font-size:.8em;width:auto;border-radius:3px;padding-left:10px;padding-right:10px;margin-right:10px;border:solid 1px #afafaf;}
    header>div.picker{display:flex;align-items: center;}
    header>div.picker>div{display:flex;align-items: center;}
    header>div.picker .month{padding:.5em 0;margin-right:5px;}
    header>div.picker .main{margin-right:5px;}
    header>div.picker .main .button{background:url('@svg') no-repeat center center;background-size:16px 16px;}
    header>div.picker .main .button.previous{transform:rotate(180deg);}
    header>div.picker .year{display:flex;align-items: center;}
    header>div.picker .year label{padding:.5em 0;}
    header>div.picker .year .actions{margin-left:4px;}
    header>div.picker .year .previous,
    header>div.picker .year .next{background:url('@svg') no-repeat 3px 3px;background-size:10px 10px;transform:rotate(90deg);display:flex;justify-content:center;align-items:center;width:16px;height:16px;font-size:0.8em;text-align: center;opacity: 0;transition:opacity .3s;padding-left:0;padding-right:0;}
    header>div.picker .year .next{transform:rotate(-90deg);}
    header>div.picker .year:hover .previous,
    header>div.picker .year:hover .next{opacity: 1;}
    .container{flex: 1 1 auto;background:#fff;display:flex;flex-direction: column;}
    .container>div{display:flex;justify-content: space-between;}
    .container>.labels{padding-left:16px;}
    .container>div>div{flex: 1;text-align: center;}
    .container>div>div.weekday{font-size:0.7em;padding:5px 0;}
    .container>.days{border-left:solid 1px @border;flex:1;overflow-y: auto;}
    .container>.days>.col{border-right:solid 1px @border;border-bottom:solid 1px @border;}
    .container>.days>.col.disabled{background: @disableBackground;pointer-events: none;}
    .container>.days>.col.disabled>.day>span{color:#ccc;}
    .container>.days>.col>.day>span{z-index:2;}
    .container>.days>.col>.day{position:relative;border-top:solid 1px @border;height:50px;display:flex;justify-content: center;align-items: center;cursor:pointer;}
    .container>.days>.col>.day.in-range{}
    .container>.days>.col>.day.in-range span{color:#444;}
    .container>.days>.col>.day.in-range::before,
    .container>.days>.col>.day.in-range::after{content:'';display:block;position:absolute;background:@hoverBackground;width:50%;height:20px;z-index:0;}
    .container>.days>.col>.day.in-range::before{left:0;}
    .container>.days>.col>.day.in-range::after{right:0;}
    .container>.days>.col>.day.in-range.first::before{display:none;}
    .container>.days>.col>.day.in-range.last::after{display:none;}
    .container>.labels.numbers>.weekday.day>span,.container>.days>.col>.day>span{font-size:.9em;color:#aaa;display:flex;justify-content: center;align-items: center;width:30px;height:30px;border-radius:50%;transition:all .3s;}
    .container>.labels.numbers>.weekday.day>span.today,.container>.days>.col>.day.today>span{background:@todayBackground;color:@today;}
    .container>.days>.col>.day:hover>span,
    .container>.days>.col>.day.selected>span{background:@hoverBackground;color:@hover;}
    .container>.days>.col>.day.disabled{pointer-events: none;background: @disableBackground;}
    .container>.labels.numbers>.weekday.day{display:flex;justify-content: center;}
    .container>.labels.numbers>.weekday.day>span{font-size:1.2em;color:#333;}
    
    .container>.days>.col>.day>.events{display:flex;position:absolute;bottom:3px;}
    .container>.days>.col>.day>.events>div{width:5px;height:5px;margin-right:3px;border-radius: 50%;}
    .container>.days>.col>.day>.events>div:last-of-type{margin:0;}
    
    .container>.days>.hours{min-height: -webkit-min-content;height:0px;display:flex;}
    .container>.days>.hours>.col{flex:1;}
    .container>.days>.labels>div, .container>.days>.hours>.col>.hour{height:50px;border-bottom: solid 1px @border;border-right:solid 1px @border;}
    .container>.days>.labels{flex:0;height:0px;}
    .container>.days>.labels>div{font-size:0.6em;border-bottom:1px solid transparent;padding:0 3px;}
    .container>.days>.labels>div:last-of-type{border-bottom: solid 1px @border;}
    
    :host(.expanded){width:100%;height:100%;}
    :host(.expanded) .container>.days>.col{flex:1;display:flex;flex-direction: column;}
    :host(.expanded) .container>.days>.col.weeks{flex:0;}
    :host(.expanded) .container>.days>.col>.day{min-height:100px;height:auto;flex:1;align-items: center;justify-content:start;flex-direction: column;}
    :host(.expanded) .container>.days>.col>.day>.events{display:flex;flex-direction: column;width:100%;position: relative;padding:3px;box-sizing:border-box;}
    :host(.expanded) .container>.days>.col>.day>.events>div{height:10px;margin-top:3px;width:100%;border-radius:3px;}
    
    .container>.days>.col.weeks{flex:0;width:20px;background:#eaeaea;color:#444;}
    .container>.days>.col.weeks>.week{position:relative;border-top:solid 1px @border;height:50px;display:flex;justify-content: center;align-items: center;font-size:0.7em;box-sizing: border-box;padding:0 2px;width:16px;cursor:default;}
    :host(.expanded) .container>.days>.col.weeks>.week{min-height:100px;height:auto;flex:1;align-items: center;justify-content:start;flex-direction: column;padding:3px;}

    :host(.shrinked){height:auto;width:265px;padding:.5em;}
    :host(.shrinked) header .button.today{display:none;}
    :host(.shrinked) .container>.days>.col>.day,
    :host(.shrinked) .container>.days>.col.weeks>.week{height:30px;}

    @media screen and (max-width: 700px){
        :host{width:100%;}
        header>div.picker .year .previous,
        header>div.picker .year .next{opacity: 1;}
    }
</style>
<header><div class="button today" title="@date.formatted_today">@local.today</div><div class="picker"><div class="main actions"><span class="previous button"></span><span class="next button"></span></div><div><span class="month"></span> <span class="year"><label></label><span class="actions"><span class="next button"></span><span class="previous button"></span></span></span></div></div></header>
<div class="container">
    <div class="labels"></div>
    <div class="days"></div>
</div>
`;
    }
}

window.customElements.define('webc-calendar', WebCCalendar);